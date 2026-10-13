'use no memo';
// ↑ Widgets are plain functions rendered outside React: the React Compiler must not touch them
// (its memo cache is a hook, which makes every widget fail to draw — they stay blank).

import { FlexWidget } from 'react-native-android-widget';

import type { Palette } from './palette';
import { card, open, Round } from './primitives';

/** 2×1 · Registrar: talk, photo or type. */
export function QuickLog({ p }: { p: Palette }) {
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
