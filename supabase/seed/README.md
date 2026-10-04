# Seeds

- `01_foods_regional.sql` — **generado** por `pnpm gen:foods` desde
  `scripts/data/foods_regional_source.py` (también genera `packages/shared/data/foods-regional.json`,
  que la app incluye para búsqueda offline). Valores por 100 g de porción comestible tal como se
  consume; cada fila indica su fuente (ARGENFOODS, USDA FDC, rótulos, o estimación por receta).
  **Pendiente de revisión por nutricionista matriculado antes del lanzamiento** (ver docs/RELEASE.md).
