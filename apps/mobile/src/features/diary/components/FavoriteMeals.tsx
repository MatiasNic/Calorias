import { suggestMealType, type IsoDate } from '@bocado/shared';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Chip } from '@/components';
import { useFavorites } from '@/features/foods/hooks';
import type { FavoriteRecord } from '@/services/db/types';
import { spacing } from '@/theme';
import { formatKcal } from '@/utils/format';
import { useDraftStore } from '../draftStore';

/** Opens the meal editor with a favorite (food or saved meal) ready to adjust and save. */
function openFavorite(fav: FavoriteRecord, date: IsoDate) {
  const now = new Date();
  useDraftStore.getState().start({
    mealId: null,
    date,
    time: { h: now.getHours(), m: now.getMinutes() },
    mealType: suggestMealType(now.getHours()),
    source: 'favorite',
    items: fav.payload.items,
    photoPath: null,
    localPhotoUri: null,
    aiScanId: null,
    dishName: null,
    hiddenQuestion: null,
    quickAnswers: [],
    itemMeals: {},
    groupTimes: {},
    lastCorrection: null,
    notes: null,
    original: null,
  });
  router.push({ pathname: '/meal/[id]', params: { id: 'new' } });
}

/** "Favoritos": one tap to log a starred food or meal (reviewed before saving). */
export function FavoriteMeals({ date }: { date: IsoDate }) {
  const { t } = useTranslation();
  const favorites = useFavorites();
  const list = favorites.data ?? [];
  if (!list.length) return null;
  return (
    <View style={styles.wrap}>
      <AppText variant="bodyStrong">{t('foodSearch.tabs.favorites')}</AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {list.map((f) => {
          const kcal = f.payload.items.reduce((s, i) => s + i.nutrients.kcal, 0);
          const name = f.kind === 'food' ? (f.payload.items[0]?.display_name ?? f.label) : f.label;
          return (
            <Chip
              key={f.id}
              icon={f.kind === 'food' ? 'star' : 'restaurant'}
              label={`${name} · ${formatKcal(kcal)} kcal`}
              onPress={() => openFavorite(f, date)}
              testID={`favorite-${f.id}`}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { gap: spacing.sm, paddingRight: spacing.lg },
});
