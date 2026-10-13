'use no memo';
// ↑ Widgets are plain functions rendered outside React: the React Compiler must not touch them
// (its memo cache is a hook, which makes every widget fail to draw — they stay blank).

import { FlexWidget, IconWidget } from 'react-native-android-widget';

import { ACTIONS } from '../actions';
import type { WidgetSnapshot } from '../snapshot';
import type { Palette } from './palette';
import {
  Bar,
  card,
  fmt,
  glyph,
  ICON_FONT,
  open,
  Pill,
  Round,
  Text,
  type Action,
} from './primitives';

/** Water: compact (1×1) adds a glass per tap; wide (2×1+) shows progress, +250, +500 and undo. */
export function Water({
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
  const add250: Action = { clickAction: ACTIONS.water, clickActionData: { ml: 250 } };
  const add500: Action = { clickAction: ACTIONS.water, clickActionData: { ml: 500 } };
  const ratio = s.waterTargetMl ? s.waterMl / s.waterTargetMl : 0;
  if (width < 140) {
    return (
      <FlexWidget
        {...add250}
        style={card(p, { justifyContent: 'center', alignItems: 'center', flexGap: 1 })}
      >
        <IconWidget
          font={ICON_FONT}
          icon={glyph('water_drop')}
          size={24}
          style={{ color: p.water }}
        />
        <Text text={fmt(s.waterMl)} size={16} color={p.ink} bold />
        <Text text="+250 ml" size={10} color={p.ink2} />
      </FlexWidget>
    );
  }
  if (height < 100) {
    // One launcher row (2×1, 3×1…): numbers on the left, buttons on the right.
    const big = width >= 250;
    const info = width - 24 - 12 - 40 - 8 - 64 - (big ? 72 : 0);
    return (
      <FlexWidget
        style={card(p, {
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          flexGap: 8,
        })}
      >
        <FlexWidget {...open('today')} style={{ flex: 1, flexGap: 5 }}>
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 4 }}>
            <IconWidget
              font={ICON_FONT}
              icon={glyph('water_drop')}
              size={16}
              style={{ color: p.water }}
            />
            <Text text={`${fmt(s.waterMl)} ml`} size={14} color={p.ink} bold />
          </FlexWidget>
          {info >= 40 ? <Bar p={p} width={info} ratio={ratio} color={p.water} /> : null}
        </FlexWidget>
        <Round p={p} icon="undo" size={40} action={{ clickAction: ACTIONS.undoWater }} />
        <Pill p={p} label="+250" primary action={add250} />
        {big ? <Pill p={p} label="+500" action={add500} /> : null}
      </FlexWidget>
    );
  }
  const inner = width - 28;
  return (
    <FlexWidget style={card(p, { padding: 14, justifyContent: 'center', flexGap: 8 })}>
      <FlexWidget
        style={{ flexDirection: 'row', alignItems: 'center', flexGap: 6, width: 'match_parent' }}
      >
        <IconWidget
          font={ICON_FONT}
          icon={glyph('water_drop')}
          size={20}
          style={{ color: p.water }}
        />
        <Text
          text={`${fmt(s.waterMl)} / ${fmt(s.waterTargetMl)} ml`}
          size={14}
          color={p.ink}
          bold
        />
      </FlexWidget>
      <Bar p={p} width={inner} ratio={ratio} color={p.water} />
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
        <Round p={p} icon="undo" size={40} action={{ clickAction: ACTIONS.undoWater }} />
        <Pill p={p} label="+250" primary action={add250} />
        {width >= 200 ? <Pill p={p} label="+500" action={add500} /> : null}
      </FlexWidget>
    </FlexWidget>
  );
}
