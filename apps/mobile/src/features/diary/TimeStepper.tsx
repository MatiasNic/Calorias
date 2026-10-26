import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Stepper } from '@/components';
import { fontFamily, radii, spacing, useTheme } from '@/theme';

const pad = (n: number) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = [0, 15, 30, 45];

/**
 * Accessible time selector in 15-minute steps: − / + (hold to move fast), or tap the time to
 * pick the hour and minutes directly.
 */
export function TimeStepper({
  value,
  onChange,
}: {
  value: { h: number; m: number };
  onChange: (v: { h: number; m: number }) => void;
}) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);
  const minutes = value.h * 60 + value.m;
  return (
    <>
      <Stepper
        label={t('diary.time')}
        value={minutes}
        min={0}
        max={23 * 60 + 45}
        step={15}
        format={(v) => `${pad(Math.floor(v / 60))}:${pad(v % 60)}`}
        onChange={(v) => onChange({ h: Math.floor(v / 60), m: v % 60 })}
        onPressValue={() => setPicking(true)}
        valueHint={t('time.pickHint')}
      />
      {picking ? (
        <TimePickerSheet
          value={value}
          onClose={() => setPicking(false)}
          onPick={(v) => {
            onChange(v);
            setPicking(false);
          }}
        />
      ) : null}
    </>
  );
}

/** Hour grid + quarter-hour row, in the app's chip style. */
function TimePickerSheet({
  value,
  onPick,
  onClose,
}: {
  value: { h: number; m: number };
  onPick: (v: { h: number; m: number }) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [h, setH] = useState(value.h);
  // Off-grid minutes (e.g. 12:07 from "now") snap to the closest quarter for the chips.
  const [m, setM] = useState(MINUTES.includes(value.m) ? value.m : Math.floor(value.m / 15) * 15);

  const cell = (label: string, selected: boolean, onPress: () => void, testID: string) => (
    <Pressable
      key={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      style={[styles.cell, { backgroundColor: selected ? colors.primary : colors.surfaceAlt }]}
    >
      <AppText
        variant="label"
        tabular
        color={selected ? 'onPrimary' : 'text'}
        style={selected ? styles.bold : undefined}
      >
        {label}
      </AppText>
    </Pressable>
  );

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
      />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, spacing.lg) },
        ]}
      >
        <AppText variant="heading" align="center" tabular>
          {pad(h)}:{pad(m)}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {t('time.hour')}
        </AppText>
        <View style={styles.grid}>
          {HOURS.map((x) => cell(pad(x), x === h, () => setH(x), `time-hour-${x}`))}
        </View>
        <AppText variant="caption" color="textMuted">
          {t('time.minutes')}
        </AppText>
        <View style={styles.grid}>
          {MINUTES.map((x) => cell(`:${pad(x)}`, x === m, () => setM(x), `time-min-${x}`))}
        </View>
        <Button label={t('common.done')} onPress={() => onPick({ h, m })} testID="time-done" />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  cell: {
    width: '15.4%',
    minHeight: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bold: { fontFamily: fontFamily.bold },
});
