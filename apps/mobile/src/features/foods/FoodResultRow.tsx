import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon, type SymbolName } from '@/components';
import { fontFamily, spacing, useTheme } from '@/theme';
import { formatKcal } from '@/utils/format';

/** One row of the food search lists: tile (icon or country tag), name, kcal and an add button. */
export function FoodResultRow({
  title,
  subtitle,
  kcal,
  per100,
  icon,
  tag,
  onPress,
}: {
  title: string;
  subtitle?: string;
  kcal: number;
  per100?: boolean;
  icon: SymbolName;
  /** Short code shown in the tile instead of the icon (country of a regional dish). */
  tag?: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${Math.round(kcal)} kcal${per100 ? ` ${t('foodSearch.per100')}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.surface : 'transparent',
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={[styles.tile, { backgroundColor: colors.surfaceAlt }]}>
        {tag ? (
          <AppText variant="caption" style={styles.tag}>
            {tag}
          </AppText>
        ) : (
          <Icon name={icon} color="textMuted" size={20} />
        )}
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <AppText style={styles.kcal} tabular>
        {formatKcal(kcal)}
      </AppText>
      <View style={[styles.add, { backgroundColor: colors.surfaceAlt }]}>
        <Icon name="add" size={22} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    minHeight: 64,
  },
  tile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tag: { fontFamily: fontFamily.extrabold, fontSize: 11 },
  kcal: { fontFamily: fontFamily.extrabold, fontSize: 16 },
  add: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
