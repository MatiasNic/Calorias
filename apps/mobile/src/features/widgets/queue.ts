import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { addWater, undoLastWater } from '@/features/body/hooks';
import { duplicateMeal } from '@/features/diary/hooks';
import { repos } from '@/services/db/repository';
import { readQueue, writeQueue, type WidgetAction } from './snapshot';
import { refreshWidgetsForToday } from './sync';

let running: Promise<void> | null = null;

async function apply(action: WidgetAction) {
  switch (action.type) {
    case 'water':
      await addWater(action.date, action.ml);
      break;
    case 'undoWater':
      await undoLastWater(action.date);
      break;
    case 'usual': {
      const meal = await repos.meals.get(action.recordId);
      if (meal) await duplicateMeal(meal, action.date, action.mealType);
      break;
    }
  }
}

/**
 * Saves what was done from the home-screen widgets (water, usual meals) into the local database;
 * the regular sync then uploads it. Each action is removed from the queue once saved.
 */
export function applyWidgetQueue(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  running ??= (async () => {
    try {
      for (const action of readQueue()) {
        try {
          await apply(action);
        } catch {
          // a broken action must not block the rest
        }
        // Re-read: the widget may have queued (or undone) something meanwhile.
        writeQueue(readQueue().filter((a) => a.id !== action.id));
      }
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Applies widget actions when the app starts and every time it comes back to the foreground. */
export function useWidgetQueue() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void applyWidgetQueue();
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void applyWidgetQueue();
      // A new day may have started since the widgets were last drawn.
      refreshWidgetsForToday().catch(() => undefined); // no widget on the home screen is fine
    });
    return () => sub.remove();
  }, []);
}
