import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon, IconButton, SegmentedControl } from '@/components';
import { fontFamily, radii, spacing, useTheme } from '@/theme';
import { regionalCount } from './search';
import type { FoodSearchTab } from './useFoodSearchScreen';

/** Rounded down to the hundred for the placeholder ("Buscá entre 1.500 alimentos"). */
const foodCount = () => (Math.floor(regionalCount() / 100) * 100).toLocaleString('es-AR');

/** Search box and the tabs (search / recent / favorites / mine) above the food lists. */
export function FoodSearchControls({
  query,
  onChangeQuery,
  onClear,
  tab,
  onChangeTab,
}: {
  query: string;
  onChangeQuery: (v: string) => void;
  onClear: () => void;
  tab: FoodSearchTab;
  onChangeTab: (tab: FoodSearchTab) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.controls}>
      <View
        style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Icon name="search" size={22} color="textMuted" />
        <TextInput
          placeholder={t('foodSearch.placeholder', { count: foodCount() })}
          placeholderTextColor={colors.textSubtle}
          value={query}
          onChangeText={onChangeQuery}
          autoFocus={tab === 'search'}
          returnKeyType="search"
          accessibilityLabel={t('common.search')}
          style={[styles.searchInput, { color: colors.text }]}
          testID="food-search-input"
        />
        {query ? (
          <IconButton
            icon="cancel"
            size={20}
            color="textSubtle"
            accessibilityLabel={t('common.clear')}
            onPress={onClear}
          />
        ) : null}
      </View>
      <SegmentedControl<FoodSearchTab>
        value={tab}
        onChange={onChangeTab}
        options={[
          { value: 'search', label: t('foodSearch.tabs.search') },
          { value: 'recent', label: t('foodSearch.tabs.recent') },
          { value: 'favorites', label: t('foodSearch.tabs.favorites') },
          { value: 'mine', label: t('foodSearch.tabs.mine') },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 52,
    borderWidth: 1.5,
    borderRadius: radii.lg,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
  },
  searchInput: { flex: 1, fontFamily: fontFamily.semibold, fontSize: 16, height: 48 },
});
