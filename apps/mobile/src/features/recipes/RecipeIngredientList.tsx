import { scaleNutrients } from '@bocado/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card, IconButton, ListRow } from '@/components';
import { PortionEditor } from '@/features/foods/PortionEditor';
import { useRecipeDraftStore } from '@/features/foods/recipeDraft';
import { spacing } from '@/theme';
import { formatKcal } from '@/utils/format';

/** The recipe's ingredients; each one expands into a portion editor or can be removed. */
export function RecipeIngredientList() {
  const { t } = useTranslation();
  const draft = useRecipeDraftStore();
  const [editing, setEditingIdx] = useState<number | null>(null);
  const [editBase, setEditBase] = useState(100);
  const setEditing = (idx: number | null) => {
    if (idx != null) setEditBase(draft.items[idx]?.grams ?? 100);
    setEditingIdx(idx);
  };

  if (!draft.items.length) return null;
  return (
    <Card padded={false}>
      {draft.items.map((i, idx) => (
        <View key={`${i.display_name}-${idx}`}>
          <ListRow
            title={i.display_name}
            subtitle={`${Math.round(i.grams)} g · ${formatKcal(scaleNutrients(i.per100g, i.grams).kcal)} kcal`}
            chevron={false}
            right={
              <View style={styles.itemActions}>
                <IconButton
                  testID={`recipe-item-${idx}`}
                  icon={editing === idx ? 'chevron-up' : 'create-outline'}
                  color="textMuted"
                  size={20}
                  accessibilityLabel={t('portionEditor.editIngredient', {
                    name: i.display_name,
                  })}
                  onPress={() => setEditing(editing === idx ? null : idx)}
                />
                <IconButton
                  icon="close-circle-outline"
                  color="textMuted"
                  size={20}
                  accessibilityLabel={t('review.removeItem')}
                  onPress={() => {
                    setEditing(null);
                    draft.removeItem(idx);
                  }}
                />
              </View>
            }
          />
          {editing === idx ? (
            <View style={styles.editor}>
              <PortionEditor
                label={t('foodDetail.portion')}
                grams={i.grams}
                baseGrams={editBase}
                onChange={(grams) => draft.updateItem(idx, { grams })}
              />
            </View>
          ) : null}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  itemActions: { flexDirection: 'row' },
  editor: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
