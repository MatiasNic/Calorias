'use no memo';
// ↑ Widgets are plain functions rendered outside React: the React Compiler must not touch them
// (its memo cache is a hook, which makes every widget fail to draw — they stay blank).

import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { ACTIONS } from '../actions';
import type { WidgetSnapshot } from '../snapshot';
import type { Palette } from './palette';
import { BOLD, card, fmt, open, Round, Text } from './primitives';

/** 4×2 · Lo de siempre: the meals you repeat, logged with one tap without opening the app. */
export function Usual({
  p,
  s,
  width,
  height,
}: {
  p: Palette;
  s: WidgetSnapshot;
  width: number;
  height: number;
}) {
  const rows = Math.max(1, Math.min(4, Math.floor((height - 44) / 52)));
  const meals = s.usual.slice(0, rows);
  return (
    <FlexWidget style={card(p, { padding: 14, flexGap: 8 })}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        <FlexWidget {...open('today')} style={{ flex: 1 }}>
          <Text text={s.labels.usual} size={14} color={p.ink} bold />
        </FlexWidget>
        <Text
          text={`${fmt(Math.max(0, s.targetKcal - s.consumedKcal))} kcal`}
          size={12}
          color={p.ink2}
        />
      </FlexWidget>
      {meals.length ? (
        meals.map((m) => {
          const done = s.loggedUsual.includes(m.recordId);
          return (
            <FlexWidget
              key={m.recordId}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                width: 'match_parent',
                flexGap: 10,
              }}
            >
              <FlexWidget style={{ flex: 1 }}>
                <Text text={m.names} size={14} color={p.ink} bold />
                <Text text={`${m.mealLabel} · ${fmt(m.kcal)} kcal`} size={11} color={p.ink2} />
              </FlexWidget>
              <Round
                p={p}
                icon={done ? 'check' : 'add'}
                size={40}
                primary={done}
                action={{ clickAction: ACTIONS.usual, clickActionData: { recordId: m.recordId } }}
              />
            </FlexWidget>
          );
        })
      ) : (
        <FlexWidget
          {...open('listen')}
          style={{ width: width - 28, flexDirection: 'row', alignItems: 'center', flexGap: 10 }}
        >
          <Round p={p} icon="mic" size={40} primary action={open('listen')} />
          <Round p={p} icon="edit" size={40} action={open('text-log')} />
          <TextWidget
            text={s.labels.usualEmpty}
            maxLines={3}
            style={{ fontSize: 12, fontFamily: BOLD, color: p.ink2, width: width - 140 }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
