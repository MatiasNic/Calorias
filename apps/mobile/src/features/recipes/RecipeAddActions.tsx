import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Card, TextField, toast } from '@/components';
import { useRecipeDraftStore } from '@/features/foods/recipeDraft';
import { useAiError } from '@/features/scan/useAiError';
import { analyzeMealText } from '@/services/ai';
import { spacing } from '@/theme';

/** "Add ingredient" (food search) and "import from text" (AI) for the recipe draft. */
export function RecipeAddActions() {
  const { t } = useTranslation();
  const addItem = useRecipeDraftStore((s) => s.addItem);
  const aiError = useAiError();
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const importFromText = async () => {
    setImporting(true);
    try {
      const res = await analyzeMealText(importText, 'recipe');
      res.items.forEach((i) =>
        addItem({
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

  return (
    <>
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
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  card: { gap: spacing.md },
});
