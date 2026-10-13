import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components';
import { CorrectionBar } from '@/features/scan/CorrectionBar';
import { spacing, useTheme } from '@/theme';
import { formatKcal } from '@/utils/format';

/** Fixed footer: correct by voice/text and save, always reachable. */
export function ReviewFooter({
  onCorrect,
  correcting,
  correctionError,
  mealCount,
  totalKcal,
  canSave,
  saving,
  onSave,
}: {
  onCorrect: (text: string, source: 'text' | 'voice') => Promise<boolean>;
  correcting: boolean;
  correctionError: string | null;
  mealCount: number;
  totalKcal: number;
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient
        colors={[`${colors.background}00`, colors.background]}
        locations={[0, 0.28]}
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
      >
        <CorrectionBar onSubmit={onCorrect} busy={correcting} error={correctionError} />
        <Button
          label={
            mealCount > 1
              ? t('review.saveManyKcal', { count: mealCount, kcal: formatKcal(totalKcal) })
              : t('review.saveKcal', { kcal: formatKcal(totalKcal) })
          }
          icon="check"
          onPress={onSave}
          loading={saving}
          disabled={!canSave || correcting}
          testID="review-save"
        />
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 28,
    paddingHorizontal: spacing.lg,
    gap: 10,
  },
});
