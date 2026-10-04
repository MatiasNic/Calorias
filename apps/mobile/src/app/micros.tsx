import { addDays, MICRO_REFERENCE, sumMicros } from '@plato/shared';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, Card, MacroBar, Screen, ScreenHeader } from '@/components';
import { PremiumGate } from '@/features/premium/PremiumGate';
import { useProfile } from '@/features/profile/hooks';
import { repos } from '@/services/db/repository';
import { spacing, useTheme } from '@/theme';
import { todayLocal } from '@/utils/dates';

const LABELS: Record<string, { es: string; en: string; pt: string }> = {
  calcium_mg: { es: 'Calcio', en: 'Calcium', pt: 'Cálcio' },
  iron_mg: { es: 'Hierro', en: 'Iron', pt: 'Ferro' },
  magnesium_mg: { es: 'Magnesio', en: 'Magnesium', pt: 'Magnésio' },
  potassium_mg: { es: 'Potasio', en: 'Potassium', pt: 'Potássio' },
  zinc_mg: { es: 'Zinc', en: 'Zinc', pt: 'Zinco' },
  vitamin_a_ug: { es: 'Vitamina A', en: 'Vitamin A', pt: 'Vitamina A' },
  vitamin_c_mg: { es: 'Vitamina C', en: 'Vitamin C', pt: 'Vitamina C' },
  vitamin_d_ug: { es: 'Vitamina D', en: 'Vitamin D', pt: 'Vitamina D' },
  vitamin_b12_ug: { es: 'Vitamina B12', en: 'Vitamin B12', pt: 'Vitamina B12' },
  folate_ug: { es: 'Folato', en: 'Folate', pt: 'Folato' },
};

/** 7-day micronutrient averages vs reference intakes. Coverage depends on foods with micro data. */
export default function Micros() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const profile = useProfile();
  const lang = i18n.language.slice(0, 2) as 'es' | 'en' | 'pt';
  const q = useQuery({
    queryKey: ['db', 'meals', 'micros'],
    queryFn: async () => {
      const today = todayLocal();
      const meals = await repos.meals.list({ from: addDays(today, -6), to: today });
      const days = new Set(meals.map((m) => m.local_date)).size || 1;
      const total = sumMicros(meals.flatMap((m) => m.items.map((i) => i.micros)));
      return {
        avg: Object.fromEntries(Object.entries(total).map(([k, v]) => [k, v / days])),
        covered: meals.some((m) => m.items.some((i) => i.micros && Object.keys(i.micros).length)),
      };
    },
  });
  const sex = profile.data?.sex ?? 'female';
  const deficits = Object.entries(MICRO_REFERENCE).filter(
    ([k, ref]) => (q.data?.avg[k] ?? 0) < ref[sex] * 0.5,
  );

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader title={t('micros.title')} />
      <AppText color="textMuted">{t('micros.subtitle')}</AppText>
      <PremiumGate title={t('micros.title')}>
        {!q.data?.covered ? <Banner tone="info" message={t('micros.unavailable')} /> : null}
        <Card style={styles.card}>
          {Object.entries(MICRO_REFERENCE).map(([k, ref]) => (
            <View key={k}>
              <MacroBar
                label={LABELS[k]?.[lang] ?? k}
                value={q.data?.avg[k] ?? 0}
                target={ref[sex]}
                color={colors.fiber}
                unit={ref.unit}
                compact
              />
            </View>
          ))}
        </Card>
        {q.data?.covered
          ? deficits
              .slice(0, 3)
              .map(([k, ref]) => (
                <Banner
                  key={k}
                  tone="warning"
                  message={t('micros.deficit', { name: LABELS[k]?.[lang] ?? k, foods: ref.foods })}
                />
              ))
          : null}
      </PremiumGate>
      <Banner tone="info" message={t('common.disclaimer')} />
    </Screen>
  );
}

const styles = StyleSheet.create({ card: { gap: spacing.md } });
