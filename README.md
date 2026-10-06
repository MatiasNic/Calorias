# Bocado 🍽️

App móvil (Android + iOS) de control de alimentación con IA: sacás una foto de tu plato, la IA
identifica cada alimento y estima la porción, y la app calcula calorías, macros y micronutrientes,
los registra en tu diario y te muestra tu progreso. Español rioplatense primero; inglés y portugués
incluidos.

📲 **Probar la app (APK demo para Android):**
https://github.com/MatiasNic/Calorias/releases/latest/download/bocado.apk

| Carpeta           | Qué hay                                                                      |
| ----------------- | ---------------------------------------------------------------------------- |
| `apps/mobile`     | App Expo SDK 57 (Expo Router, TS estricto, Zustand, TanStack Query, SQLite)  |
| `packages/shared` | Tipos, esquemas Zod, fórmulas de nutrición, planes/cuotas (con tests)        |
| `supabase/`       | Migraciones Postgres + RLS, seed de 229 alimentos regionales, Edge Functions |
| `docs/`           | ADRs, costos, release, ficha de tienda, privacidad, guía de testers          |

Documentos clave: [CLAUDE.md](CLAUDE.md) (convenciones) · [docs/adr](docs/adr) (decisiones) ·
[docs/RELEASE.md](docs/RELEASE.md) (publicar) · [docs/COSTS.md](docs/COSTS.md) (costos de IA) ·
[docs/PRIVACY.md](docs/PRIVACY.md) · [docs/STORE_LISTING.md](docs/STORE_LISTING.md) ·
[docs/TESTERS.md](docs/TESTERS.md).

---

## 1. Probarlo en 5 minutos (modo demo, sin claves)

Requisitos: **Node ≥ 22**, **pnpm 10** (`corepack enable`), la app **Expo Go** no sirve (usamos
módulos nativos): usá el APK de demo, un emulador con development build, o la versión web.

```bash
pnpm install
cd apps/mobile
pnpm start:mock          # EXPO_PUBLIC_USE_MOCKS=true → IA, pagos y backend simulados
# tecla "w" abre la versión web (útil para mirar pantallas); "a" abre Android si tenés emulador
```

En modo demo todo funciona offline: el escaneo devuelve platos de ejemplo realistas (milanesa con
puré, empanadas, fideos con tuco…), el código de barras `7790000000017` devuelve un producto de
prueba, las compras se simulan y los datos quedan solo en el teléfono. Si dejás vacías las
variables de Supabase, el modo demo se activa solo.

## 2. Setup completo con backend (≈ 15 minutos)

Requisitos extra: **Docker** (para Supabase local) y opcionalmente **Deno 2** (chequeo de tipos de
las Edge Functions).

```bash
# 1) Variables
cp .env.example .env                     # servidor + tooling
cp .env.example apps/mobile/.env         # app (solo usa EXPO_PUBLIC_*)

# 2) Backend local: Postgres, Auth, Storage, Edge Functions
pnpm exec supabase start                 # imprime API URL y anon key
pnpm db:reset                            # migraciones + seed de alimentos regionales
pnpm exec supabase functions serve --env-file .env
```

3. Copiá la `API URL` y la `anon key` que imprimió `supabase start` en `apps/mobile/.env`
   (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) y poné
   `EXPO_PUBLIC_USE_MOCKS=false`. Desde un teléfono físico usá la IP de tu PC en vez de
   `127.0.0.1`.
4. IA real: poné `ANTHROPIC_API_KEY` en `.env` (servidor). Sin clave, las Edge Functions responden
   con IA simulada (`AI_MOCK`), así que el flujo completo igual se puede probar.
5. App nativa: `cd apps/mobile && npx expo run:android` (o `run:ios` en macOS), o un development
   build de EAS (`eas build --profile development`).

Los mails de confirmación de la cuenta local se ven en el servidor de mails de prueba: <http://127.0.0.1:54324>.

## 3. Comandos

```bash
pnpm lint && pnpm typecheck                  # ESLint + tsc de todo el monorepo
pnpm test                                    # Vitest: shared + Edge Functions (IA mockeada)
pnpm --filter @plato/mobile test             # Jest + React Native Testing Library
pnpm test:db                                 # migraciones + tests de RLS (DATABASE_URL a un Postgres 16)
pnpm sync:shared                             # copia packages/shared → Edge Functions (CI lo verifica)
pnpm gen:types                               # regenera tipos de la base (con supabase start corriendo)
pnpm gen:foods                               # regenera seed + JSON de alimentos regionales
cd supabase/functions && deno check */index.ts
cd apps/mobile && maestro test .maestro      # E2E (app demo instalada en un emulador)
```

## 4. Arquitectura en una página

- **Offline-first.** Todo se guarda primero en SQLite (`src/services/db`) y un motor de sync
  (`src/services/sync`) empuja cambios pendientes y trae los remotos con Supabase. Si usás la app
  como invitado y después creás cuenta, tus datos se adoptan. ([ADR 0004](docs/adr/0004-offline-first-sqlite-outbox.md))
- **IA solo en el servidor.** La app manda la foto comprimida (≤1024 px) a Storage privado y llama
  a la Edge Function `analyze-meal`, que valida JWT → esquema → ruta propia → rate limit →
  deduplicación por hash → presupuesto diario → cuota atómica → Claude con salida estructurada →
  enriquecimiento nutricional (base regional → USDA → estimación) → chequeo de plausibilidad.
  Si falla o no es comida, se devuelve la cuota. ([ADR 0007](docs/adr/0007-ai-pipeline.md))
- **Modelos configurables.** `AI_MODEL_FREE` (por defecto Haiku 4.5) para el plan gratis y
  `AI_MODEL_PREMIUM` (Sonnet 5.5) para premium. Costos estimados en [docs/COSTS.md](docs/COSTS.md).
- **Seguridad.** RLS en todas las tablas, bucket de fotos privado con URLs firmadas, claves solo en
  secretos de Supabase/EAS, cuotas y plan verificados siempre en el servidor (RevenueCat → webhook
  → `subscriptions`).
- **Salud.** `computeGoalPlan` aplica pisos (1200/1500 kcal), ritmo ≤1 %/semana, sin metas con IMC
  < 18,5, sin déficit para menores, y advertencias claras. La app no diagnostica ni reemplaza a un
  profesional.

## 5. Variables de entorno

Todas documentadas en [`.env.example`](.env.example). Regla de oro: lo que empieza con
`EXPO_PUBLIC_` termina dentro del APK, así que **nunca** es un secreto. `ANTHROPIC_API_KEY`,
`USDA_FDC_API_KEY`, `REVENUECAT_WEBHOOK_SECRET` y `SUPABASE_SERVICE_ROLE_KEY` viven solo como
secretos de Supabase (`pnpm exec supabase secrets set --env-file .env`).

## 6. Builds

```bash
cd apps/mobile
eas build -p android --profile demo         # APK demo (mocks), para mostrar sin backend
eas build -p android --profile preview      # APK interno contra el backend real
eas build -p all --profile production       # AAB para Play + IPA para App Store
```

Sin cuenta de Expo, el APK se puede compilar localmente (ver [docs/TESTERS.md](docs/TESTERS.md)).
El paso a paso para publicar está en [docs/RELEASE.md](docs/RELEASE.md).
