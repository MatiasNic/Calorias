import type { CollectionName } from '@/services/db/types';
import { accountAdapters } from './account';
import { bodyAdapters } from './body';
import { foodsAdapters } from './foods';
import { mealsAdapters } from './meals';
import type { Adapters } from './shared';
import { trainingAdapters } from './training';

export { PULL_PAGE, type Adapter, type PushItem, type RemoteRow } from './shared';

export const adapters: Adapters<CollectionName> = {
  ...accountAdapters,
  ...mealsAdapters,
  ...bodyAdapters,
  ...foodsAdapters,
  ...trainingAdapters,
};

/** Push order matters for FKs and for the server-side profile timezone used by quotas. */
export const SYNC_ORDER: readonly CollectionName[] = [
  'profile',
  'goals',
  'notification_settings',
  'meals',
  'water',
  'weight',
  'measurements',
  'foods_custom',
  'recipes',
  'favorites',
  'achievements',
  'streaks',
  'workouts',
  // supplement_intakes.supplement_id → supplements(id): parents first.
  'supplements',
  'supplement_intakes',
];
