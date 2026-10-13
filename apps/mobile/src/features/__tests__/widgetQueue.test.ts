import { readQueue, writeQueue, type WidgetAction } from '@/features/widgets/snapshot';
import { applyWidgetQueue } from '@/features/widgets/queue';

const mockCalls: string[] = [];
const mockFail = new Set<string>();

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  AppState: { addEventListener: () => ({ remove: () => {} }) },
}));
jest.mock('@/features/widgets/sync', () => ({ refreshWidgetsForToday: async () => undefined }));
jest.mock('@/features/body/hooks', () => ({
  addWater: async (date: string, ml: number) => {
    if (mockFail.has('water')) throw new Error('db');
    mockCalls.push(`water ${date} ${ml}`);
  },
  undoLastWater: async (date: string) => void mockCalls.push(`undo ${date}`),
}));
jest.mock('@/features/diary/hooks', () => ({
  duplicateMeal: async (meal: { id: string }, date: string, type: string) =>
    void mockCalls.push(`meal ${meal.id} ${date} ${type}`),
}));
jest.mock('@/services/db/repository', () => ({
  repos: { meals: { get: async (id: string) => (id === 'gone' ? null : { id }) } },
}));

const base = { date: '2026-10-13', at: '2026-10-13T10:00:00Z' };

beforeEach(() => {
  mockCalls.length = 0;
  mockFail.clear();
  writeQueue([]);
});

describe('applyWidgetQueue', () => {
  it('saves widget taps in order and empties the queue', async () => {
    const queue: WidgetAction[] = [
      { ...base, id: '1', type: 'water', ml: 250 },
      { ...base, id: '2', type: 'usual', recordId: 'm1', mealType: 'breakfast' },
      { ...base, id: '3', type: 'undoWater' },
    ];
    writeQueue(queue);
    await applyWidgetQueue();
    expect(mockCalls).toEqual([
      'water 2026-10-13 250',
      'meal m1 2026-10-13 breakfast',
      'undo 2026-10-13',
    ]);
    expect(readQueue()).toEqual([]);
  });

  it('a failing action does not block the others', async () => {
    mockFail.add('water');
    writeQueue([
      { ...base, id: '1', type: 'water', ml: 250 },
      { ...base, id: '2', type: 'usual', recordId: 'm1', mealType: 'lunch' },
    ]);
    await applyWidgetQueue();
    expect(mockCalls).toEqual(['meal m1 2026-10-13 lunch']);
    expect(readQueue()).toEqual([]);
  });

  it('skips a usual meal that no longer exists', async () => {
    writeQueue([{ ...base, id: '1', type: 'usual', recordId: 'gone', mealType: 'dinner' }]);
    await applyWidgetQueue();
    expect(mockCalls).toEqual([]);
    expect(readQueue()).toEqual([]);
  });
});
