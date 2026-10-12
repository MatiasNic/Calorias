'use no memo';
// ↑ Widgets are plain functions rendered outside React: the React Compiler must not touch them
// (its memo cache is a hook, which makes every widget fail to draw — they stay blank).

import {
  FlexWidget,
  IconWidget,
  TextWidget,
  type ColorProp,
  type HexColor,
  type WidgetRepresentation,
} from 'react-native-android-widget';

import glyphMap from '@/components/materialSymbols.json';
import { ACTIONS } from './actions';
import type { WidgetSnapshot } from './snapshot';

/**
 * Home-screen widgets (Android), in the app's design: ink for the main action, sage only for
 * calories. Taps marked "background" work with the app closed (water, "Lo de siempre"); the rest
 * open the app right where it's needed (talking needs the microphone, which only the app can use).
 */
export const WIDGET_NAMES = {
  voice: 'BocadoVoice',
  water: 'BocadoWater',
  quick: 'BocadoQuickLog',
  usual: 'BocadoUsual',
  today: 'BocadoToday',
} as const;
export type WidgetName = (typeof WIDGET_NAMES)[keyof typeof WIDGET_NAMES];

const ICON_FONT = 'MaterialSymbolsRounded';
const BOLD = 'Manrope_700Bold';
const BLACK = 'Manrope_800ExtraBold';

interface Palette {
  bg: HexColor;
  s2: HexColor;
  ink: HexColor;
  ink2: HexColor;
  inv: HexColor;
  sage: HexColor;
  water: HexColor;
  p: HexColor;
  c: HexColor;
  f: HexColor;
}

const DARK: Palette = {
  bg: '#1B1E1D',
  s2: '#272B29',
  ink: '#ECEEE9',
  ink2: '#A9AFAB',
  inv: '#111312',
  sage: '#AFCBB3',
  water: '#95AACD',
  p: '#E6927F',
  c: '#E5C070',
  f: '#95AACD',
};
const LIGHT: Palette = {
  bg: '#FFFFFF',
  s2: '#EAE9E3',
  ink: '#161918',
  ink2: '#565D59',
  inv: '#FFFFFF',
  sage: '#9CC0A3',
  water: '#5A76A6',
  p: '#C5604D',
  c: '#B3831C',
  f: '#5A76A6',
};

type Action = { clickAction: string; clickActionData?: Record<string, unknown> };
type Glyph = keyof typeof glyphMap;

const glyph = (name: Glyph) => String.fromCodePoint(glyphMap[name]);
const open = (path: string): Action => ({
  clickAction: 'OPEN_URI',
  clickActionData: { uri: `bocado://${path}` },
});
/** Thousands with a dot, as in Argentina (Intl may be missing in the background task). */
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function Round({
  p,
  icon,
  size,
  primary,
  action,
  label,
}: {
  p: Palette;
  icon?: Glyph;
  size: number;
  primary?: boolean;
  action: Action;
  label?: string;
}) {
  return (
    <FlexWidget
      {...action}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: primary ? p.ink : p.s2,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {icon ? (
        <IconWidget
          font={ICON_FONT}
          icon={glyph(icon)}
          size={Math.round(size * 0.48)}
          style={{ color: primary ? p.inv : p.ink }}
        />
      ) : (
        <TextWidget
          text={label ?? ''}
          style={{ fontSize: 13, fontFamily: BLACK, color: primary ? p.inv : p.ink }}
        />
      )}
    </FlexWidget>
  );
}

function Pill({
  p,
  label,
  action,
  primary,
}: {
  p: Palette;
  label: string;
  action: Action;
  primary?: boolean;
}) {
  return (
    <FlexWidget
      {...action}
      style={{
        height: 40,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: primary ? p.ink : p.s2,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <TextWidget
        text={label}
        style={{ fontSize: 14, fontFamily: BLACK, color: primary ? p.inv : p.ink }}
      />
    </FlexWidget>
  );
}

function Bar({
  p,
  width,
  ratio,
  color,
}: {
  p: Palette;
  width: number;
  ratio: number;
  color: HexColor;
}) {
  const w = Math.max(0, Math.min(1, ratio));
  return (
    <FlexWidget
      style={{ width, height: 8, borderRadius: 4, backgroundColor: p.s2, flexDirection: 'row' }}
    >
      {w > 0 ? (
        <FlexWidget
          style={{
            width: Math.max(8, Math.round(width * w)),
            height: 8,
            borderRadius: 4,
            backgroundColor: color,
          }}
        />
      ) : null}
    </FlexWidget>
  );
}

const card = (p: Palette, extra: object = {}) => ({
  height: 'match_parent' as const,
  width: 'match_parent' as const,
  backgroundColor: p.bg as ColorProp,
  borderRadius: 24,
  ...extra,
});

const Text = ({
  text,
  size,
  color,
  bold,
}: {
  text: string;
  size: number;
  color: HexColor;
  bold?: boolean;
}) => (
  <TextWidget
    text={text}
    maxLines={1}
    truncate="END"
    style={{ fontSize: size, fontFamily: bold ? BLACK : BOLD, color }}
  />
);

/** 1×1 · Hablar: opens "Escuchando" with one tap. */
function Voice({ p, s }: { p: Palette; s: WidgetSnapshot }) {
  return (
    <FlexWidget
      {...open('listen')}
      style={card(p, { justifyContent: 'center', alignItems: 'center', flexGap: 4 })}
    >
      <Round p={p} icon="mic" size={46} primary action={open('listen')} />
      <Text text={s.labels.talk} size={11} color={p.ink2} />
    </FlexWidget>
  );
}

/** Water: compact (1×1) adds a glass per tap; wide (2×1+) shows progress, +250, +500 and undo. */
function Water({
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

/** 2×1 · Registrar: talk, photo or type. */
function QuickLog({ p }: { p: Palette }) {
  return (
    <FlexWidget
      style={card(p, {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 8,
      })}
    >
      <Round p={p} icon="mic" size={48} primary action={open('listen')} />
      <Round p={p} icon="photo_camera" size={44} action={open('scan')} />
      <Round p={p} icon="keyboard" size={44} action={open('text-log')} />
    </FlexWidget>
  );
}

/** 4×2 · Lo de siempre: the meals you repeat, logged with one tap without opening the app. */
function Usual({
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
          <TextWidget
            text={s.labels.usualEmpty}
            maxLines={3}
            style={{ fontSize: 12, fontFamily: BOLD, color: p.ink2, width: width - 90 }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

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
function Today({
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

/** The widget for `name`, in light and dark versions (the launcher follows the phone theme). */
export function renderWidget(
  name: string,
  s: WidgetSnapshot,
  width: number,
  height = 110,
): WidgetRepresentation {
  const draw = (p: Palette) => {
    switch (name) {
      case WIDGET_NAMES.water:
        return <Water p={p} s={s} width={width} height={height} />;
      case WIDGET_NAMES.quick:
        return <QuickLog p={p} />;
      case WIDGET_NAMES.usual:
        return <Usual p={p} s={s} width={width} height={height} />;
      case WIDGET_NAMES.today:
        return <Today p={p} s={s} width={width} height={height} />;
      default:
        return <Voice p={p} s={s} />;
    }
  };
  return { light: draw(LIGHT), dark: draw(DARK) };
}
