# ADR 0004 — Datos offline-first: SQLite local + outbox hacia Supabase

- Estado: aceptada · Fecha: 2026-10-04

## Contexto

Requisitos: cola offline, modo invitado con datos locales que se migran al crear cuenta, modo
demo sin backend, y arranque rápido.

## Decisión

- La app **lee siempre** de SQLite local (`expo-sqlite`). TanStack Query cachea esas lecturas.
- Toda escritura del usuario se guarda localmente y se encola en `outbox`. El motor de sync
  (`src/services/sync`) empuja el outbox cuando hay sesión y conexión, y trae cambios remotos por
  `updated_at` (borrados lógicos con `deleted_at`).
- Los IDs son UUID generados en el cliente → escrituras idempotentes (upsert).
- Modo invitado / demo = mismo almacenamiento, sin sync. Al crear cuenta se asigna `user_id` a las
  filas locales y se marcan para subir.
- Llamadas que requieren servidor (IA, código de barras, búsqueda USDA, coach) usan TanStack Query
  directo contra Edge Functions; si no hay red se informa al usuario con opción de reintentar.

## Consecuencias

Más código en el cliente (repositorios + sync), a cambio de UX instantánea y robustez sin red.
Conflictos: last-write-wins por `updated_at` (aceptable: datos de un solo usuario).
