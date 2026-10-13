'use no memo';
// ↑ Widgets are plain functions rendered outside React: the React Compiler must not touch them
// (its memo cache is a hook, which makes every widget fail to draw — they stay blank).

import { FlexWidget } from 'react-native-android-widget';

import type { WidgetSnapshot } from '../snapshot';
import type { Palette } from './palette';
import { card, open, Round, Text } from './primitives';

/** 1×1 · Hablar: opens "Escuchando" with one tap. */
export function Voice({ p, s }: { p: Palette; s: WidgetSnapshot }) {
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
