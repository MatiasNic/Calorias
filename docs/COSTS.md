# Costos de IA y márgenes

Precios de API Anthropic (primera parte) verificados el **2026-10-04**. Actualizar junto con
`supabase/functions/_shared/ai/cost.ts`.

| Modelo              | Uso                                 | Input $/MTok | Output $/MTok |
| ------------------- | ----------------------------------- | ------------ | ------------- |
| `claude-haiku-4-5`  | Plan gratis (foto, texto, etiqueta) | 1,00         | 5,00          |
| `claude-sonnet-5-5` | Premium (foto, texto, coach, plan)  | 2,00         | 10,00         |

## Tokens por operación (estimados)

La app redimensiona la foto a ≤ 1024 px y JPEG 0,7 → ~1.000–1.100 tokens de imagen (≈ ancho×alto/750).

| Operación            | Input  | Output | Haiku 4.5      | Sonnet 5.5 (effort low)* |
| -------------------- | ------ | ------ | -------------- | ------------------------ |
| Foto de comida       | ~1.800 | ~400   | **US$ 0,0038** | **US$ 0,0106**           |
| Texto / voz          | ~900   | ~350   | US$ 0,0027     | US$ 0,0075               |
| Etiqueta nutricional | ~1.700 | ~250   | US$ 0,0030     | US$ 0,0084               |
| Mensaje del coach    | ~1.500 | ~400   | —              | US$ 0,0100               |
| Plan semanal         | ~1.500 | ~4.000 | —              | US$ 0,0430               |

\* Sonnet 5.5 piensa de forma adaptativa: se suman ~200–400 tokens de salida por pedido.
El costo real de cada llamada se registra en `ai_scans.cost_usd`; usá
`select date_trunc('day', created_at), kind, sum(cost_usd), avg(latency_ms) from ai_scans group by 1,2`.

## Margen por plan

**Gratis** (máx. 3 fotos + 5 textos/día): peor caso US$ 0,025/día ≈ **US$ 0,75/mes**; uso típico
(~1 foto/día, 20 días/mes) ≈ **US$ 0,08/mes**. Es el costo de adquisición del modelo freemium.

**Premium** (tope técnico 50 fotos/día):

| Perfil  | Fotos/día | Coach/día | Costo IA/mes |
| ------- | --------- | --------- | ------------ |
| Liviano | 2         | 1         | ~US$ 0,95    |
| Típico  | 4         | 2         | ~US$ 1,90    |
| Intenso | 10        | 5         | ~US$ 4,70    |

Ingreso neto (después de 15 % de comisión de tienda, programas para pequeñas empresas):
anual US$ 39,99 → **US$ 2,83/mes**; mensual US$ 7,99 → **US$ 6,79/mes**.
→ El anual es rentable para usuarios liviano/típico; los intensivos se compensan con el promedio.
Palancas si el margen se achica: usar Haiku también para texto en premium, bajar el tope de
fotos/día, precios regionales, o `scan_pack_30` para usuarios gratis.

## Controles implementados

- Compresión en el dispositivo, deduplicación por hash (no se cobra ni se vuelve a llamar a la IA).
- Cuotas atómicas en servidor; reintegro automático si la IA falla o la foto no es comida.
- Rate limit por usuario (12/min IA, 60/min búsquedas).
- `AI_DAILY_BUDGET_USD`: al superarlo se pausa la IA para usuarios gratis (premium hasta 1,5×) y
  se envía una alerta a `AI_ALERT_WEBHOOK_URL` (Slack/Discord/etc.).
- Configurá además un **límite de gasto mensual** en la consola de Anthropic.
