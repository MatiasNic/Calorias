import type { IsoDate } from '@plato/shared';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Checkbox, IconButton } from '@/components';
import { checkAchievements } from '@/features/habits/hooks';
import {
  takeDose,
  undoDose,
  useSupplementDay,
  type ChecklistRow,
} from '@/features/supplements/hooks';
import { doseLabel, supplementName } from '@/features/training/labels';
import { spacing, useTheme } from '@/theme';
import { formatTime } from '@/utils/dates';
import { haptic } from '@/utils/haptics';

/** The day's supplement checklist inside the diary, so doses are tracked next to meals. */
export function SupplementsSection({ date }: { date: IsoDate }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const day = useSupplementDay(date);
  const rows = day.data?.rows ?? [];
  const extras = day.data?.extras ?? [];
  const hasSupplements = !!day.data?.supplements.length;
  const taken = rows.filter((r) => r.taken).length;

  const toggle = async (row: ChecklistRow) => {
    haptic('selection');
    if (row.intake) await undoDose(row.intake);
    else {
      await takeDose(row.supplement, date, row.slot, doseLabel(row.supplement));
      checkAchievements().catch(() => undefined);
    }
  };

  return (
    <Card padded={false} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="subheading" accessibilityRole="header">
            {t('diary.supplements')}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {rows.length
              ? t('supplements.progress', { taken, total: rows.length })
              : hasSupplements
                ? t('diary.supplementsNone')
                : t('diary.supplementsEmpty')}
          </AppText>
        </View>
        <IconButton
          icon={hasSupplements ? 'settings-outline' : 'add-circle'}
          accessibilityLabel={hasSupplements ? t('diary.manageSupplements') : t('supplements.add')}
          color={hasSupplements ? 'textMuted' : 'primary'}
          size={hasSupplements ? 22 : 28}
          testID="diary-supplements"
          onPress={() => router.push(hasSupplements ? '/supplements' : '/supplement')}
        />
      </View>
      {rows.map((r, i) => (
        <View
          key={`${r.supplement.id}-${r.slot}`}
          style={[styles.row, i > 0 && [styles.divider, { borderTopColor: colors.border }]]}
        >
          <Checkbox
            checked={r.taken}
            onChange={() => toggle(r)}
            testID={`diary-dose-${r.supplement.id}-${r.slot}`}
            accessibilityLabel={t(r.taken ? 'supplements.markNotTaken' : 'supplements.markTaken', {
              name: supplementName(r.supplement),
              time: r.slot,
            })}
          >
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{supplementName(r.supplement)}</AppText>
              <AppText variant="caption" color="textMuted">
                {`${r.slot} · ${doseLabel(r.supplement)}`}
              </AppText>
            </View>
          </Checkbox>
        </View>
      ))}
      {extras.length ? (
        <AppText variant="caption" color="textMuted" style={styles.extras}>
          {`${t('supplements.extraTaken')}: ${extras
            .map((x) => {
              const s = day.data?.byId.get(x.supplement_id);
              return `${s ? supplementName(s) : ''} ${formatTime(x.taken_at)}`;
            })
            .join(', ')}`}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm,
  },
  flex: { flex: 1 },
  row: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  extras: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
});
