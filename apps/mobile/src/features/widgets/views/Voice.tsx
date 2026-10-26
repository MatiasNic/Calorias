'use no memo';
// ↑ Widgets are plain functions rendered outside React: the React Compiler must not touch them
// (its memo cache is a hook, which makes every widget fail to draw — they stay blank).

import { FlexWidget, IconWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetSnapshot } from '../snapshot';
import type { Palette } from './palette';
import { BLACK, glyph, ICON_FONT, open } from './primitives';

/** Ink and paper are fixed for this piece (brand handoff 4.2), whatever the phone theme. */
const INK = '#161918';
const PAPER = '#F4F3EE';
/** Raised ink for the secondary button on the ink card (light theme's `primaryPressed`). */
const INK_RAISED = '#2C302E';

/**
 * «¿Qué comiste?»: the widget opens "Escuchando"; at 2×2 a pencil opens the keyboard instead.
 * 2×2 shows the brand piece (ink card, sage mic, the question); squeezed to 1×1 it keeps just
 * the mic.
 */
export function Voice({
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
  const big = width >= 100 && height >= 100;
  const circle = big ? 72 : 46;
  return (
    <FlexWidget
      {...open('listen')}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: INK,
        borderRadius: 28,
        padding: big ? 16 : 8,
        justifyContent: big ? 'space-between' : 'center',
        alignItems: big ? 'flex-start' : 'center',
      }}
    >
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: big ? 'space-between' : 'center',
          alignItems: 'flex-start',
        }}
      >
        <FlexWidget
          {...open('listen')}
          style={{
            width: circle,
            height: circle,
            borderRadius: circle / 2,
            backgroundColor: p.sage,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <IconWidget
            font={ICON_FONT}
            icon={glyph('mic')}
            size={Math.round(circle / 2)}
            style={{ color: INK }}
          />
        </FlexWidget>
        {big ? (
          // Type it instead: the pencil opens "Contá qué comiste" with the keyboard.
          <FlexWidget
            {...open('text-log')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: INK_RAISED,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <IconWidget font={ICON_FONT} icon={glyph('edit')} size={22} style={{ color: PAPER }} />
          </FlexWidget>
        ) : null}
      </FlexWidget>
      {big ? (
        <TextWidget
          text={s.labels.whatAte}
          maxLines={2}
          style={{ fontSize: 19, fontFamily: BLACK, color: PAPER }}
        />
      ) : null}
    </FlexWidget>
  );
}
