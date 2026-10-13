import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon } from '@/components';
import type { PlanPackage } from '@/services/purchases';
import { palette, radii, spacing, useTheme } from '@/theme';

/** One selectable plan (radio) with its price, trial and annual savings badge. */
export function PackageOption({
  pkg,
  selected,
  savings,
  onPress,
}: {
  pkg: PlanPackage;
  selected: boolean;
  savings: number | null;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${t(`paywall.plan.${pkg.kind}`)}, ${pkg.priceString}`}
      onPress={onPress}
      testID={`paywall-package-${pkg.kind}`}
      style={[
        styles.pkg,
        {
          borderColor: selected ? colors.primary : 'transparent',
          backgroundColor: colors.surface,
        },
      ]}
    >
      <Icon
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        color={selected ? 'primary' : 'textSubtle'}
        size={22}
      />
      <View style={styles.flex}>
        <View style={styles.pkgTitle}>
          <AppText variant="bodyStrong">{t(`paywall.plan.${pkg.kind}`)}</AppText>
          {savings && savings > 0 ? (
            <View style={[styles.save, { backgroundColor: colors.accent }]}>
              <AppText variant="caption" style={{ color: palette.ink800 }}>
                {t('paywall.save', { percent: savings })}
              </AppText>
            </View>
          ) : null}
        </View>
        {pkg.trialDays ? (
          <AppText variant="caption" color="textMuted">
            {t('paywall.trialBadge', { days: pkg.trialDays })}
          </AppText>
        ) : null}
      </View>
      <View style={styles.price}>
        <AppText variant="bodyStrong">{pkg.priceString}</AppText>
        {pkg.kind === 'annual' && pkg.monthlyEquivalent ? (
          <AppText variant="caption" color="textMuted">
            {t('paywall.perMonth', { price: pkg.monthlyEquivalent })}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pkg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1.5,
  },
  pkgTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  save: { paddingHorizontal: spacing.sm, borderRadius: radii.pill },
  price: { alignItems: 'flex-end' },
});
