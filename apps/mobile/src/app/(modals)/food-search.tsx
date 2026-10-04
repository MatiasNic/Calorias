import { suggestMealType, type IsoDate, type MealType } from '@plato/shared';
import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  EmptyState,
  Icon,
  IconButton,
  SegmentedControl,
  TextField,
  toast,
} from '@/components';
import { saveMeal } from '@/features/diary/hooks';
import { useDraftStore } from '@/features/diary/draftStore';
import { checkAchievements } from '@/features/habits/hooks';
import {
  useCustomFoods,
  useFavorites,
  useFoodSearch,
  useRecentFoods,
} from '@/features/foods/hooks';
import { usePickerStore, type PickTarget } from '@/features/foods/pickerStore';
import type { FoodOption } from '@/features/foods/search';
import type { FavoriteRecord } from '@/services/db/types';
import { spacing, useTheme } from '@/theme';
import { todayLocal } from '@/utils/dates';
import { formatKcal } from '@/utils/format';

type Tab = 'search' | 'recent' | 'favorites' | 'mine';

export default function FoodSearch() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    mealType?: MealType;
    date?: IsoDate;
    tab?: Tab;
    target?: 'draft' | 'recipe';
    replace?: string;
  }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'search');
  const [query, setQuery] = useState('');
  const picker = usePickerStore();
  const search = useFoodSearch(query);
  const recents = useRecentFoods();
  const favorites = useFavorites();
  const custom = useCustomFoods();

  const date = params.date ?? todayLocal();
  const mealType = params.mealType ?? suggestMealType(new Date().getHours());

  useEffect(() => {
    const target: PickTarget =
      params.target === 'draft'
        ? { kind: 'draft' }
        : params.target === 'recipe'
          ? { kind: 'recipe' }
          : { kind: 'diary', date, mealType };
    picker.open(target, params.replace != null ? Number(params.replace) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (food: FoodOption) => {
    usePickerStore.getState().select(food);
    router.push('/food-detail');
  };

  const logFavoriteMeal = async (fav: FavoriteRecord) => {
    if (params.target === 'draft') {
      fav.payload.items.forEach((i) => useDraftStore.getState().addItem(i));
      router.back();
      return;
    }
    await saveMeal({ date, mealType, source: 'favorite', items: fav.payload.items });
    checkAchievements().catch(() => undefined);
    toast.success(t('foodSearch.loggedFavorite'));
    router.back();
  };

  const customOptions: FoodOption[] = (custom.data ?? []).map((f) => ({
    key: `custom:${f.id}`,
    id: f.id,
    source: 'custom',
    name: f.name,
    brand: f.brand,
    barcode: f.barcode,
    per100g: f.per100g,
    servings: f.servings,
  }));

  const data: FoodOption[] =
    tab === 'search'
      ? search.results
      : tab === 'recent'
        ? (recents.data ?? [])
        : tab === 'mine'
          ? customOptions
          : [];

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <IconButton
          icon="close"
          accessibilityLabel={t('common.close')}
          onPress={() => router.back()}
        />
        <AppText variant="heading" style={styles.flex}>
          {params.target
            ? t('foodSearch.addFood')
            : t('foodSearch.titleFor', { meal: t(`mealTypes.${mealType}`) })}
        </AppText>
        <IconButton
          icon="barcode"
          accessibilityLabel={t('quick.barcode')}
          color="primary"
          onPress={() => router.push({ pathname: '/scan', params: { mode: 'barcode' } })}
        />
      </View>
      <View style={styles.controls}>
        <TextField
          placeholder={t('foodSearch.placeholder')}
          value={query}
          onChangeText={(v) => {
            setQuery(v);
            if (tab !== 'search') setTab('search');
          }}
          autoFocus={tab === 'search'}
          returnKeyType="search"
          accessibilityLabel={t('common.search')}
          testID="food-search-input"
        />
        <SegmentedControl<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'search', label: t('foodSearch.tabs.search') },
            { value: 'recent', label: t('foodSearch.tabs.recent') },
            { value: 'favorites', label: t('foodSearch.tabs.favorites') },
            { value: 'mine', label: t('foodSearch.tabs.mine') },
          ]}
        />
      </View>
      {tab === 'favorites' ? (
        <FlashList
          data={favorites.data ?? []}
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
              <ResultRow
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
                    pick({
                      key: `${first.food_source}:${first.food_id}`,
                      id: first.food_id ?? first.display_name,
                      source: first.food_source,
                      name: first.display_name,
                      per100g: first.per100g,
                      servings: [],
                      lastGrams: first.grams,
                    });
                  } else logFavoriteMeal(item);
                }}
              />
            );
          }}
        />
      ) : (
        <FlashList
          data={data}
          keyExtractor={(f) => f.key}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            tab === 'search' && search.loadingRemote ? (
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
              ) : search.loadingRemote ? null : (
                <EmptyState
                  icon="help-circle"
                  title={t('foodSearch.noResults')}
                  message={t('foodSearch.noResultsHint')}
                  actionLabel={t('diary.customFood')}
                  onAction={() =>
                    router.push({ pathname: '/custom-food', params: { name: query } })
                  }
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
            <ResultRow
              title={item.name}
              subtitle={[item.brand, t(`foodSource.${item.source}`)].filter(Boolean).join(' · ')}
              kcal={item.per100g.kcal}
              per100
              icon={
                item.source === 'regional'
                  ? 'flag'
                  : item.source === 'custom'
                    ? 'person'
                    : item.source === 'off'
                      ? 'barcode'
                      : 'nutrition'
              }
              onPress={() => pick(item)}
            />
          )}
        />
      )}
      {tab === 'search' && search.remoteError ? (
        <AppText variant="caption" color="textMuted" align="center" style={styles.note}>
          {t('foodSearch.remoteUnavailable')}
        </AppText>
      ) : null}
    </SafeAreaView>
  );
}

function ResultRow({
  title,
  subtitle,
  kcal,
  per100,
  icon,
  onPress,
}: {
  title: string;
  subtitle?: string;
  kcal: number;
  per100?: boolean;
  icon: 'flag' | 'person' | 'barcode' | 'nutrition' | 'star' | 'restaurant';
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
          backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Icon name={icon} color="textMuted" size={18} />
      <View style={styles.flex}>
        <AppText numberOfLines={2}>{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={styles.kcal}>
        <AppText variant="bodyStrong" tabular>
          {formatKcal(kcal)}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {per100 ? t('foodSearch.per100') : 'kcal'}
        </AppText>
      </View>
      <Icon name="add-circle" color="primary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xs },
  controls: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.sm },
  list: { paddingBottom: spacing.huge },
  loader: { margin: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 60,
  },
  kcal: { alignItems: 'flex-end' },
  note: { padding: spacing.sm },
});
