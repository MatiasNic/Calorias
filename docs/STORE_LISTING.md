# Ficha de tienda (ASO)

Marca: **Bocado** (siempre en minúscula en el logo) · eslogan: _Lo que comés, sin vueltas._
Antes de publicar, verificá que el nombre esté libre en ambas tiendas y registralo como marca
(INPI en Argentina). Recursos de marca en [`design/marca`](../design/marca): ícono 1024 px,
ícono adaptativo, splash y **gráfico destacado de Play 1024×500**
(`feature-graphic-1024x500.png`).

## Español (es-AR / es-419) — idioma principal

**Título (30):** `Bocado: contador de calorías IA`

**Subtítulo iOS (30):** `Sacale foto y sabé qué comés`

**Descripción corta Play (80):**
`Sacale una foto a tu comida y la IA calcula calorías, proteínas y más en segundos.`

**Palabras clave iOS (100, sin espacios):**
`calorias,dieta,macros,proteinas,nutricion,bajar,peso,comida,foto,diario,ayuno,saludable,contador`

**Descripción larga:**

```
¿Cuántas calorías tiene esa milanesa con puré? Sacale una foto y en segundos Bocado te lo dice.

📸 FOTO → CALORÍAS
La inteligencia artificial reconoce cada alimento del plato, estima la porción en gramos y calcula
calorías, proteínas, carbohidratos, grasas y fibra. Vos revisás y ajustás antes de guardar.

🧉 HECHO PARA COMIDA DE ACÁ
Más de 200 comidas típicas cargadas: empanadas, milanesas, asado, ñoquis, locro, medialunas,
alfajores, mate… con porciones reales, no tazas y onzas.

⚡ REGISTRÁ COMO QUIERAS
• Foto del plato
• Código de barras de productos envasados
• Foto de la tabla nutricional
• Texto o voz: "dos empanadas de carne y una coca zero"
• Buscador con favoritos, recientes y comidas guardadas

🎯 OBJETIVOS A TU MEDIDA
Bajar, mantener o subir de peso con un plan calculado para vos y límites seguros. Sin dietas
extremas.

📈 TU PROGRESO, CLARO
Peso con tendencia, calorías y macros por semana, rachas, logros y un resumen semanal con ideas
concretas.

✨ PLATO PREMIUM
Escaneos ilimitados (uso justo), modelo de IA más preciso, coach nutricional, plan de comidas,
micronutrientes, historial y gráficos completos. Probalo 7 días gratis con el plan anual.

🔒 TUS DATOS SON TUYOS
Sin publicidad. Las fotos se borran después del análisis. Exportá o eliminá tu cuenta cuando
quieras. Funciona sin conexión.

Bocado no reemplaza el consejo de un profesional de la salud. Las estimaciones pueden tener
errores; siempre podés corregirlas.
```

## English (en-US)

**Title:** `Bocado: AI Calorie Counter` · **Subtitle:** `Snap your meal, know your macros`

**Short description:** `Snap a photo of your meal and AI counts calories, protein and more in seconds.`

**Keywords:** `calorie,counter,macro,protein,diet,food,photo,tracker,weight,loss,nutrition,meal,ai,scan`

**Long description:** translate the Spanish text, replacing the regional section with "Knows
Latin American food — empanadas, milanesas, arepas, feijoada… plus millions of products by
barcode."

## Português (pt-BR)

**Título:** `Bocado: contador de calorias IA` · **Descrição curta:**
`Tire uma foto da refeição e a IA calcula calorias, proteínas e mais em segundos.`

## Capturas (6-8, 1080×2340 Android / 1290×2796 iPhone 6,9")

1. Cámara sobre un plato real — "Sacale una foto"
2. Revisión con alimentos y gramos — "La IA reconoce cada alimento"
3. Hoy con anillo de calorías y macros — "Tu día de un vistazo"
4. Texto/voz — "O decilo con tus palabras"
5. Progreso de peso con tendencia — "Mirá tu progreso real"
6. Comidas regionales en el buscador — "Comida de acá"
7. Coach — "Tu coach nutricional" (Premium)
8. Paywall/beneficios — "7 días gratis"

Cómo generarlas: build `demo` en un emulador limpio, onboarding con datos de ejemplo, registrar
3-4 días de comidas en modo demo y capturar con `adb exec-out screencap -p > shot.png` (o
`maestro test` + `takeScreenshot`). Enmarcar con texto en Figma/Canva. Para el ícono final y
feature graphic (1024×500) conviene un diseñador; el ícono actual es provisorio.

## Cuenta demo para revisión de tiendas

Creá en producción `review@<tu-dominio>` con contraseña fuerte, onboarding completo, Premium
otorgado manualmente:

```sql
insert into public.subscriptions (user_id, entitlement, product_id, platform, status, expires_at)
values ('<uuid>', 'premium', 'premium_annual', 'promotional', 'active', now() + interval '1 year');
```

Alternativa recomendada: otorgarle un entitlement promocional desde el dashboard de RevenueCat
(Customer → Grant entitlement), que además dispara el webhook y actualiza la tabla sola. Cargá las credenciales en "App
access" (Play) y "Sign-In Information" (App Store).

## Categoría y clasificación

- Categoría: **Salud y bienestar** (Play) / **Health & Fitness** (iOS); secundaria Food & Drink.
- Clasificación: todo público en contenido; público objetivo 18+ (recomendado).
- Precio: gratis con compras integradas.
