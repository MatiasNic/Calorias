import { ACTIONS, applyWidgetClick } from '@/features/widgets/actions';
import { snapshotFor, type WidgetSnapshot } from '@/features/widgets/snapshot';

jest.mock('@/stores/kv', () => ({ kvStorage: { getItemSync: () => null, setItemSync: () => {} } }));

const now = new Date('2026-10-12T12:00:00');
const base = (): WidgetSnapshot => ({
  ...snapshotFor('2026-10-12', null),
  consumedKcal: 500,
  waterMl: 500,
  usual: [
    {
      recordId: 'm1',
      mealType: 'breakfast',
      mealLabel: 'Desayuno',
      names: 'Tostadas, café',
      kcal: 300,
      protein: 10,
      carbs: 40,
      fat: 8,
    },
  ],
});

describe('applyWidgetClick', () => {
  it('adds water and queues it for the app', () => {
    const r = applyWidgetClick(base(), [], ACTIONS.water, { ml: 500 }, now);
    expect(r.snapshot.waterMl).toBe(1000);
    expect(r.queue).toEqual([
      expect.objectContaining({ type: 'water', ml: 500, date: '2026-10-12' }),
    ]);
  });

  it('undo removes a pending widget glass, or queues an undo of the app’s last one', () => {
    const added = applyWidgetClick(base(), [], ACTIONS.water, { ml: 250 }, now);
    const undone = applyWidgetClick(added.snapshot, added.queue, ACTIONS.undoWater, undefined, now);
    expect(undone.snapshot.waterMl).toBe(500);
    expect(undone.queue).toEqual([]);

    const fromApp = applyWidgetClick(base(), [], ACTIONS.undoWater, undefined, now);
    expect(fromApp.snapshot.waterMl).toBe(250);
    expect(fromApp.queue).toEqual([expect.objectContaining({ type: 'undoWater' })]);
  });

  it('does nothing when there is no water to undo', () => {
    const s = { ...base(), waterMl: 0 };
    expect(applyWidgetClick(s, [], ACTIONS.undoWater, undefined, now).queue).toEqual([]);
  });

  it('logs a usual meal and a second tap undoes it', () => {
    const logged = applyWidgetClick(base(), [], ACTIONS.usual, { recordId: 'm1' }, now);
    expect(logged.snapshot.consumedKcal).toBe(800);
    expect(logged.snapshot.protein.value).toBe(10);
    expect(logged.snapshot.loggedUsual).toEqual(['m1']);
    expect(logged.queue).toEqual([
      expect.objectContaining({ type: 'usual', recordId: 'm1', mealType: 'breakfast' }),
    ]);

    const undone = applyWidgetClick(
      logged.snapshot,
      logged.queue,
      ACTIONS.usual,
      { recordId: 'm1' },
      now,
    );
    expect(undone.snapshot.consumedKcal).toBe(500);
    expect(undone.snapshot.loggedUsual).toEqual([]);
    expect(undone.queue).toEqual([]);
  });

  it('ignores unknown meals and actions', () => {
    const s = base();
    expect(applyWidgetClick(s, [], ACTIONS.usual, { recordId: 'x' }, now).snapshot).toBe(s);
    expect(applyWidgetClick(s, [], 'OPEN_URI', {}, now).snapshot).toBe(s);
  });
});

describe('snapshotFor', () => {
  it('starts a new day empty but keeps the targets', () => {
    const s = { ...base(), targetKcal: 1800, loggedUsual: ['m1'] };
    const next = snapshotFor('2026-10-13', s);
    expect(next).toMatchObject({
      date: '2026-10-13',
      targetKcal: 1800,
      consumedKcal: 0,
      waterMl: 0,
      loggedUsual: [],
    });
    expect(next.usual).toHaveLength(1);
  });
});
