import type { DailySummary } from '@plato/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card, MacroBar } from '@/components';
import { spacing, useTheme } from '@/theme';

export function MacrosCard({ summary }: { summary: DailySummary }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <MacroBar
          label={t('macros.protein')}
          value={summary.consumed.protein_g}
          target={summary.target.protein_g}
          color={colors.protein}
        />
        <MacroBar
          label={t('macros.carbs')}
          value={summary.consumed.carbs_g}
          target={summary.target.carbs_g}
          color={colors.carbs}
        />
        <MacroBar
          label={t('macros.fat')}
          value={summary.consumed.fat_g}
          target={summary.target.fat_g}
          color={colors.fat}
        />
      </View>
      {summary.target.fiber_g ? (
        <MacroBar
          label={t('macros.fiber')}
          value={summary.consumed.fiber_g ?? 0}
          target={summary.target.fiber_g}
          color={colors.fiber}
          compact
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
});
