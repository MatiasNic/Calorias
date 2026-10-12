import { WATER_QUICK_ADD_ML } from '@plato/shared';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { addWater } from '@/features/body/hooks';
import { useSessionStore } from '@/stores/session';
import { todayLocal } from '@/utils/dates';
import { readSnapshot, snapshotFor, writeSnapshot } from './snapshot';
import { refreshWidgets } from './sync';
import { renderWidget, WATER_ACTION } from './views';

/**
 * Runs in the background (the app may be closed) when a widget is added, resized, refreshed by
 * the system or tapped. "Agua" is logged right here; everything else opens the app via deep link.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const today = todayLocal();
  let snapshot = snapshotFor(today, readSnapshot());

  if (props.widgetAction === 'WIDGET_CLICK' && props.clickAction === WATER_ACTION) {
    // The background task has no session: write the water under the account the app last used.
    if (snapshot.userId && !useSessionStore.getState().userId)
      useSessionStore.setState({ userId: snapshot.userId });
    try {
      await addWater(today);
      snapshot = { ...snapshot, waterMl: snapshot.waterMl + WATER_QUICK_ADD_ML };
      writeSnapshot(snapshot);
      // Other widgets showing water (e.g. "Hoy") update too.
      await refreshWidgets(snapshot);
    } catch {
      // keep showing the previous numbers
    }
  }

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
    case 'WIDGET_CLICK':
      props.renderWidget(
        renderWidget(props.widgetInfo.widgetName, snapshot, props.widgetInfo.width),
      );
      break;
    default:
      break;
  }
}
