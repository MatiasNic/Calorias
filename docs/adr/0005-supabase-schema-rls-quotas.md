# ADR 0005 — Esquema Supabase, RLS y cuotas atómicas en servidor

- Estado: aceptada · Fecha: 2026-10-04

## Decisiones

- **RLS en todas las tablas** de `public`. Las tablas del usuario usan `user_id = (select auth.uid())`
  (subselect para que Postgres lo evalúe una vez por consulta). Tablas de servidor
  (`food_cache`, `revenuecat_events`, `rate_limits`) no tienen políticas → solo `service_role`.
- `subscriptions`, `usage_quotas`, `user_credits`, `ai_scans` son **solo lectura** para el cliente:
  nadie puede darse premium o cuota desde la app. El plan se resuelve con `plan_for(uid)`.
- **Cuotas**: `consume_quota()` (security definer, solo `service_role`) bloquea la fila del día con
  `FOR UPDATE` → dos requests simultáneos no pueden superar el límite. Si la IA falla,
  `refund_quota()` devuelve la unidad (al usuario no se le cobra un error). El día es la fecha
  local del usuario (zona horaria del perfil). Límites: `packages/shared/src/plans.ts`.
- `upsert_meal(jsonb)` reemplaza comida + ítems en una transacción (lo usa el motor de sync).
  Los totales de `meals` los recalcula un trigger desde `meal_items` → los totales siempre cuadran.
- `recent_foods` lo mantiene un trigger en servidor.
- Borrado de cuenta: todas las FKs a `auth.users` son `ON DELETE CASCADE`; `audit_events` no tiene FK
  para conservar el registro del borrado.
- Fotos: buckets privados `meal-photos` y `progress-photos`, objetos en `<user_id>/...`, acceso solo
  del dueño; la app usa URLs firmadas de corta duración.

## Pruebas

`pnpm test:db` aplica migraciones + seed sobre Postgres 16 (en CI: contenedor de servicio; local:
cluster temporal) con stubs mínimos de `auth`/`storage`, y ejecuta `supabase/tests/rls/rls.test.mjs`
(aislamiento entre usuarios, RPCs de servicio, cuotas concurrentes, cascada de borrado, búsqueda).
