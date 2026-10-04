import { cmToFtIn, kgToLb, mlToFlOz, type UnitSystem } from '@plato/shared';

import { currentLocale } from '@/i18n';

const nf = (digits = 0) =>
  new Intl.NumberFormat(currentLocale(), {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });

export const formatNumber = (n: number, digits = 0) => nf(digits).format(n);
export const formatKcal = (n: number) => nf(0).format(Math.round(n));
export const formatGrams = (n: number) => nf(n < 10 ? 1 : 0).format(n);

export function formatWeight(kg: number, units: UnitSystem): { value: string; unit: string } {
  return units === 'imperial'
    ? { value: nf(1).format(kgToLb(kg)), unit: 'lb' }
    : { value: nf(1).format(kg), unit: 'kg' };
}

export function formatHeight(cm: number, units: UnitSystem): string {
  if (units === 'imperial') {
    const { ft, inches } = cmToFtIn(cm);
    return `${ft}′ ${inches}″`;
  }
  return `${nf(0).format(cm)} cm`;
}

export function formatVolume(ml: number, units: UnitSystem): { value: string; unit: string } {
  return units === 'imperial'
    ? { value: nf(0).format(mlToFlOz(ml)), unit: 'fl oz' }
    : { value: nf(0).format(ml), unit: 'ml' };
}

/** Parses a user-typed decimal accepting both "," and "." */
export function parseDecimal(text: string): number | null {
  const cleaned = text.replace(/\s/g, '').replace(',', '.');
  if (!/^-?\d*\.?\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
