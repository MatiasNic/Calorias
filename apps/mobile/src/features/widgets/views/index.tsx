'use no memo';
// ↑ Widgets are plain functions rendered outside React: the React Compiler must not touch them
// (its memo cache is a hook, which makes every widget fail to draw — they stay blank).

import type { WidgetRepresentation } from 'react-native-android-widget';

import type { WidgetSnapshot } from '../snapshot';
import { DARK, LIGHT, type Palette } from './palette';
import { QuickLog } from './QuickLog';
import { Today } from './Today';
import { Usual } from './Usual';
import { Voice } from './Voice';
import { Water } from './Water';

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
        return <Voice p={p} s={s} width={width} height={height} />;
    }
  };
  return { light: draw(LIGHT), dark: draw(DARK) };
}
