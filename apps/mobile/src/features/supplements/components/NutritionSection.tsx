import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, TextField } from '@/components';
import { spacing } from '@/theme';
import type { SupplementForm } from '../useSupplementForm';
import { SwitchRow } from './SwitchRow';

/** Optional calories/macros per dose and whether they count toward the day's macros. */
export function NutritionSection({ form }: { form: SupplementForm }) {
  const { t } = useTranslation();
  return (
    <Card style={styles.group}>
      <SwitchRow
        label={t('supplements.nutrition')}
        value={form.hasNutrition}
        onChange={form.setHasNutrition}
        hint={t('supplements.nutritionHint')}
      />
      {form.hasNutrition ? (
        <>
          <AppText variant="label" color="textMuted">
            {`${t('supplements.perDose')} (${form.amount || '1'} ${t(
              `supplements.units.${form.unit}`,
              { count: form.dose ?? 1 },
            )})`}
          </AppText>
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField
                label="kcal"
                testID="supplement-kcal"
                value={form.kcal}
                onChangeText={form.setKcal}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label={t('macros.protein')}
                testID="supplement-protein"
                value={form.protein}
                onChangeText={form.setProtein}
                keyboardType="decimal-pad"
                suffix="g"
                maxLength={5}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField
                label={t('macros.carbs')}
                value={form.carbs}
                onChangeText={form.setCarbs}
                keyboardType="decimal-pad"
                suffix="g"
                maxLength={5}
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label={t('macros.fat')}
                value={form.fat}
                onChangeText={form.setFat}
                keyboardType="decimal-pad"
                suffix="g"
                maxLength={5}
              />
            </View>
          </View>
          <SwitchRow
            label={t('supplements.countInMacros')}
            value={form.countInMacros}
            onChange={form.setCountInMacros}
          />
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  group: { gap: spacing.sm },
});
