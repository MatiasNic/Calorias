import type { MealItem, MealType } from '@bocado/shared';
import { StyleSheet, View } from 'react-native';

import { DraftItemCard } from '@/features/diary/DraftItemCard';
import { MealTypePicker } from '@/features/diary/MealTypePicker';
import { TimeStepper } from '@/features/diary/TimeStepper';
import { GroupHeader } from '@/features/scan/ReviewParts';
import { radii, spacing, useTheme } from '@/theme';

/** One meal of the draft: header (tap to edit meal type and time) and its item cards. */
export function MealGroupSection({
  mealType,
  items,
  time,
  editing,
  original,
  onToggleEditing,
  onChangeMealType,
  onChangeTime,
}: {
  mealType: MealType;
  items: { item: MealItem; index: number }[];
  time: { h: number; m: number };
  editing: boolean;
  /** Original AI items, to show how much each portion was changed. */
  original: MealItem[] | null;
  onToggleEditing: () => void;
  onChangeMealType: (to: MealType) => void;
  onChangeTime: (time: { h: number; m: number }) => void;
}) {
  const { colors } = useTheme();
  const kcal = items.reduce((s, x) => s + x.item.nutrients.kcal, 0);
  return (
    <View style={styles.group}>
      <GroupHeader
        mealType={mealType}
        time={time}
        kcal={kcal}
        editing={editing}
        onPress={onToggleEditing}
      />
      {editing ? (
        <View style={[styles.editor, { backgroundColor: colors.surface }]}>
          <MealTypePicker value={mealType} onChange={onChangeMealType} />
          <TimeStepper value={time} onChange={onChangeTime} />
        </View>
      ) : null}
      {items.map(({ item, index }) => (
        <DraftItemCard
          key={item.id ?? index}
          item={item}
          index={index}
          baseGrams={original?.find((o) => o.id === item.id)?.grams}
          showConfidence
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  editor: { gap: spacing.md, padding: spacing.md, borderRadius: radii.xl },
});
