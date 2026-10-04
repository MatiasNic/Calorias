import { ACHIEVEMENTS } from '@plato/shared';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Icon, Screen, ScreenHeader, type IconName } from '@/components';
import { repos } from '@/services/db/repository';
import { radii, spacing, useTheme } from '@/theme';
import { formatDay } from '@/utils/dates';

const ICONS: Record<string, IconName> = {
  restaurant: 'restaurant',
  camera: 'camera',
  flame: 'flame',
  trophy: 'trophy',
  barbell: 'barbell',
  water: 'water',
  scale: 'scale',
  ribbon: 'ribbon',
  book: 'book',
};

export default function Achievements() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const unlocked = useQuery({
    queryKey: ['db', 'achievements'],
    queryFn: () => repos.achievements.list(),
  });
  const map = new Map((unlocked.data ?? []).map((a) => [a.id, a.unlocked_at]));
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader title={t('achievements.title')} />
      <View style={styles.grid}>
        {ACHIEVEMENTS.map((a, i) => {
          const at = map.get(a.id);
          return (
            <Animated.View key={a.id} entering={FadeInUp.delay(i * 40)} style={styles.cell}>
              <Card
                style={at ? styles.card : [styles.card, styles.locked]}
                accessibilityLabel={`${t(`achievements.items.${a.id}.title`)}${at ? '' : `, ${t('achievements.lockedLabel')}`}`}
              >
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: at ? colors.primarySoft : colors.surfaceAlt },
                  ]}
                >
                  <Icon
                    name={at ? ICONS[a.icon]! : 'lock-closed'}
                    color={at ? 'primary' : 'textSubtle'}
                    size={26}
                  />
                </View>
                <AppText variant="bodyStrong" align="center">
                  {t(`achievements.items.${a.id}.title`)}
                </AppText>
                <AppText variant="caption" color="textMuted" align="center">
                  {at
                    ? formatDay(at.slice(0, 10), { day: 'numeric', month: 'short' })
                    : t(`achievements.items.${a.id}.description`)}
                </AppText>
              </Card>
            </Animated.View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cell: { width: '47%' },
  card: { alignItems: 'center', gap: spacing.sm, minHeight: 150 },
  locked: { opacity: 0.55 },
  badge: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
