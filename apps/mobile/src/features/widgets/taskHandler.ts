import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { todayLocal } from '@/utils/dates';
import { applyWidgetClick } from './actions';
import { readQueue, readSnapshot, snapshotFor, writeQueue, writeSnapshot } from './snapshot';
import { refreshWidgets } from './sync';
import { renderWidget } from './views';

/**
 * Runs in the background (the app may be closed) when a widget is added, resized, refreshed by
 * the system or tapped. Taps like "+250 ml" or "log my usual breakfast" are done right here on the
 * widget's numbers and queued; the app saves them to its database the next time it opens.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  let snapshot = snapshotFor(todayLocal(), readSnapshot());

  if (props.widgetAction === 'WIDGET_CLICK' && props.clickAction) {
    const next = applyWidgetClick(
      snapshot,
      readQueue(),
      props.clickAction,
      props.clickActionData as Record<string, unknown> | undefined,
      new Date(),
    );
    if (next.snapshot !== snapshot) {
      snapshot = next.snapshot;
      writeSnapshot(snapshot);
      writeQueue(next.queue);
      // Other widgets showing the same numbers (e.g. "Hoy") update too.
      await refreshWidgets(snapshot).catch(() => undefined); // the tapped widget redraws below anyway
    }
  }

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
    case 'WIDGET_CLICK':
      props.renderWidget(
        renderWidget(
          props.widgetInfo.widgetName,
          snapshot,
          props.widgetInfo.width,
          props.widgetInfo.height,
        ),
      );
      break;
    default:
      break;
  }
}
