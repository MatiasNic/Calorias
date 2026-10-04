# ADR 0006 — Gráficos propios con react-native-svg (en lugar de victory-native/Skia)

- Estado: aceptada · Fecha: 2026-10-04

## Contexto

La especificación sugiere `victory-native` (requiere `@shopify/react-native-skia`). Necesitamos:
anillo de calorías, barras por día, línea de peso con tendencia y proyección.

## Decisión

Componentes propios sobre `react-native-svg` + Reanimated (`src/components/charts`). Skia agrega
~6–8 MB por ABI al APK, una dependencia nativa más que compilar y fuentes cargadas aparte para los
ejes. Los 4 tipos de gráfico que usamos son simples, y con SVG heredan el tema, la accesibilidad
(`accessibilityLabel` con el resumen de datos) y el modo oscuro sin trabajo extra.

## Revisión

Si se necesitan gráficos interactivos complejos (zoom, pan, miles de puntos), reevaluar
`victory-native` v42+.
