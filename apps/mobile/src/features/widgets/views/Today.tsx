'use no memo';
// ↑ Widgets are plain functions rendered outside React: the React Compiler must not touch them
// (its memo cache is a hook, which makes every widget fail to draw — they stay blank).

import { FlexWidget, IconWidget, TextWidget, type HexColor } from 'react-native-android-widget';

import { ACTIONS } from '../actions';
import type { WidgetSnapshot } from '../snapshot';
import type { Palette } from './palette';
import { Bar, BLACK, BOLD, card, fmt, glyph, ICON_FONT, open, Round, Text } from './primitives';

function Macro({
  p,
  label,
  value,
  target,
  color,
}: {
  p: Palette;
  label: string;
  value: number;
  target: number;
  color: HexColor;
}) {
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 4 }}>
      <FlexWidget style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      <Text text={`${label} ${fmt(value)}/${fmt(target)}`} size={11} color={p.ink2} />
    </FlexWidget>
  );
}

/** 4×2 · Hoy: calories left, macros and quick actions (water works without opening the app). */
export function Today({
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
  // Short launchers (≈110 dp tall) drop the macros line so the buttons always fit.
  const showMacros = height >= 165;
  const left = s.targetKcal - s.consumedKcal;
  const l = s.labels;
  const inner = Math.max(40, width - 32);
  return (
    <FlexWidget style={card(p, { padding: 16, flexGap: 8 })}>
      <FlexWidget {...open('today')} style={{ width: 'match_parent', flexGap: 4 }}>
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            flexGap: 6,
            width: 'match_parent',
          }}
        >
          <FlexWidget style={{ flex: 1 }}>
            <Text text={left >= 0 ? l.left : l.over} size={12} color={p.ink2} />
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', flexGap: 4 }}>
              <TextWidget
                text={fmt(Math.abs(left))}
                style={{ fontSize: 32, fontFamily: BLACK, color: p.ink }}
              />
              <TextWidget
                text="kcal"
                style={{ fontSize: 13, fontFamily: BOLD, color: p.ink2, marginBottom: 5 }}
              />
            </FlexWidget>
          </FlexWidget>
          <FlexWidget style={{ alignItems: 'flex-end' }}>
            <Text text={`${fmt(s.consumedKcal)} ${l.consumed}`} size={11} color={p.ink2} />
            <Text text={`${l.goal} ${fmt(s.targetKcal)}`} size={11} color={p.ink2} />
          </FlexWidget>
        </FlexWidget>
        <Bar
          p={p}
          width={inner}
          ratio={s.targetKcal ? s.consumedKcal / s.targetKcal : 0}
          color={p.sage}
        />
        {showMacros ? (
          <FlexWidget style={{ flexDirection: 'row', flexGap: 12 }}>
            <Macro p={p} label="P" value={s.protein.value} target={s.protein.target} color={p.p} />
            <Macro p={p} label="C" value={s.carbs.value} target={s.carbs.target} color={p.c} />
            <Macro p={p} label="G" value={s.fat.value} target={s.fat.target} color={p.f} />
          </FlexWidget>
        ) : null}
      </FlexWidget>
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Round p={p} icon="mic" size={44} primary action={open('listen')} />
        <Round p={p} icon="photo_camera" size={44} action={open('scan')} />
        <Round p={p} icon="keyboard" size={44} action={open('text-log')} />
        <FlexWidget
          clickAction={ACTIONS.water}
          clickActionData={{ ml: 250 }}
          style={{
            height: 44,
            paddingHorizontal: 12,
            borderRadius: 22,
            backgroundColor: p.s2,
            flexDirection: 'row',
            alignItems: 'center',
            flexGap: 4,
          }}
        >
          <IconWidget
            font={ICON_FONT}
            icon={glyph('water_drop')}
            size={18}
            style={{ color: p.water }}
          />
          <Text text={`${fmt(s.waterMl)} +250`} size={12} color={p.ink} bold />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
