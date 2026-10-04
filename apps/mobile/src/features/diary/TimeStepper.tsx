import { useTranslation } from 'react-i18next';

import { Stepper } from '@/components';

const pad = (n: number) => String(n).padStart(2, '0');

/** Accessible time selector in 15-minute steps (minutes since midnight). */
export function TimeStepper({
  value,
  onChange,
}: {
  value: { h: number; m: number };
  onChange: (v: { h: number; m: number }) => void;
}) {
  const { t } = useTranslation();
  const minutes = value.h * 60 + value.m;
  return (
    <Stepper
      label={t('diary.time')}
      value={minutes}
      min={0}
      max={23 * 60 + 45}
      step={15}
      format={(v) => `${pad(Math.floor(v / 60))}:${pad(v % 60)}`}
      onChange={(v) => onChange({ h: Math.floor(v / 60), m: v % 60 })}
    />
  );
}
