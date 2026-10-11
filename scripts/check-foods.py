#!/usr/bin/env python3
"""Validates food source files (scripts/data/foods_*.py) before generating the table.

Usage: python3 scripts/check-foods.py [scripts/data/foods_extra_x.py ...]  (default: all files)
Checks row shape, allowed serving units, plausible ranges, energy vs macros and duplicate ids/names.
"""
import glob, importlib.util, os, sys

UNITS = {'unit', 'small_unit', 'medium_unit', 'large_unit', 'slice', 'cup', 'small_cup', 'glass',
         'tbsp', 'tsp', 'portion', 'plate', 'bowl', 'handful', 'scoop', 'can', 'bottle', 'piece',
         'half', 'serving'}
SOURCES = {'ARG', 'USDA', 'REC', 'LBL'}
here = os.path.dirname(__file__)


def load(path):
    spec = importlib.util.spec_from_file_location(os.path.basename(path)[:-3], path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.F


def all_files():
    return [os.path.join(here, 'data', 'foods_regional_source.py')] + sorted(
        glob.glob(os.path.join(here, 'data', 'foods_extra_*.py')))


def check(rows, label):
    errors, warnings = [], []
    for row in rows:
        if len(row) != 16:
            errors.append(f'{label}: row with {len(row)} columns: {row[:2]}')
            continue
        (fid, es, en, pt, cat, kcal, p, c, f, fib, sug, na, sat, servings, src, aliases) = row
        where = f'{label}:{fid}'
        if not fid.replace('_', '').isalnum() or fid != fid.lower():
            errors.append(f'{where}: id must be snake_case ascii')
        if src not in SOURCES:
            errors.append(f'{where}: unknown source {src}')
        for v, name, hi in ((kcal, 'kcal', 950), (p, 'protein', 100), (c, 'carbs', 100), (f, 'fat', 100),
                            (fib, 'fiber', 100), (sug, 'sugar', 100), (sat, 'sat_fat', 100), (na, 'sodium', 40000)):
            if not isinstance(v, (int, float)) or v < 0 or v > hi:
                errors.append(f'{where}: {name}={v} out of range')
        if isinstance(p, (int, float)) and p + c + f > 100.5:
            errors.append(f'{where}: protein+carbs+fat > 100 g')
        if sug > c + 0.01 or sat > f + 0.01 or fib > max(c, 0) + 30:
            errors.append(f'{where}: sugar>carbs or sat_fat>fat')
        for s in servings:
            if len(s) != 2 or s[0] not in UNITS or not (0 < s[1] <= 3000):
                errors.append(f'{where}: bad serving {s}')
        if not isinstance(aliases, list):
            errors.append(f'{where}: aliases must be a list')
        calc = p * 4 + c * 4 + f * 9
        if kcal > 30 and abs(calc - kcal) / kcal > 0.15 and cat != 'bebidas':
            warnings.append(f'{where}: kcal {kcal} vs macros {calc:.0f}')
    return errors, warnings


if __name__ == '__main__':
    files = sys.argv[1:] or all_files()
    base = {}
    for path in all_files():
        if path in [os.path.abspath(x) for x in files] or os.path.abspath(path) in map(os.path.abspath, files):
            continue
        for r in load(path):
            base[r[0]] = path
            base['name:' + r[1].lower()] = path
    total_err = 0
    seen = dict(base)
    for path in files:
        rows = load(path)
        errors, warnings = check(rows, os.path.basename(path))
        for r in rows:
            for key in (r[0], 'name:' + r[1].lower()):
                if key in seen:
                    errors.append(f'{os.path.basename(path)}: duplicate {key} (also in {os.path.basename(seen[key])})')
                seen[key] = path
        for w in warnings:
            print('warning:', w)
        for e in errors:
            print('ERROR:', e)
        total_err += len(errors)
        print(f'{os.path.basename(path)}: {len(rows)} foods, {len(errors)} errors, {len(warnings)} warnings')
    sys.exit(1 if total_err else 0)
