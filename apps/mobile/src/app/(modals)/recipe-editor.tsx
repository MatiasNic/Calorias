import { scaleNutrients, suggestMealType, type MealType } from '@plato/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Banner,
  Button,
  Card,
  IconButton,
  ListRow,
  Screen,
  ScreenHeader,
  Stepper,
  TextField,
  toast,
} from '@/components';
import { MealTypePicker } from '@/features/diary/MealTypePicker';
import { checkAchievements } from '@/features/habits/hooks';
import { useRecipeDraftStore } from '@/features/foods/recipeDraft';
import { logRecipe, recipeTotals, saveRecipe } from '@/features/foods/recipes';
import { useAiError } from '@/features/scan/useAiError';
import { analyzeMealText } from '@/services/ai';
import { repos } from '@/services/db/repository';
import { spacing } from '@/theme';
import { todayLocal } from '@/utils/dates';
import { formatKcal } from '@/utils/format';

export default function RecipeEditor() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const draft = useRecipeDraftStore();
  const aiError = useAiError();
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [logServings, setLogServings] = useState(1);
  const [mealType, setMealType] = useState<MealType>(suggestMealType(new Date().getHours()));

  useEffect(() => {
    if (!id) return;
    repos.recipes.get(id).then((r) => {
      if (r)
        useRecipeDraftStore
          .getState()
          .set({ id: r.id, name: r.name, servings: r.servings, items: r.items });
    });
  }, [id]);

  const { totals } = recipeTotals(draft.items);
  const perServing = draft.servings > 0 ? totals.kcal / draft.servings : 0;

  const save = async () => {
    const r = await saveRecipe({
      id: draft.id,
      name: draft.name,
      servings: draft.servings,
      items: draft.items,
    });
    useRecipeDraftStore.getState().set({ id: r.id });
    checkAchievements().catch(() => undefined);
    toast.success(t('recipes.saved'));
  };

  const importFromText = async () => {
    setImporting(true);
    try {
      const res = await analyzeMealText(importText, 'recipe');
      res.items.forEach((i) =>
        draft.addItem({
          display_name: i.display_name,
          food_id: i.food_id,
          food_source: i.food_source,
          grams: i.grams,
          per100g: i.per100g,
        }),
      );
      setShowImport(false);
      setImportText('');
    } catch (e) {
      toast.error(aiError(e));
    } finally {
      setImporting(false);
    }
  };

  const log = async () => {
    const r = await saveRecipe({
      id: draft.id,
      name: draft.name,
      servings: draft.servings,
      items: draft.items,
    });
    await logRecipe(r, logServings, todayLocal(), mealType);
    toast.success(t('recipes.logged'));
    router.back();
  };

  const remove = () =>
    Alert.alert(t('recipes.deleteTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          if (draft.id) await repos.recipes.remove(draft.id);
          draft.reset();
          router.back();
        },
      },
    ]);

  const valid = draft.name.trim().length > 0 && draft.items.length > 0 && draft.servings > 0;

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      keyboard
      footer={<Button label={t('common.save')} onPress={save} disabled={!valid} />}
    >
      <ScreenHeader
        title={t('recipes.title')}
        close
        right={
          draft.id ? (
            <IconButton
              icon="trash"
              color="danger"
              accessibilityLabel={t('common.delete')}
              onPress={remove}
            />
          ) : null
        }
      />
      <TextField
        label={t('recipes.name')}
        value={draft.name}
        onChangeText={(name) => draft.set({ name })}
      />
      <Stepper
        label={t('recipes.servings')}
        value={draft.servings}
        onChange={(servings) => draft.set({ servings })}
        step={1}
        min={1}
        max={50}
      />
      <AppText variant="subheading">{t('recipes.ingredients')}</AppText>
      <Card padded={false}>
        {draft.items.map((i, idx) => (
          <ListRow
            key={`${i.display_name}-${idx}`}
            title={i.display_name}
            subtitle={`${Math.round(i.grams)} g · ${formatKcal(scaleNutrients(i.per100g, i.grams).kcal)} kcal`}
            right={
              <IconButton
                icon="close-circle"
                color="textMuted"
                accessibilityLabel={t('review.removeItem')}
                onPress={() => draft.removeItem(idx)}
              />
            }
          />
        ))}
      </Card>
      <View style={styles.row}>
        <Button
          label={t('recipes.addIngredient')}
          icon="add"
          variant="outline"
          fullWidth={false}
          onPress={() => router.push({ pathname: '/food-search', params: { target: 'recipe' } })}
        />
        <Button
          label={t('recipes.importText')}
          icon="sparkles"
          variant="ghost"
          fullWidth={false}
          onPress={() => setShowImport(!showImport)}
        />
      </View>
      {showImport ? (
        <Card style={styles.card}>
          <TextField
            placeholder={t('recipes.importPlaceholder')}
            value={importText}
            onChangeText={setImportText}
            multiline
            accessibilityLabel={t('recipes.importText')}
          />
          <Button
            label={t('recipes.import')}
            size="md"
            onPress={importFromText}
            loading={importing}
            disabled={importText.trim().length < 3}
          />
        </Card>
      ) : null}
      <Card style={styles.card}>
        <AppText>
          {t('recipes.total')}: {formatKcal(totals.kcal)} kcal
        </AppText>
        <AppText variant="title" tabular>
          {formatKcal(perServing)} kcal{' '}
          <AppText color="textMuted">{t('recipes.perServing')}</AppText>
        </AppText>
      </Card>
      {valid ? (
        <Card style={styles.card}>
          <AppText variant="subheading">{t('recipes.logServing')}</AppText>
          <Stepper
            label={t('recipes.servingsToLog')}
            value={logServings}
            onChange={setLogServings}
            step={0.5}
            min={0.5}
            max={10}
            format={(v) => v.toLocaleString()}
          />
          <MealTypePicker value={mealType} onChange={setMealType} />
          <Button
            label={t('recipes.logServing')}
            icon="checkmark"
            variant="secondary"
            onPress={log}
          />
        </Card>
      ) : (
        <Banner tone="info" message={t('recipes.emptyHint')} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  card: { gap: spacing.md },
});
