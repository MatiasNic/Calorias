import type { useProgress } from '../hooks';

/** Loaded data of `useProgress`. */
export type ProgressData = NonNullable<ReturnType<typeof useProgress>['data']>;
