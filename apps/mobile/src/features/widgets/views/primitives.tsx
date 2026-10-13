'use no memo';
// ↑ Widgets are plain functions rendered outside React: the React Compiler must not touch them
// (its memo cache is a hook, which makes every widget fail to draw — they stay blank).

import {
  FlexWidget,
  IconWidget,
  TextWidget,
  type ColorProp,
  type HexColor,
} from 'react-native-android-widget';

import glyphMap from '@/components/materialSymbols.json';
import type { Palette } from './palette';

export const ICON_FONT = 'MaterialSymbolsRounded';
export const BOLD = 'Manrope_700Bold';
export const BLACK = 'Manrope_800ExtraBold';

export type Action = { clickAction: string; clickActionData?: Record<string, unknown> };
export type Glyph = keyof typeof glyphMap;

export const glyph = (name: Glyph) => String.fromCodePoint(glyphMap[name]);
export const open = (path: string): Action => ({
  clickAction: 'OPEN_URI',
  clickActionData: { uri: `bocado://${path}` },
});
/** Thousands with a dot, as in Argentina (Intl may be missing in the background task). */
export const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function Round({
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

export function Pill({
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

export function Bar({
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

export const card = (p: Palette, extra: object = {}) => ({
  height: 'match_parent' as const,
  width: 'match_parent' as const,
  backgroundColor: p.bg as ColorProp,
  borderRadius: 24,
  ...extra,
});

export const Text = ({
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
