/** Deeply maps a translation object so every other locale must define the same keys. */
export type TranslationShape<T> = {
  [K in keyof T]: T[K] extends string ? string : TranslationShape<T[K]>;
};
