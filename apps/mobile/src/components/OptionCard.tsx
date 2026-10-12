import { Pressable, StyleSheet, View } from 'react-native';

import { fontFamily, radii, spacing, useTheme } from '@/theme';
import { haptic } from '@/utils/haptics';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface OptionCardProps {
  title: string;
  description?: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
  badge?: string;
  testID?: string;
  multi?: boolean;
}

export function OptionCard({
  title,
  description,
  icon,
  selected,
  onPress,
  badge,
  testID,
  multi,
}: OptionCardProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      accessibilityLabel={[title, description, badge].filter(Boolean).join('. ')}
      onPress={() => {
        haptic('selection');
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: selected ? colors.text : 'transparent',
          backgroundColor: colors.surface,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {icon ? (
        <View style={[styles.icon, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={icon} size={22} color="text" />
        </View>
      ) : null}
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <AppText variant="subheading">{title}</AppText>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: colors.surfaceAlt }]}>
              <AppText variant="caption" color="text" style={styles.badgeText}>
                {badge}
              </AppText>
            </View>
          ) : null}
        </View>
        {description ? (
          <AppText variant="label" color="textMuted" style={styles.description}>
            {description}
          </AppText>
        ) : null}
      </View>
      <View
        style={[
          styles.radio,
          multi && styles.square,
          selected
            ? { backgroundColor: colors.primary, borderColor: colors.primary }
            : { borderColor: colors.textSubtle },
        ]}
      >
        {selected ? <Icon name="check" size={16} color="onPrimary" /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: 22,
    borderWidth: 2,
    minHeight: 72,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  description: { fontFamily: fontFamily.medium },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill },
  badgeText: { fontSize: 11, fontFamily: fontFamily.bold },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  square: { borderRadius: 7 },
});
