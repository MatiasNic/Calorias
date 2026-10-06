# CLAUDE.md — Bocado

App móvil de control de comidas con IA (foto → alimentos → porciones → calorías).
Monorepo pnpm: `apps/mobile` (Expo SDK 57, Expo Router), `packages/shared` (tipos, Zod, fórmulas),
`supabase/` (Postgres + RLS, Edge Functions Deno), `docs/` (ADRs, release, privacidad),
`design/` (kit de diseño Bocado: tokens, marca y pantallas de referencia).

## Comandos

```bash
pnpm install                       # siempre desde la raíz (node-linker=hoisted)
pnpm lint && pnpm typecheck        # antes de dar algo por terminado
pnpm test                          # Vitest: packages/shared + lógica de Edge Functions
pnpm --filter @plato/mobile test   # Jest + RNTL (componentes)
pnpm test:db                       # migraciones + tests de RLS (necesita Postgres, ver README)
pnpm sync:shared                   # copia packages/shared/src → supabase/functions/_shared/shared
cd apps/mobile && npx expo install <pkg>   # SIEMPRE expo install para deps de la app
cd apps/mobile && pnpm start:mock          # app en modo demo (sin claves)
```

## Convenciones

- Código, identificadores y comentarios en **inglés**; textos de UI **siempre** vía i18n
  (`apps/mobile/src/i18n/locales/{es,en,pt}.ts`). `es.ts` es la fuente: `en`/`pt` están tipados
  contra ella, así que una clave faltante rompe el typecheck.
- Rutas en `apps/mobile/src/app` (convención SDK 57). Nada que no sea pantalla dentro de `app/`.
- Feature-first: `src/features/<dominio>/` contiene hooks, componentes y lógica de ese dominio.
  `src/services/` = integraciones (supabase, db local, sync, IA, compras, analytics…).
- Lógica de negocio en funciones puras en `packages/shared` con tests. Nada de números mágicos:
  usar `packages/shared/src/constants.ts` y `plans.ts`.
- `packages/shared` usa imports relativos con extensión `.ts` para que el mismo código corra en
  Metro, Vitest y Deno. Después de cambiarlo: `pnpm sync:shared` (CI falla si está desincronizado).
- Colores/espaciados solo desde `src/theme` (tokens, fuente: `design/tokens/tokens.json`). La marca es
  tinta (`primary`); el salvia (`kcal`) solo para calorías. Proteína/carbos/grasas usan siempre
  `colors.protein|carbs|fat`.
- Datos: la app es **offline-first**. Todo se escribe en SQLite local (`src/services/db`) y se
  sincroniza con Supabase vía outbox (`src/services/sync`). Nunca escribir directo a Supabase
  desde una pantalla.
- La clave de IA **nunca** va en la app: IA solo vía Edge Functions (`analyze-meal`, etc.), que
  validan JWT, plan y cuota en servidor.
- `EXPO_PUBLIC_USE_MOCKS=true` (o Supabase sin configurar) → IA, pagos y backend simulados.
- Accesibilidad: todo control con `accessibilityLabel`/rol; áreas táctiles ≥ 48 dp.
- Salud: lenguaje neutro, sin culpa. Respetar salvaguardas de `computeGoalPlan`.

## Commits

Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`). Decisiones de arquitectura →
`docs/adr/NNNN-titulo.md`.
