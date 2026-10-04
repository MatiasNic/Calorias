# ADR 0001 — Monorepo con pnpm workspaces (node-linker=hoisted)

- Estado: aceptada · Fecha: 2026-10-04

## Contexto

Necesitamos compartir tipos, esquemas Zod y fórmulas entre la app (Metro/Hermes), los tests
(Vitest/Jest) y las Edge Functions (Deno).

## Decisión

- pnpm workspaces: `apps/*`, `packages/*`. `node-linker=hoisted` porque Gradle, CocoaPods y algunos
  config plugins de React Native todavía asumen un `node_modules` plano.
- `packages/shared` se consume como **código fuente TypeScript** (sin build). Usa imports
  relativos con extensión `.ts` (`allowImportingTsExtensions`), compatible con Metro, Vitest y Deno.
- Las Edge Functions no pueden importar fuera de `supabase/functions` al desplegar, así que
  `scripts/sync-shared.mjs` copia `packages/shared/src` a `supabase/functions/_shared/shared`.
  CI verifica que la copia esté sincronizada (`pnpm check:shared`).

## Alternativas

Turborepo/Nx (más tooling sin beneficio a esta escala), Yarn Berry (PnP incompatible con RN),
publicar `shared` en un registry (fricción innecesaria).
