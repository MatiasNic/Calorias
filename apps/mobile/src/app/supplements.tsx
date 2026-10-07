import { daysOfSupply, isLowStock } from '@plato/shared';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Icon,
  IconButton,
  ListRow,
  ProgressBar,
  Screen,
  ScreenHeader,
  SectionHeader,
  toast,
} from '@/components';
import { checkAchievements } from '@/features/habits/hooks';
import {
  takeDose,
  undoDose,
  useSupplementAdherence,
  useSupplementDay,
  useSupplements,
  type ChecklistRow,
} from '@/features/supplements/hooks';
import { doseLabel, supplementName, weekdayName } from '@/features/training/labels';
import type { SupplementRecord } from '@/services/db/types';
import { spacing, useTheme } from '@/theme';
import { formatTime, todayLocal } from '@/utils/dates';
import { haptic } from '@/utils/haptics';

const pct = (v: number | null | undefined) => (v == null ? null : Math.round(v * 100));

export default function Supplements() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const today = todayLocal();
  const list = useSupplements();
  const day = useSupplementDay(today);
  const adherence = useSupplementAdherence(today);
  const rows = day.data?.rows ?? [];
  const taken = rows.filter((r) => r.taken).length;
  const openNew = () => router.push('/supplement');

  const toggle = async (row: ChecklistRow) => {
    haptic('selection');
    if (row.intake) await undoDose(row.intake);
    else {
      await takeDose(row.supplement, today, row.slot, doseLabel(row.supplement));
      checkAchievements().catch(() => undefined);
    }
  };

  const extraDose = async (s: SupplementRecord) => {
    await takeDose(s, today, 'extra', doseLabel(s));
    toast.success(`${supplementName(s)} · ${t('supplements.extra')}`);
  };

  const schedule = (s: SupplementRecord) =>
    [
      doseLabel(s),
      s.days.length === 0 || s.days.length === 7
        ? t('supplements.everyDay')
        : [...s.days]
            .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
            .map((d) => weekdayName(d))
            .join(' '),
      [...s.times].sort().join(' · '),
    ].join(' · ');

  const week = pct(adherence.data?.week);
  const month = pct(adherence.data?.month);

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      footer={
        <Button label={t('supplements.add')} icon="add" onPress={openNew} testID="supplement-add" />
      }
    >
      <ScreenHeader title={t('supplements.title')} />
      {list.data?.length ? (
        <>
          <Card style={styles.gap}>
            <View style={styles.row}>
              <AppText variant="subheading" style={styles.flex}>
                {t('supplements.todayList')}
              </AppText>
              {rows.length ? (
                <AppText variant="label" color="textMuted" tabular>
                  {t('supplements.progress', { taken, total: rows.length })}
                </AppText>
              ) : null}
            </View>
            {rows.length ? (
              <>
                <ProgressBar progress={taken / rows.length} color={colors.success} />
                {rows.map((r) => (
                  <Checkbox
                    key={`${r.supplement.id}-${r.slot}`}
                    checked={r.taken}
                    onChange={() => toggle(r)}
                    testID={`dose-${r.slot}`}
                    accessibilityLabel={t(
                      r.taken ? 'supplements.markNotTaken' : 'supplements.markTaken',
                      { name: supplementName(r.supplement), time: r.slot },
                    )}
                  >
                    <View style={styles.flex}>
                      <AppText variant="bodyStrong">{supplementName(r.supplement)}</AppText>
                      <AppText variant="caption" color="textMuted">
                        {`${r.slot} · ${doseLabel(r.supplement)}`}
                      </AppText>
                    </View>
                  </Checkbox>
                ))}
                {taken === rows.length ? (
                  <AppText variant="label" color="success">
                    {t('supplements.allDone')}
                  </AppText>
                ) : null}
              </>
            ) : (
              <AppText variant="caption" color="textMuted">
                {t('supplements.nothingToday')}
              </AppText>
            )}
            {day.data?.extras.length ? (
              <AppText variant="caption" color="textMuted">
                {`${t('supplements.extraTaken')}: ${day.data.extras
                  .map((i) => {
                    const s = day.data.byId.get(i.supplement_id);
                    return `${s ? supplementName(s) : ''} ${formatTime(i.taken_at)}`;
                  })
                  .join(', ')}`}
              </AppText>
            ) : null}
          </Card>

          {week != null || month != null ? (
            <Card style={styles.gap}>
              <AppText variant="subheading">{t('supplements.adherence')}</AppText>
              {[
                [t('supplements.adherence7'), week],
                [t('supplements.adherence30'), month],
              ].map(([label, value]) => (
                <View key={String(label)} style={styles.gapSm}>
                  <View style={styles.row}>
                    <AppText variant="label" color="textMuted" style={styles.flex}>
                      {label}
                    </AppText>
                    <AppText variant="label" tabular>
                      {value == null ? t('supplements.noAdherence') : `${value}%`}
                    </AppText>
                  </View>
                  <ProgressBar progress={((value as number | null) ?? 0) / 100} />
                </View>
              ))}
            </Card>
          ) : null}

          <SectionHeader title={t('supplements.mine')} />
          <Card padded={false}>
            {list.data.map((s) => {
              const low = s.active && isLowStock(s);
              const supply = daysOfSupply(s);
              return (
                <ListRow
                  key={s.id}
                  icon={low ? 'alert-circle' : s.active ? 'medkit-outline' : 'pause-circle-outline'}
                  iconColor={low ? 'warning' : s.active ? 'text' : 'textSubtle'}
                  title={supplementName(s) + (s.active ? '' : ` · ${t('supplements.paused')}`)}
                  subtitle={[
                    schedule(s),
                    s.stock != null
                      ? `${t('supplements.stockLeft', { count: s.stock })}${
                          supply != null && s.active
                            ? ` (${t('supplements.daysLeft', { count: supply })})`
                            : ''
                        }`
                      : null,
                    low ? t('supplements.lowStock') : null,
                  ]
                    .filter(Boolean)
                    .join('\n')}
                  right={
                    <View style={styles.actions}>
                      {s.active ? (
                        <IconButton
                          icon="add-circle-outline"
                          color="textMuted"
                          accessibilityLabel={`${t('supplements.extra')}: ${supplementName(s)}`}
                          onPress={() => extraDose(s)}
                        />
                      ) : null}
                      <IconButton
                        icon="create-outline"
                        color="textMuted"
                        testID={`supplement-edit-${s.id}`}
                        accessibilityLabel={`${t('supplements.editTitle')}: ${supplementName(s)}`}
                        onPress={() =>
                          router.push({ pathname: '/supplement', params: { id: s.id } })
                        }
                      />
                    </View>
                  }
                />
              );
            })}
          </Card>
          <View style={styles.row}>
            <Icon name="information-circle-outline" size={18} color="textSubtle" />
            <AppText variant="caption" color="textSubtle" style={styles.flex}>
              {t('supplements.disclaimer')}
            </AppText>
          </View>
        </>
      ) : list.isLoading ? null : (
        <>
          <EmptyState
            icon="medkit-outline"
            title={t('supplements.empty')}
            message={t('supplements.emptyHint')}
            actionLabel={t('supplements.add')}
            onAction={openNew}
          />
          <AppText variant="caption" color="textSubtle" align="center">
            {t('supplements.disclaimer')}
          </AppText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gap: { gap: spacing.md },
  gapSm: { gap: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center' },
});
