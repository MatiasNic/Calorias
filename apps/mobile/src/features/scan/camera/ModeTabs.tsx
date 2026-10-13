import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components';
import { overlay, palette, radii, spacing } from '@/theme';
import { haptic } from '@/utils/haptics';

import { SCAN_MODES, type ScanMode } from './types';

/** Photo / barcode / label / text switcher. */
export function ModeTabs({
  mode,
  onChange,
}: {
  mode: ScanMode;
  onChange: (mode: ScanMode) => void;
}) {
  const { t } = useTranslation();
  return (
    <View
      style={[styles.modes, { backgroundColor: palette.cameraField }]}
      accessibilityRole="tablist"
    >
      {SCAN_MODES.map((m) => (
        <Pressable
          key={m}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === m }}
          accessibilityLabel={t(`scan.modes.${m}`)}
          onPress={() => {
            haptic('selection');
            onChange(m);
          }}
          style={[styles.mode, mode === m && { backgroundColor: overlay.active }]}
          testID={`scan-mode-${m}`}
        >
          <AppText
            variant="label"
            style={{ color: mode === m ? palette.bgDark : overlay.textMuted }}
          >
            {t(`scan.modes.${m}`)}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  modes: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderRadius: radii.pill,
    padding: 4,
  },
  mode: {
    paddingHorizontal: spacing.md + 2,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
});
