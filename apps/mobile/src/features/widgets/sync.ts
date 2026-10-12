import { Platform } from 'react-native';

import { writeSnapshot, type WidgetSnapshot } from './snapshot';
import { renderWidget, WIDGET_NAMES } from './views';

/** Redraws every Bocado widget on the home screen with these numbers (Android only). */
export async function refreshWidgets(snapshot: WidgetSnapshot) {
  if (Platform.OS !== 'android') return;
  const { requestWidgetUpdate } = await import('react-native-android-widget');
  await Promise.all(
    Object.values(WIDGET_NAMES).map((widgetName) =>
      requestWidgetUpdate({
        widgetName,
        renderWidget: (info) => renderWidget(widgetName, snapshot, info.width, info.height),
      }).catch(() => undefined),
    ),
  );
}

/** Saves today's numbers for the widgets and redraws them. */
export async function updateWidgets(snapshot: WidgetSnapshot) {
  if (Platform.OS !== 'android') return;
  writeSnapshot(snapshot);
  await refreshWidgets(snapshot);
}
