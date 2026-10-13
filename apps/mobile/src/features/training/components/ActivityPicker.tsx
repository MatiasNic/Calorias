import { ACTIVITIES, type ActivityKind } from '@plato/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Chip, Icon, SectionHeader } from '@/components';
import { radii, spacing, useTheme } from '@/theme';
import { activityIcon, activityName } from '../labels';

const KINDS: ActivityKind[] = ['cardio', 'strength', 'sport', 'mind', 'other'];

/** Selected activity card that expands into the catalog grouped by kind. */
export function ActivityPicker({
  value,
  open,
  onToggle,
  onChange,
}: {
  value: string;
  open: boolean;
  onToggle: () => void;
  onChange: (key: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <>
      <SectionHeader title={t('training.activity')} />
      <Card
        onPress={onToggle}
        accessibilityLabel={`${t('training.activity')}: ${activityName(value)}`}
        style={styles.card}
      >
        <View style={[styles.icon, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={activityIcon(value)} size={22} />
        </View>
        <AppText variant="subheading" style={styles.flex}>
          {activityName(value)}
        </AppText>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} color="textMuted" size={18} />
      </Card>
      {open
        ? KINDS.map((kind) => (
            <View key={kind} style={styles.group}>
              <AppText variant="overline" color="textMuted">
                {t(`training.kinds.${kind}`).toUpperCase()}
              </AppText>
              <View style={styles.wrap}>
                {ACTIVITIES.filter((a) => a.kind === kind).map((a) => (
                  <Chip
                    key={a.key}
                    label={activityName(a.key)}
                    icon={activityIcon(a.key)}
                    selected={a.key === value}
                    testID={`activity-${a.key}`}
                    onPress={() => onChange(a.key)}
                  />
                ))}
              </View>
            </View>
          ))
        : null}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { gap: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
