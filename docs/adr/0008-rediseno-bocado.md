# ADR 0008 — Rediseño y cambio de marca: Bocado

- Estado: aceptada · Fecha: 2026-10-07

## Contexto

El dueño del producto rediseñó la app en Claude Design a partir del kit exportado de la versión
0.1.0 ("Plato"). El kit nuevo (`design/`) conserva los nombres de tokens, así que el cambio es de
valores, no de estructura.

## Decisión

- **Marca:** Bocado. Isotipo = un plato con un mordisco (`AppLogo`, dibujado con
  `react-native-svg` a partir de `design/marca/logo-isotipo.svg`). Nombre, slug y esquema de
  deep links `bocado://`; identificador `com.bocadoapp.bocado` (la app todavía no estaba
  publicada, así que se pudo cambiar). Los nombres internos del código (`@plato/shared`, claves de
  almacenamiento) se mantienen porque no los ve nadie y renombrarlos no aporta.
- **Tokens:** `src/theme/tokens.ts` y `themes.ts` toman los valores de `design/tokens/tokens.json`.
  Fuente **Manrope** (400–800). Nuevo estilo tipográfico `numberHero` (64/64).
- **La marca es tinta, el color es dato:** el botón primario es tinta (casi negro en claro, casi
  blanco en oscuro). El salvia (`kcal`, `accent`) solo marca calorías y éxito. Macros fijos:
  proteína arcilla, carbos trigo, grasas pizarra.
- **Componentes:** tarjetas sin borde ni sombra (radio 22); chips en píldora; opciones y planes
  seleccionados con borde tinta; confianza de IA como punto + texto; íconos Ionicons outline
  (filled si están activos); tab bar flotante oscura, solo íconos, con botón central salvia.
- **Hoy:** el anillo se reemplaza por el número de kcal restantes grande con una barra fina; macros
  en tres filas; lista de comidas como tarjetas por tipo de comida; estado vacío dedicado. El selector
  de semana queda detrás del título (chevron).

## Consecuencias

- Los APK anteriores (`com.platoapp.plato`) se instalan como otra app; hay que desinstalarlos.
- Las URLs de redirección de Supabase Auth pasan a `bocado://…` (`supabase/config.toml`).
- Pantallas secundarias heredan el estilo por tokens/componentes; los ajustes finos por pantalla
  se hacen comparando con `design/diseno/*.dc.html`.
