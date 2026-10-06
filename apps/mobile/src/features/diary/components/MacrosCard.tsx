import type { DailySummary } from '@plato/shared';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card, MacroBar } from '@/components';
import { spacing, useTheme } from '@/theme';

export function MacrosCard({ summary }: { summary: DailySummary }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Card style={styles.card}>
      <MacroBar
        inline
        label={t('macros.protein')}
        value={summary.consumed.protein_g}
        target={summary.target.protein_g}
        color={colors.protein}
      />
      <MacroBar
        inline
        label={t('macros.carbs')}
        value={summary.consumed.carbs_g}
        target={summary.target.carbs_g}
        color={colors.carbs}
      />
      <MacroBar
        inline
        label={t('macros.fat')}
        value={summary.consumed.fat_g}
        target={summary.target.fat_g}
        color={colors.fat}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, paddingVertical: spacing.md },
});
