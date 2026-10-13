import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText, Icon, IconButton } from '@/components';
import { FoodSearchControls } from '@/features/foods/FoodSearchControls';
import { FavoritesList, FoodOptionsList } from '@/features/foods/FoodSearchLists';
import { useFoodSearchScreen } from '@/features/foods/useFoodSearchScreen';
import { radii, spacing, useTheme } from '@/theme';

export default function FoodSearch() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const {
    params,
    tab,
    setTab,
    query,
    setQuery,
    changeQuery,
    search,
    favorites,
    data,
    date,
    mealType,
    pick,
    logFavoriteMeal,
  } = useFoodSearchScreen();

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
        <AppText variant="heading" style={styles.flex} accessibilityRole="header">
          {params.target
            ? t('foodSearch.addFood')
            : t('foodSearch.titleFor', { meal: t(`mealTypes.${mealType}`) })}
        </AppText>
        <IconButton
          icon="barcode_scanner"
          accessibilityLabel={t('quick.barcode')}
          onPress={() => router.push({ pathname: '/scan', params: { mode: 'barcode' } })}
        />
      </View>
      <FoodSearchControls
        query={query}
        onChangeQuery={changeQuery}
        onClear={() => setQuery('')}
        tab={tab}
        onChangeTab={setTab}
      />
      {tab === 'favorites' ? (
        <FavoritesList favorites={favorites} onPickFood={pick} onLogMeal={logFavoriteMeal} />
      ) : (
        <FoodOptionsList
          tab={tab}
          query={query}
          data={data}
          loadingRemote={search.loadingRemote}
          onPick={pick}
        />
      )}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.replace({
              pathname: '/listen',
              params: query.trim() ? { text: query.trim(), date } : { date },
            })
          }
          style={[styles.voice, { backgroundColor: colors.surfaceAlt }]}
          testID="food-search-voice"
        >
          <Icon name="mic" size={20} />
          <AppText variant="bodyStrong">{t('foodSearch.sayIt')}</AppText>
        </Pressable>
      </View>
      {tab === 'search' && search.remoteError ? (
        <AppText variant="caption" color="textMuted" align="center" style={styles.note}>
          {t('foodSearch.remoteUnavailable')}
        </AppText>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    minHeight: 60,
  },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  voice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radii.lg,
  },
  note: { padding: spacing.sm },
});
