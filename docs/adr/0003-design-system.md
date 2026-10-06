# ADR 0003 — Design system propio sobre tokens

- Estado: aceptada · Fecha: 2026-10-04 · valores reemplazados por [ADR 0008](0008-rediseno-bocado.md)

## Decisión

- Tokens en `src/theme/tokens.ts` (paleta, espaciado, radios 8–24, tipografía Inter, duración de
  animaciones) y temas semánticos claro/oscuro en `src/theme/themes.ts`.
- Color primario menta (`#0E8F67` claro / `#34D399` oscuro): contraste ≥ 4.5:1 con su texto.
- Colores fijos por macro: proteína coral, carbohidratos ámbar, grasas violeta, fibra verde,
  agua celeste. Se usan igual en anillos, barras, gráficos y chips.
- Componentes en `src/components` (Button, Card, ProgressRing, MacroBar, Stepper…). Catálogo
  navegable solo en desarrollo en `/dev/components`.
- Preferencia de tema (sistema/claro/oscuro) persistida en SQLite KV (lectura síncrona, sin parpadeo).

## Alternativas

NativeWind/Tamagui: añaden una capa de build y otra API; el alcance del UI no lo justifica.
