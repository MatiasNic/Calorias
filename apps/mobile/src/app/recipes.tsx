import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Card, EmptyState, ListRow, Screen, ScreenHeader } from '@/components';
import { useRecipeDraftStore } from '@/features/foods/recipeDraft';
import { repos } from '@/services/db/repository';
import { formatKcal } from '@/utils/format';

export default function Recipes() {
  const { t } = useTranslation();
  const recipes = useQuery({ queryKey: ['db', 'recipes'], queryFn: () => repos.recipes.list() });
  const openNew = () => {
    useRecipeDraftStore.getState().reset();
    router.push('/recipe-editor');
  };
  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      footer={<Button label={t('recipes.new')} icon="add" onPress={openNew} />}
    >
      <ScreenHeader title={t('recipes.listTitle')} />
      {recipes.data?.length ? (
        <Card padded={false}>
          {recipes.data.map((r) => (
            <ListRow
              key={r.id}
              icon="book"
              title={r.name}
              subtitle={`${formatKcal(r.totals.kcal / r.servings)} kcal · ${t('recipes.perServing')}`}
              onPress={() => router.push({ pathname: '/recipe-editor', params: { id: r.id } })}
            />
          ))}
        </Card>
      ) : (
        <EmptyState
          icon="book"
          title={t('recipes.empty')}
          message={t('recipes.emptyHint')}
          actionLabel={t('recipes.new')}
          onAction={openNew}
        />
      )}
    </Screen>
  );
}
