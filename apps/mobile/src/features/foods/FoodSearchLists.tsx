import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components';
import type { FavoriteRecord } from '@/services/db/types';
import { spacing, useTheme } from '@/theme';
import { FoodResultRow } from './FoodResultRow';
import type { FoodOption } from './search';
import type { FoodSearchTab } from './useFoodSearchScreen';

/** "Favoritos" tab: single foods open the portion editor, saved meals are logged at once. */
export function FavoritesList({
  favorites,
  onPickFood,
  onLogMeal,
}: {
  favorites: FavoriteRecord[];
  onPickFood: (food: FoodOption) => void;
  onLogMeal: (fav: FavoriteRecord) => void;
}) {
  const { t } = useTranslation();
  return (
    <FlashList
      data={favorites}
      keyExtractor={(f) => f.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <EmptyState
          icon="star-outline"
          title={t('foodSearch.noFavorites')}
          message={t('foodSearch.noFavoritesHint')}
        />
      }
      renderItem={({ item }) => {
        const kcal = item.payload.items.reduce((s, i) => s + i.nutrients.kcal, 0);
        const isFood = item.kind === 'food';
        const name = isFood ? (item.payload.items[0]?.display_name ?? item.label) : item.label;
        return (
          <FoodResultRow
            title={name}
            subtitle={
              isFood
                ? t('foodSearch.favoriteFood')
                : t('foodSearch.favoriteMeal', { count: item.payload.items.length })
            }
            kcal={kcal}
            icon={isFood ? 'star' : 'restaurant'}
            onPress={() => {
              const first = item.payload.items[0];
              if (isFood && first) {
                onPickFood({
                  key: `${first.food_source}:${first.food_id}`,
                  id: first.food_id ?? first.display_name,
                  source: first.food_source,
                  name: first.display_name,
                  per100g: first.per100g,
                  servings: [],
                  lastGrams: first.grams,
                });
              } else onLogMeal(item);
            }}
          />
        );
      }}
    />
  );
}

/** Search results, recent foods or the user's own foods, with an empty state for each tab. */
export function FoodOptionsList({
  tab,
  query,
  data,
  loadingRemote,
  onPick,
  onQuickAdd,
}: {
  tab: Exclude<FoodSearchTab, 'favorites'>;
  query: string;
  data: FoodOption[];
  loadingRemote: boolean;
  onPick: (food: FoodOption) => void;
  /** Building a plate: "+" adds the food with its usual portion without leaving the list. */
  onQuickAdd?: (food: FoodOption) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <FlashList
      data={data}
      keyExtractor={(f) => f.key}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        tab === 'search' && loadingRemote ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : null
      }
      ListEmptyComponent={
        tab === 'search' ? (
          query.trim().length < 2 ? (
            <EmptyState
              icon="search"
              title={t('foodSearch.typeToSearch')}
              message={t('foodSearch.typeHint')}
            />
          ) : loadingRemote ? null : (
            <EmptyState
              icon="help-circle"
              title={t('foodSearch.noResults')}
              message={t('foodSearch.noResultsHint')}
              actionLabel={t('diary.customFood')}
              onAction={() => router.push({ pathname: '/custom-food', params: { name: query } })}
            />
          )
        ) : tab === 'recent' ? (
          <EmptyState icon="time" title={t('foodSearch.noRecents')} />
        ) : (
          <EmptyState
            icon="create"
            title={t('foodSearch.noCustom')}
            actionLabel={t('diary.customFood')}
            onAction={() => router.push('/custom-food')}
          />
        )
      }
      renderItem={({ item }) => (
        <FoodResultRow
          title={item.name}
          subtitle={[
            item.brand,
            item.kind ? t(`foodSearch.kind.${item.kind}`) : t(`foodSource.${item.source}`),
            t('foodSearch.per100'),
          ]
            .filter(Boolean)
            .join(' · ')}
          kcal={item.per100g.kcal}
          per100
          tag={item.source === 'regional' ? (item.country ?? 'AR') : undefined}
          icon={
            item.source === 'custom'
              ? 'person'
              : item.source === 'off'
                ? 'barcode_scanner'
                : 'nutrition'
          }
          onPress={() => onPick(item)}
          onQuickAdd={onQuickAdd ? () => onQuickAdd(item) : undefined}
          quickAddLabel={t('plate.quickAdd', { name: item.name })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 96 },
  loader: { margin: spacing.md },
});
