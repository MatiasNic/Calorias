# Bocado: kit de rediseño (para Claude Code)

Reemplaza la estética de "Plato". Misma arquitectura, mismos nombres de tokens: es un cambio de valores, no de estructura.

## Contenido

| Ruta                                                                        | Qué es                                                                                                                                   |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens/tokens.json`                                                        | Paleta, colores semánticos claro/oscuro, tipografía, radios, espaciado, duraciones. **Mismas claves** que el tema original               |
| `tokens/tokens.css`                                                         | Lo mismo como variables CSS (referencia)                                                                                                 |
| `marca/icon.png`                                                            | Ícono de app 1024×1024, sin transparencia                                                                                                |
| `marca/android-icon-foreground.png` / `-background.png` / `-monochrome.png` | Ícono adaptativo Android 432×432                                                                                                         |
| `marca/splash-icon.png` / `splash-icon-dark.png`                            | Splash claro / oscuro                                                                                                                    |
| `marca/favicon.png`                                                         | Favicon web                                                                                                                              |
| `marca/feature-graphic-1024x500.png`                                        | Gráfico destacado Play Store                                                                                                             |
| `marca/*.svg`                                                               | Isotipo, isotipo claro, logo horizontal, ícono (vectoriales, para `AppLogo`)                                                             |
| `diseno/Bocado Kit.dc.html`                                                 | Hoja de marca + pantallas clave (01, 06, 15, 23, 26, 30, 34, 36, 51)                                                                     |
| `diseno/Bocado Pantallas 1–4 *.dc.html`                                     | Resto de las 61 pantallas, claro y oscuro: 1 entrada/onboarding, 2 registro/diario, 3 progreso/premium, 4 recetas/coach/ajustes/catálogo |

## Tareas para aplicar

1. **Tema:** reemplazar los valores de `palette`, `lightTheme.colors`, `darkTheme.colors`, `typography`, `radii` en el archivo de tema por los de `tokens/tokens.json`. No renombrar claves.
2. **Fuente:** cambiar a **Manrope** (`@expo-google-fonts/manrope`: 400, 500, 600, 700, 800). Los nombres de `fontFamily` en tokens ya apuntan a `Manrope_*`. Quitar la fuente anterior.
3. **Marca:** copiar `marca/*.png` sobre `assets/` (mismos roles que los provisorios). En `app.json`: `name` y `slug` → "Bocado", splash `backgroundColor` claro `#F2F2EE`, oscuro `#121413`; adaptive icon `backgroundColor` `#F2F2EE`.
4. **AppLogo:** usar `logo-isotipo.svg` (tinta) / `logo-isotipo-claro.svg` (modo oscuro) vía react-native-svg.
5. **Textos:** reemplazar "Plato" por "Bocado" en `es.ts`, `en.ts`, `pt.ts` y en los textos de tienda. Revisar que no queden menciones.

## Cambios de comportamiento visual

- **Botón primario = tinta** (`primary`: `#1F2B27` claro / `#E9ECE6` oscuro, texto `onPrimary`). El verde salvia ya no es color de acción.
- **Salvia (`kcal`, `accent`) solo para calorías** y estados de éxito.
- **Macros** (fijos en toda la app): proteína arcilla `protein`, carbohidratos trigo `carbs`, grasas pizarra `fat`, fibra oliva `fiber`, agua `water`.
- **Hoy:** el anillo de kcal se reemplaza por el número de kcal restantes grande (`numberHero`, 64/64, -3) con una barra de progreso fina debajo (alto 8, radio `pill`, pista `ringTrack`, relleno `kcal`). Macros como 3 barras horizontales debajo.
- **Tab bar:** fondo `tabBar` (tinta en claro, `#252927` en oscuro), ítem activo en `onPrimary`.
- **Tarjetas:** sin borde ni sombra, fondo `surface` sobre `background`, radio `xxl` (22).
- **Chips:** píldora, fondo `surfaceAlt`; seleccionado = `primary` / `onPrimary`.
- **Confianza IA:** `confidenceHigh/Medium/Low` como punto + texto, no como fondo.

## Reglas

- Claro y oscuro para todo; nunca colores sueltos fuera de tokens.
- Área táctil mínima 48 (`MIN_TOUCH`). Contraste de texto AA (4,5:1).
- Tono: cercano, rioplatense, sin culpa (se mantiene).

## Cómo abrir los diseños

Abrir cualquier `.dc.html` de `diseno/` en el navegador (necesita `support.js` en la misma carpeta e internet para Manrope e Ionicons). Cada pantalla lleva su número del inventario original en el título.
