import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card } from '@/components';
import { spacing, useTheme } from '@/theme';
import { formatNumber } from '@/utils/format';

import { Stat, statStyles } from './Stat';
import type { ProgressData } from './types';

/** Average macros, share of kcal per meal type and the most logged foods. */
export function MacrosSummaryCard({ data }: { data: ProgressData }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const totalMealKcal = [...data.byMealType.values()].reduce((a, b) => a + b, 0);
  return (
    <Card style={styles.card}>
      <AppText variant="subheading">{t('progress.macrosAvg')}</AppText>
      <View style={statStyles.stats}>
        <Stat
          label={t('macros.protein')}
          value={`${formatNumber(data.summary.avg.protein_g)} g`}
          color={colors.protein}
        />
        <Stat
          label={t('macros.carbs')}
          value={`${formatNumber(data.summary.avg.carbs_g)} g`}
          color={colors.carbs}
        />
        <Stat
          label={t('macros.fat')}
          value={`${formatNumber(data.summary.avg.fat_g)} g`}
          color={colors.fat}
        />
      </View>
      <AppText variant="subheading">{t('progress.byMealType')}</AppText>
      {[...data.byMealType.entries()].map(([type, kcal]) => (
        <View key={type} style={styles.row}>
          <AppText style={styles.flex}>{t(`mealTypes.${type as 'lunch'}`)}</AppText>
          <AppText variant="bodyStrong" tabular>
            {Math.round((kcal / Math.max(1, totalMealKcal)) * 100)} %
          </AppText>
        </View>
      ))}
      <AppText variant="subheading">{t('progress.topFoods')}</AppText>
      {data.topFoods.map((f) => (
        <View key={f.name} style={styles.row}>
          <AppText style={styles.flex} numberOfLines={1}>
            {f.name}
          </AppText>
          <AppText color="textMuted">×{f.count}</AppText>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
