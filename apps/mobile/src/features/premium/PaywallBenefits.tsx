import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon, type IconName } from '@/components';
import { spacing } from '@/theme';

const BENEFITS: {
  icon: IconName;
  key: 'scans' | 'coach' | 'adaptive' | 'micros' | 'plan' | 'history';
}[] = [
  { icon: 'camera', key: 'scans' },
  { icon: 'chatbubbles', key: 'coach' },
  { icon: 'analytics', key: 'adaptive' },
  { icon: 'nutrition', key: 'micros' },
  { icon: 'calendar', key: 'plan' },
  { icon: 'time', key: 'history' },
];

/** Checklist of what Premium includes. */
export function PaywallBenefits() {
  const { t } = useTranslation();
  return (
    <View style={styles.benefits}>
      {BENEFITS.map((b) => (
        <View key={b.key} style={styles.benefit}>
          <Icon name="checkmark" color="text" size={20} />
          <AppText variant="label" style={styles.flex}>
            {t(`paywall.benefits.${b.key}`)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  benefits: { gap: spacing.sm },
  benefit: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  flex: { flex: 1 },
});
