/* eslint-disable @typescript-eslint/no-require-imports */
import type * as HealthKit from '@kingstinct/react-native-healthkit';
import { Platform } from 'react-native';
import type * as HealthConnect from 'react-native-health-connect';

import { features } from '@/config/features';

/**
 * Health Connect (Android) / HealthKit (iOS). Behind the `healthSync` feature flag and premium.
 * Reads weight, steps and active calories; writes weight. Health data is only used to show the
 * user's own progress and adjust targets — never for advertising (see docs/PRIVACY.md).
 * Native modules are required lazily so the app keeps working where they are unavailable.
 */

type HC = typeof HealthConnect;
type HK = typeof HealthKit;

const hc = (): HC | null => {
  if (Platform.OS !== 'android') return null;
  try {
    return require('react-native-health-connect') as HC;
  } catch {
    return null;
  }
};
const hk = (): HK | null => {
  if (Platform.OS !== 'ios') return null;
  try {
    return require('@kingstinct/react-native-healthkit') as HK;
  } catch {
    return null;
  }
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export function isHealthSupported(): boolean {
  return features.healthSync && (Platform.OS === 'android' || Platform.OS === 'ios');
}

export async function requestHealthPermissions(): Promise<boolean> {
  if (!isHealthSupported()) return false;
  try {
    const android = hc();
    if (android) {
      if (!(await android.initialize())) return false;
      const granted = await android.requestPermission([
        { accessType: 'read', recordType: 'Weight' },
        { accessType: 'write', recordType: 'Weight' },
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
      ]);
      return granted.length > 0;
    }
    const ios = hk();
    if (ios) {
      return await ios.requestAuthorization({
        toRead: [
          'HKQuantityTypeIdentifierBodyMass',
          'HKQuantityTypeIdentifierStepCount',
          'HKQuantityTypeIdentifierActiveEnergyBurned',
        ],
        toShare: ['HKQuantityTypeIdentifierBodyMass'],
      });
    }
  } catch {
    return false;
  }
  return false;
}

export interface TodayActivity {
  steps: number;
  activeKcal: number;
}

export async function readTodayActivity(): Promise<TodayActivity | null> {
  if (!isHealthSupported()) return null;
  const range = {
    operator: 'between' as const,
    startTime: startOfToday().toISOString(),
    endTime: new Date().toISOString(),
  };
  try {
    const android = hc();
    if (android) {
      await android.initialize();
      const steps = await android.aggregateRecord({ recordType: 'Steps', timeRangeFilter: range });
      const kcal = await android.aggregateRecord({
        recordType: 'ActiveCaloriesBurned',
        timeRangeFilter: range,
      });
      return {
        steps: (steps as { COUNT_TOTAL?: number }).COUNT_TOTAL ?? 0,
        activeKcal: Math.round(
          (kcal as { ACTIVE_CALORIES_TOTAL?: { inKilocalories: number } }).ACTIVE_CALORIES_TOTAL
            ?.inKilocalories ?? 0,
        ),
      };
    }
    const ios = hk();
    if (ios) {
      const filter = { date: { startDate: startOfToday(), endDate: new Date() } };
      const steps = await ios.queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierStepCount',
        ['cumulativeSum'],
        { filter } as never,
      );
      const kcal = await ios.queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        ['cumulativeSum'],
        { filter, unit: 'kcal' } as never,
      );
      return {
        steps: Math.round(
          (steps as { sumQuantity?: { quantity: number } }).sumQuantity?.quantity ?? 0,
        ),
        activeKcal: Math.round(
          (kcal as { sumQuantity?: { quantity: number } }).sumQuantity?.quantity ?? 0,
        ),
      };
    }
  } catch {
    return null;
  }
  return null;
}

export async function readLatestWeightKg(): Promise<{ kg: number; date: Date } | null> {
  if (!isHealthSupported()) return null;
  try {
    const android = hc();
    if (android) {
      await android.initialize();
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const res = await android.readRecords('Weight', {
        timeRangeFilter: { operator: 'after', startTime: since },
        ascendingOrder: false,
        pageSize: 1,
      });
      const r = res.records[0] as { weight: { inKilograms: number }; time: string } | undefined;
      return r ? { kg: r.weight.inKilograms, date: new Date(r.time) } : null;
    }
    const ios = hk();
    if (ios) {
      const samples = await ios.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
        limit: 1,
        ascending: false,
        unit: 'kg',
      } as never);
      const s = samples[0] as { quantity: number; startDate: Date } | undefined;
      return s ? { kg: s.quantity, date: new Date(s.startDate) } : null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function writeWeightKg(kg: number): Promise<void> {
  if (!isHealthSupported()) return;
  try {
    const android = hc();
    if (android) {
      await android.initialize();
      await android.insertRecords([
        {
          recordType: 'Weight',
          weight: { unit: 'kilograms', value: kg },
          time: new Date().toISOString(),
        } as never,
      ]);
      return;
    }
    const ios = hk();
    if (ios)
      await ios.saveQuantitySample(
        'HKQuantityTypeIdentifierBodyMass',
        'kg',
        kg,
        new Date(),
        new Date(),
      );
  } catch {
    // best effort
  }
}
