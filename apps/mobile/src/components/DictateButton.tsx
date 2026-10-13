import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { features } from '@/config/features';
import { useDictation } from '@/features/scan/useDictation';
import { radii, useTheme } from '@/theme';
import { haptic } from '@/utils/haptics';
import { Icon } from './Icon';

/**
 * One-tap dictation for any text field: what you say is added after what's already written.
 * Hidden where speech recognition isn't available.
 */
export function DictateButton({
  value,
  onChangeText,
  size = 40,
  testID,
}: {
  value: string;
  onChangeText: (text: string) => void;
  size?: number;
  testID?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const dictation = useDictation(() => valueRef.current, onChangeText);
  if (!features.voiceLogging || !dictation.available) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dictation.listening ? t('dictate.stop') : t('dictate.start')}
      accessibilityState={{ selected: dictation.listening }}
      hitSlop={4}
      testID={testID}
      onPress={() => {
        haptic('selection');
        if (dictation.listening) dictation.stop();
        else void dictation.start();
      }}
      style={[
        styles.btn,
        {
          width: size,
          height: size,
          backgroundColor: dictation.listening ? colors.primary : colors.surfaceAlt,
        },
      ]}
    >
      <Icon
        name={dictation.listening ? 'stop_circle' : 'mic'}
        size={Math.round(size * 0.5)}
        color={dictation.listening ? 'onPrimary' : 'text'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
});
