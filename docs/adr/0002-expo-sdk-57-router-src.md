# ADR 0002 — Expo SDK 57, Expo Router en `src/app`

- Estado: aceptada · Fecha: 2026-10-04

## Contexto

Versiones estables verificadas en npm el 2026-10-04: `expo@57.0.26` (SDK 57), `react-native@0.86`,
`react@19.2.3`, `expo-router@57`, TypeScript 6.0 (fijado por Expo). El prompt de referencia
mencionaba SDK 56 / RN 0.85+; usamos la última estable compatible.

## Decisión

- Expo con CNG (sin carpetas `android/` / `ios/` versionadas) + development builds (`expo-dev-client`).
- Rutas en `apps/mobile/src/app/` (convención del template SDK 57) en lugar de `apps/mobile/app/`.
  Los grupos `(auth)`, `(onboarding)`, `(tabs)`, `(modals)` se mantienen como en la especificación.
- Tabs con `expo-router/js-tabs` (barra personalizada con botón central "Escanear").
- React Compiler habilitado (`experiments.reactCompiler`).
