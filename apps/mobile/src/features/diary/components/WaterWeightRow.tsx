import { WATER_QUICK_ADD_ML, type IsoDate } from '@plato/shared';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Icon, IconButton } from '@/components';
import { addWater, undoLastWater, useLatestWeight } from '@/features/body/hooks';
import { checkAchievements } from '@/features/habits/hooks';
import { usePrefsStore } from '@/stores/prefs';
import { radii, spacing, useTheme } from '@/theme';
import { formatVolume, formatWeight } from '@/utils/format';
import { haptic } from '@/utils/haptics';

export function WaterWeightRow({
  date,
  waterMl,
  waterTarget,
}: {
  date: IsoDate;
  waterMl: number;
  waterTarget: number | null;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const units = usePrefsStore((s) => s.units);
  const weight = useLatestWeight();
  const water = formatVolume(waterMl, units);
  const target = waterTarget ? formatVolume(waterTarget, units) : null;
  const ratio = waterTarget ? Math.min(1, waterMl / waterTarget) : 0;
  const w = weight.data ? formatWeight(weight.data, units) : null;

  return (
    <View style={styles.row}>
      <Card style={styles.card}>
        <View style={styles.head}>
          <Icon name="water" rawColor={colors.water} size={20} />
          <AppText variant="label" color="textMuted">
            {t('today.water')}
          </AppText>
        </View>
        <AppText variant="number" tabular>
          {water.value}
          <AppText variant="caption" color="textMuted">
            {target ? ` / ${target.value} ${target.unit}` : ` ${water.unit}`}
          </AppText>
        </AppText>
        <View style={[styles.track, { backgroundColor: colors.ringTrack }]}>
          <View
            style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: colors.water }]}
          />
        </View>
        <View style={styles.actions}>
          <Button
            label={`+${formatVolume(WATER_QUICK_ADD_ML, units).value}`}
            size="sm"
            variant="secondary"
            fullWidth={false}
            icon="add"
            testID="water-add"
            onPress={async () => {
              haptic('light');
              await addWater(date);
              checkAchievements().catch(() => undefined);
            }}
          />
          {waterMl > 0 ? (
            <IconButton
              icon="arrow-undo"
              accessibilityLabel={t('today.undoWater')}
              onPress={() => undoLastWater(date)}
              size={18}
            />
          ) : null}
        </View>
      </Card>
      <Card
        style={styles.card}
        onPress={() => router.push('/weight')}
        accessibilityLabel={t('today.logWeight')}
      >
        <View style={styles.head}>
          <Icon name="scale" color="primary" size={20} />
          <AppText variant="label" color="textMuted">
            {t('today.weight')}
          </AppText>
        </View>
        <AppText variant="number" tabular>
          {w ? w.value : '—'}
          <AppText variant="caption" color="textMuted">{` ${w?.unit ?? ''}`}</AppText>
        </AppText>
        <AppText variant="label" color="primary">
          {t('today.logWeight')}
        </AppText>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  card: { flex: 1, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  track: { height: 6, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
