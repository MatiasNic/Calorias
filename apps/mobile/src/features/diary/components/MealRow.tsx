import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useTranslation } from 'react-i18next';

import { AppText, Icon, toast } from '@/components';
import { deleteMeal, duplicateMeal } from '@/features/diary/hooks';
import type { MealRecord } from '@/services/db/types';
import { usePhotoUri } from '@/services/photos';
import { radii, spacing, useTheme } from '@/theme';
import { formatTime, todayLocal } from '@/utils/dates';
import { formatKcal } from '@/utils/format';
import { haptic } from '@/utils/haptics';

export function MealRow({ meal }: { meal: MealRecord }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const photo = usePhotoUri(meal);
  const names = meal.items.map((i) => i.display_name).join(', ');

  const confirmDelete = () =>
    Alert.alert(t('diary.deleteTitle'), t('diary.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          haptic('warning');
          await deleteMeal(meal.id);
          toast.info(t('diary.deleted'));
        },
      },
    ]);

  const duplicate = async () => {
    await duplicateMeal(meal, todayLocal());
    toast.success(t('diary.duplicated'));
  };

  const actions = () => (
    <View style={styles.actions}>
      <ActionButton
        icon="copy"
        label={t('diary.duplicate')}
        color={colors.primary}
        onPress={duplicate}
      />
      <ActionButton
        icon="trash"
        label={t('common.delete')}
        color={colors.danger}
        onPress={confirmDelete}
      />
    </View>
  );

  return (
    <ReanimatedSwipeable renderRightActions={actions} overshootRight={false} friction={2}>
      <Pressable
        testID={`meal-row-${meal.id}`}
        accessibilityRole="button"
        accessibilityLabel={t('diary.mealA11y', { names, kcal: Math.round(meal.totals.kcal) })}
        accessibilityHint={t('diary.mealHint')}
        accessibilityActions={[
          { name: 'duplicate', label: t('diary.duplicate') },
          { name: 'delete', label: t('common.delete') },
        ]}
        onAccessibilityAction={(e) =>
          e.nativeEvent.actionName === 'delete' ? confirmDelete() : duplicate()
        }
        onPress={() => router.push({ pathname: '/meal/[id]', params: { id: meal.id } })}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: pressed ? colors.surfaceAlt : colors.surface },
        ]}
      >
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={styles.thumb}
            contentFit="cover"
            transition={150}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[styles.thumb, styles.placeholder, { backgroundColor: colors.surfaceAlt }]}>
            <Icon
              name={
                meal.source === 'barcode'
                  ? 'barcode'
                  : meal.source === 'text' || meal.source === 'voice'
                    ? 'chatbox-ellipses'
                    : 'restaurant'
              }
              size={20}
              color="textMuted"
            />
          </View>
        )}
        <View style={styles.text}>
          <AppText variant="body" numberOfLines={2}>
            {names}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {formatTime(meal.eaten_at)} · P {Math.round(meal.totals.protein_g)} · C{' '}
            {Math.round(meal.totals.carbs_g)} · G {Math.round(meal.totals.fat_g)}
          </AppText>
        </View>
        <AppText variant="bodyStrong" tabular>
          {formatKcal(meal.totals.kcal)}
        </AppText>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

function ActionButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: 'copy' | 'trash';
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.action, { backgroundColor: color }]}
    >
      <Icon name={icon} rawColor="#fff" size={20} />
      <AppText variant="caption" style={{ color: '#fff' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 64,
  },
  thumb: { width: 48, height: 48, borderRadius: radii.md },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row' },
  action: { width: 84, alignItems: 'center', justifyContent: 'center', gap: 2 },
});
