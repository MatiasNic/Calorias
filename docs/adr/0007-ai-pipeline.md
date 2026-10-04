# ADR 0007 — Pipeline de IA: Edge Functions + Claude con salida estructurada

- Estado: aceptada · Fecha: 2026-10-04

## Decisiones

- **La clave de Anthropic vive solo en Supabase** (secret). La app sube la foto comprimida al bucket
  privado `meal-photos/<user_id>/…` y llama a `analyze-meal` con el JWT del usuario.
- Orden de guardas en servidor: JWT → validación Zod → carpeta propia → rate limit (12/min) →
  dedup por SHA-256 (no consume cuota) → presupuesto diario (`AI_DAILY_BUDGET_USD`) → cuota atómica
  (`consume_quota`) → IA → enriquecimiento → registro en `ai_scans` (tokens, costo, latencia).
  Si la IA falla (timeout, JSON inválido, rechazo) **se devuelve la cuota** (`refund_quota`).
  "No es comida" tampoco consume cuota.
- **Modelos** (verificados 2026-10-04): gratis `claude-haiku-4-5` ($1/$5 por MTok), premium
  `claude-sonnet-5-5` ($2/$10, `effort: low` para latencia < 8 s). Configurables con
  `AI_MODEL_FREE` / `AI_MODEL_PREMIUM` sin tocar la app.
- **Salida estructurada** con `output_config.format` (JSON Schema generado desde el mismo Zod de
  `packages/shared`) vía SDK oficial (`npm:@anthropic-ai/sdk`) y re-validada con Zod. No usamos
  `tool_choice` forzado porque Sonnet 5.5 lo rechaza.
- **Rechazos** (`stop_reason: refusal`): un reintento con el modelo económico; si persiste → 502.
- **Abstracción `AIProvider`** (`_shared/ai/types.ts`): `AnthropicProvider` y `MockProvider`
  (`AI_MOCK=true`). Los handlers reciben dependencias inyectadas (`ServerDeps`) → testeables con
  Vitest sin red (`supabase/functions/_shared/test`).
- **Enriquecimiento híbrido** (`_shared/enrich.ts`): tabla regional → USDA (cacheado en
  `food_cache`) → estimación de la IA. Un valor de base de datos solo reemplaza la estimación si es
  plausible (kcal/100 g dentro de 0,55–1,8× regional, 0,65–1,5× USDA) para evitar emparejamientos
  absurdos. La fuente queda registrada en cada ítem.
- **Feedback loop**: "Reportar error" guarda original vs. corregido en `ai_feedback`.
- **Modo demo**: los mismos contratos con fixtures deterministas de `packages/shared/src/mocks`,
  incluida la emulación de cuota diaria para probar el paywall.

## Consecuencias

Latencia típica: subida (~150 KB) + 2–6 s de modelo. Prompt de sistema estable para aprovechar
caché cuando supere el mínimo cacheable del modelo.
