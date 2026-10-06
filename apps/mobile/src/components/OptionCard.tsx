import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing, useTheme } from '@/theme';
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
          borderColor: selected ? colors.primary : 'transparent',
          backgroundColor: colors.surface,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {icon ? (
        <View
          style={[styles.icon, { backgroundColor: selected ? colors.primary : colors.surfaceAlt }]}
        >
          <Icon name={icon} size={22} color={selected ? 'onPrimary' : 'text'} />
        </View>
      ) : null}
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <AppText variant="bodyStrong">{title}</AppText>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
              <AppText variant="caption" color="text">
                {badge}
              </AppText>
            </View>
          ) : null}
        </View>
        {description ? (
          <AppText variant="caption" color="textMuted">
            {description}
          </AppText>
        ) : null}
      </View>
      <Icon
        name={
          selected
            ? multi
              ? 'checkbox'
              : 'checkmark-circle'
            : multi
              ? 'square-outline'
              : 'ellipse-outline'
        }
        size={24}
        color={selected ? 'primary' : 'border'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    minHeight: 64,
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
  badge: { paddingHorizontal: spacing.sm, borderRadius: radii.pill },
});
