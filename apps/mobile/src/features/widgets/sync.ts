import { Platform } from 'react-native';

import { todayLocal } from '@/utils/dates';
import { readSnapshot, snapshotFor, writeSnapshot, type WidgetSnapshot } from './snapshot';
import { renderWidget, WIDGET_NAMES } from './views';

/**
 * Redraws every Bocado widget on the home screen with these numbers (Android only). Numbers from
 * a past day are shown as an empty day: yesterday's water must not appear as today's.
 */
export async function refreshWidgets(stored: WidgetSnapshot) {
  if (Platform.OS !== 'android') return;
  const snapshot = snapshotFor(todayLocal(), stored);
  const { requestWidgetUpdate } = await import('react-native-android-widget');
  await Promise.all(
    Object.values(WIDGET_NAMES).map(
      (widgetName) =>
        requestWidgetUpdate({
          widgetName,
          renderWidget: (info) => renderWidget(widgetName, snapshot, info.width, info.height),
        }).catch(() => undefined), // that widget isn't on the home screen
    ),
  );
}

/** Saves today's numbers for the widgets and redraws them. */
export async function updateWidgets(snapshot: WidgetSnapshot) {
  if (Platform.OS !== 'android') return;
  writeSnapshot(snapshot);
  await refreshWidgets(snapshot);
}

/** Redraws the widgets from what is saved (e.g. when the app comes back after midnight). */
export async function refreshWidgetsForToday() {
  const stored = readSnapshot();
  if (stored) await refreshWidgets(stored);
}
