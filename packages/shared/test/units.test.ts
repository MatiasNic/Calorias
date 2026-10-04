import { describe, expect, it } from 'vitest';
import {
  cmToFtIn,
  flOzToMl,
  ftInToCm,
  gToOz,
  kgToLb,
  lbToKg,
  mlToFlOz,
  ozToG,
} from '../src/index.ts';

describe('unit conversion', () => {
  it('converts mass', () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 2);
    expect(lbToKg(kgToLb(72.5))).toBeCloseTo(72.5, 8);
    expect(gToOz(28.349523125)).toBeCloseTo(1, 8);
    expect(ozToG(2)).toBeCloseTo(56.699, 2);
  });
  it('converts height', () => {
    expect(cmToFtIn(180)).toEqual({ ft: 5, inches: 11 });
    expect(cmToFtIn(182.88)).toEqual({ ft: 6, inches: 0 });
    expect(ftInToCm(5, 11)).toBeCloseTo(180.34, 2);
  });
  it('converts volume', () => {
    expect(mlToFlOz(flOzToMl(8))).toBeCloseTo(8, 8);
  });
});
