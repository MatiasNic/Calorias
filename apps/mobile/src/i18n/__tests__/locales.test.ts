import { en } from '../locales/en';
import { es } from '../locales/es';
import { pt } from '../locales/pt';

type Tree = { [k: string]: string | Tree };

function flatten(obj: Tree, prefix = ''): Record<string, string> {
  return Object.entries(obj).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') acc[key] = v;
    else Object.assign(acc, flatten(v, key));
    return acc;
  }, {});
}

const placeholders = (s: string) => [...s.matchAll(/{{(\w+)}}/g)].map((m) => m[1]).sort();
const tags = (s: string) => [...s.matchAll(/<(\w+)>/g)].map((m) => m[1]).sort();

describe('translations', () => {
  const base = flatten(es as unknown as Tree);
  for (const [name, locale] of [
    ['en', en],
    ['pt', pt],
  ] as const) {
    const other = flatten(locale as unknown as Tree);
    it(`${name} has exactly the same keys as es`, () => {
      expect(Object.keys(other).sort()).toEqual(Object.keys(base).sort());
    });
    it(`${name} keeps the same {{placeholders}} and <tags>`, () => {
      for (const key of Object.keys(base)) {
        expect([key, placeholders(other[key]!)]).toEqual([key, placeholders(base[key]!)]);
        expect([key, tags(other[key]!)]).toEqual([key, tags(base[key]!)]);
      }
    });
    it(`${name} has no empty strings`, () => {
      expect(Object.entries(other).filter(([, v]) => !v.trim())).toEqual([]);
    });
  }
});
