import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Banner,
  Button,
  Card,
  IconButton,
  Screen,
  ScreenHeader,
  Stepper,
  TextField,
} from '@/components';
import { MealTypePicker } from '@/features/diary/MealTypePicker';
import { RecipeAddActions } from '@/features/recipes/RecipeAddActions';
import { RecipeIngredientList } from '@/features/recipes/RecipeIngredientList';
import { useRecipeEditor } from '@/features/recipes/useRecipeEditor';
import { spacing } from '@/theme';
import { formatKcal } from '@/utils/format';

export default function RecipeEditor() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editor = useRecipeEditor(id);
  const { draft, valid } = editor;

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      keyboard
      footer={<Button label={t('common.save')} onPress={editor.save} disabled={!valid} />}
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
              onPress={editor.remove}
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
      <RecipeIngredientList />
      <RecipeAddActions />
      <Card style={styles.card}>
        <AppText>
          {t('recipes.total')}: {formatKcal(editor.totals.kcal)} kcal
        </AppText>
        <AppText variant="title" tabular>
          {formatKcal(editor.perServing)} kcal{' '}
          <AppText color="textMuted">{t('recipes.perServing')}</AppText>
        </AppText>
      </Card>
      {valid ? (
        <Card style={styles.card}>
          <AppText variant="subheading">{t('recipes.logServing')}</AppText>
          <Stepper
            label={t('recipes.servingsToLog')}
            value={editor.logServings}
            onChange={editor.setLogServings}
            step={0.5}
            min={0.5}
            max={10}
            format={(v) => v.toLocaleString()}
          />
          <MealTypePicker value={editor.mealType} onChange={editor.setMealType} />
          <Button
            label={t('recipes.logServing')}
            icon="checkmark"
            variant="secondary"
            onPress={editor.log}
          />
        </Card>
      ) : (
        <Banner tone="info" message={t('recipes.emptyHint')} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
});
