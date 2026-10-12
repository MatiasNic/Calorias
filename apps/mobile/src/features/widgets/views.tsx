import {
  FlexWidget,
  IconWidget,
  TextWidget,
  type ColorProp,
  type HexColor,
  type WidgetRepresentation,
} from 'react-native-android-widget';

import glyphMap from '@/components/materialSymbols.json';
import type { WidgetSnapshot } from './snapshot';

/**
 * Home-screen widgets (Android). They follow the app design: ink for the main action, sage only
 * for calories, rounded cards. Each one is drawn twice (light / dark) and the launcher picks.
 */
export const WIDGET_NAMES = {
  voice: 'BocadoVoice',
  water: 'BocadoWater',
  quick: 'BocadoQuickLog',
  today: 'BocadoToday',
} as const;
export type WidgetName = (typeof WIDGET_NAMES)[keyof typeof WIDGET_NAMES];

export const WATER_ACTION = 'ADD_WATER';
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
}

const DARK: Palette = {
  bg: '#1B1E1D',
  s2: '#272B29',
  ink: '#ECEEE9',
  ink2: '#A9AFAB',
  inv: '#111312',
  sage: '#AFCBB3',
  water: '#95AACD',
};
const LIGHT: Palette = {
  bg: '#FFFFFF',
  s2: '#EAE9E3',
  ink: '#161918',
  ink2: '#565D59',
  inv: '#FFFFFF',
  sage: '#9CC0A3',
  water: '#5A76A6',
};

const glyph = (name: keyof typeof glyphMap) => String.fromCodePoint(glyphMap[name]);
const open = (path: string) => ({
  clickAction: 'OPEN_URI',
  clickActionData: { uri: `bocado://${path}` },
});
const fmt = (n: number) => Math.round(n).toLocaleString('es-AR');

function Round({
  p,
  icon,
  size,
  primary,
  action,
}: {
  p: Palette;
  icon: keyof typeof glyphMap;
  size: number;
  primary?: boolean;
  action: { clickAction: string; clickActionData?: Record<string, unknown> };
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
      <IconWidget
        font={ICON_FONT}
        icon={glyph(icon)}
        size={Math.round(size * 0.46)}
        style={{ color: primary ? p.inv : p.ink }}
      />
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

/** 1×1: one tap opens "Escuchando". */
function Voice({ p }: { p: Palette }) {
  return (
    <FlexWidget
      {...open('listen')}
      style={card(p, { justifyContent: 'center', alignItems: 'center' })}
    >
      <Round p={p} icon="mic" size={52} primary action={open('listen')} />
    </FlexWidget>
  );
}

/** 1×1: adds a glass of water without opening the app and shows today's total. */
function Water({ p, s }: { p: Palette; s: WidgetSnapshot }) {
  return (
    <FlexWidget
      clickAction={WATER_ACTION}
      style={card(p, { justifyContent: 'center', alignItems: 'center', flexGap: 2 })}
    >
      <IconWidget
        font={ICON_FONT}
        icon={glyph('water_drop')}
        size={26}
        style={{ color: p.water }}
      />
      <TextWidget text="+250" style={{ fontSize: 15, fontFamily: BLACK, color: p.ink }} />
      <TextWidget
        text={`${fmt(s.waterMl)} ml`}
        style={{ fontSize: 11, fontFamily: BOLD, color: p.ink2 }}
      />
    </FlexWidget>
  );
}

/** 2×1: talk, photo or type. */
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

function Button({
  p,
  icon,
  label,
  primary,
  action,
}: {
  p: Palette;
  icon: keyof typeof glyphMap;
  label: string;
  primary?: boolean;
  action: { clickAction: string; clickActionData?: Record<string, unknown> };
}) {
  return (
    <FlexWidget {...action} style={{ flex: 1, alignItems: 'center', flexGap: 4 }}>
      <Round p={p} icon={icon} size={44} primary={primary} action={action} />
      <TextWidget text={label} style={{ fontSize: 11, fontFamily: BOLD, color: p.ink2 }} />
    </FlexWidget>
  );
}

/** 4×2: calories left today, a sage bar and quick buttons (talk, photo, type, water). */
function Today({ p, s, width }: { p: Palette; s: WidgetSnapshot; width: number }) {
  const left = s.targetKcal - s.consumedKcal;
  const ratio = s.targetKcal > 0 ? Math.min(1, Math.max(0, s.consumedKcal / s.targetKcal)) : 0;
  const barWidth = Math.max(40, width - 32);
  const l = s.labels;
  return (
    <FlexWidget style={card(p, { padding: 16, flexGap: 10 })}>
      <FlexWidget {...open('today')} style={{ width: 'match_parent', flexGap: 4 }}>
        <TextWidget
          text={left >= 0 ? l.left : l.over}
          style={{ fontSize: 12, fontFamily: BOLD, color: p.ink2 }}
        />
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', flexGap: 6 }}>
          <TextWidget
            text={fmt(Math.abs(left))}
            style={{ fontSize: 34, fontFamily: BLACK, color: p.ink, letterSpacing: -0.04 }}
          />
          <TextWidget
            text="kcal"
            style={{ fontSize: 14, fontFamily: BOLD, color: p.ink2, marginBottom: 5 }}
          />
        </FlexWidget>
        <FlexWidget
          style={{
            width: barWidth,
            height: 8,
            borderRadius: 4,
            backgroundColor: p.s2,
            flexDirection: 'row',
          }}
        >
          <FlexWidget
            style={{
              width: Math.round(barWidth * ratio),
              height: 8,
              borderRadius: 4,
              backgroundColor: p.sage,
            }}
          />
        </FlexWidget>
        <TextWidget
          text={`${fmt(s.consumedKcal)} ${l.consumed} · ${l.goal} ${fmt(s.targetKcal)}`}
          style={{ fontSize: 11, fontFamily: BOLD, color: p.ink2 }}
        />
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row' }}>
        <Button p={p} icon="mic" label={l.talk} primary action={open('listen')} />
        <Button p={p} icon="photo_camera" label={l.photo} action={open('scan')} />
        <Button p={p} icon="keyboard" label={l.write} action={open('text-log')} />
        <Button
          p={p}
          icon="water_drop"
          label={`${l.water} ${fmt(s.waterMl)}`}
          action={{ clickAction: WATER_ACTION }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

/** The widget for `name`, in light and dark versions. */
export function renderWidget(name: string, s: WidgetSnapshot, width: number): WidgetRepresentation {
  const draw = (p: Palette) => {
    switch (name) {
      case WIDGET_NAMES.water:
        return <Water p={p} s={s} />;
      case WIDGET_NAMES.quick:
        return <QuickLog p={p} />;
      case WIDGET_NAMES.today:
        return <Today p={p} s={s} width={width} />;
      default:
        return <Voice p={p} />;
    }
  };
  return { light: draw(LIGHT), dark: draw(DARK) };
}
