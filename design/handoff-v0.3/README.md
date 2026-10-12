# Handoff: Bocado — rediseño «voz primero» (v0.3)

## Resumen

Rediseño completo de Bocado, una app móvil (Android/iOS) para registrar comidas y seguir calorías y macros, pensada para Argentina y Latinoamérica. El cambio principal es que **registrar una comida sea tan fácil como mandar un audio**: el usuario dicta varias comidas en una sola frase («desayuné café con leche y dos medialunas, y a la noche media milanesa con puré»), la IA las separa y estima porciones, y una revisión compacta permite corregir con un toque o hablando.

Incluye: Hoy, escuchando (dos variantes), dictado/texto, analizando, revisión (3 estados), cámara con pista, buscador, onboarding (bienvenida + 11 pasos + premium), diario, progreso, perfil, registrar peso, entrenamiento, suplementos, nuevo suplemento, coach, recordatorios, objetivos, plan de comidas y recetas. Modo oscuro y claro.

## Sobre los archivos

Los archivos en `referencia/` son **referencias de diseño hechas en HTML**: prototipos que muestran el aspecto y el comportamiento esperados, **no código de producción para copiar**. La tarea es **recrear estos diseños en el entorno real de la app** (React Native, Flutter, SwiftUI/Compose, etc.) usando sus patrones y librerías. Si todavía no existe código, elegir el framework más adecuado (sugerido: React Native + Expo, por ser una sola base para Android/iOS).

Para verlos: abrir `referencia/Bocado App.dc.html` (prototipo navegable) o `referencia/Bocado Lienzo.dc.html` (todas las pantallas lado a lado + tokens + componentes) en un navegador, con `support.js` en la misma carpeta. Cada `.dc.html` tiene una plantilla HTML con estilos inline (valores exactos) y una clase `Component` con la lógica y los datos de ejemplo.

## Fidelidad

**Alta fidelidad (hi-fi).** Colores, tipografía, espaciados, radios, textos e interacciones son finales. Recrear con precisión de píxel. Los datos (alimentos, kcal, respuestas del coach) son de ejemplo.

---

## Tokens de diseño

### Colores

| Token           | Oscuro                                 | Claro                   | Uso                                                               |
| --------------- | -------------------------------------- | ----------------------- | ----------------------------------------------------------------- |
| `bg`            | `#111312`                              | `#F4F3EE`               | Fondo de pantalla                                                 |
| `s1`            | `#1B1E1D`                              | `#FFFFFF`               | Tarjetas, inputs, filas                                           |
| `s2`            | `#272B29`                              | `#EAE9E3`               | Chips, botones secundarios, pista de barras, tile de ícono        |
| `line`          | `#2B302D`                              | `#E1DFD7`               | Bordes y separadores                                              |
| `ink`           | `#ECEEE9`                              | `#161918`               | Texto principal **y color de marca / acción primaria**            |
| `ink2`          | `#A9AFAB`                              | `#565D59`               | Texto secundario                                                  |
| `ink3`          | `#7C837F`                              | `#7E8580`               | Texto terciario, íconos apagados, deshabilitado                   |
| `inv`           | `#111312`                              | `#FFFFFF`               | Texto/ícono sobre fondo `ink`                                     |
| `sage`          | `#AFCBB3`                              | `#9CC0A3`               | **Solo calorías** (barra de kcal, barras del gráfico de calorías) |
| `sageText`      | `#AFCBB3`                              | `#3B6A47`               | Texto salvia (si se necesita sobre fondo claro)                   |
| `sageBg`        | `#1E2A22`                              | `#E2EDE3`               | Tarjetas informativas / avisos médicos                            |
| `p` (proteínas) | `#E6927F`                              | `#C5604D`               | Coral                                                             |
| `c` (carbos)    | `#E5C070`                              | `#B3831C`               | Mostaza                                                           |
| `f` (grasas)    | `#95AACD`                              | `#5A76A6`               | Azul grisáceo (también se usa para el agua)                       |
| `warnBg`        | `#2F271A`                              | `#F4E8CF`               | Fondo de avisos (modo demo, notificaciones)                       |
| `warnText`      | `#E9C47A`                              | `#6B4C0F`               | Texto de avisos                                                   |
| `tab`           | `rgba(29,32,31,.94)`                   | `rgba(255,255,255,.96)` | Barra de pestañas (con blur 14px)                                 |
| `scrim`         | gradiente `bg` 0% → `bg` sólido al 28% | ídem                    | Detrás de los pies fijos (Guardar, etc.)                          |

Cámara: siempre oscura, independiente del tema (fondo `#000`, hoja `#151716`, campos `#232726`, botón `#2E3331`, texto `#FFFFFF`/`#E5E7E3`/`#C9CDCA`).

Reglas: la marca es **tinta** (`ink`); los botones primarios son fondo `ink` + texto `inv`. Salvia **solo** para calorías. Lenguaje neutro: nunca rojo de error para «pasarse» del objetivo.

### Tipografía

Familia: **Manrope** (Google Fonts, pesos 400/500/600/700/800). Números siempre con `font-variant-numeric: tabular-nums`.

| Estilo                                          | Tamaño / peso / tracking / interlineado                   |
| ----------------------------------------------- | --------------------------------------------------------- |
| Display kcal (Hoy)                              | 76 / 800 / −0.05em / 0.88                                 |
| Display número (onboarding, peso)               | 76 / 800 / −0.045em / 1                                   |
| Display plan                                    | 68 / 800 / −0.05em / 0.9                                  |
| Título de pantalla principal (Diario, Progreso) | 30 / 800 / −0.03em                                        |
| Título de paso onboarding                       | 30 / 800 / −0.03em / 1.1                                  |
| Bienvenida H1                                   | 36 / 800 / −0.035em / 1.05                                |
| Transcripción en vivo                           | 30 (pantalla completa) o 24 (hoja) / 700 / −0.02em / 1.28 |
| Header «Hoy, domingo 11»                        | 22 / 800 / −0.02em                                        |
| Encabezado de pantalla modal                    | 19 / 800                                                  |
| «¿Qué comiste?»                                 | 19 / 800 / −0.01em                                        |
| Sección («Comidas»)                             | 20 / 800                                                  |
| Nombre de comida en revisión                    | 17 / 800                                                  |
| Título de opción (onboarding)                   | 17 / 800                                                  |
| Fila de alimento                                | 16 / 700                                                  |
| Kcal en fila                                    | 16 / 800 + «kcal» 12 / 600 `ink3`                         |
| Cuerpo                                          | 15–16 / 600, interlineado 1.45                            |
| Secundario                                      | 13–14 / 500–600 `ink2`                                    |
| Etiqueta de sección                             | 12 / 800 / +0.08em / MAYÚSCULAS / `ink3`                  |
| Etiqueta de pestaña                             | 11 / 700                                                  |

### Espaciado

Escala: 4, 6, 8, 10, 12, 14, 16, 20, 24, 28. Margen lateral de pantalla: **20px** (revisión y buscador: 16px). Separación entre bloques en Hoy: 22px; en el resto: 16–18px.

### Radios

10 (segmento interno), 12–14 (tiles de ícono, inputs chicos), 16–18 (inputs, botones secundarios), 20 (botón primario, filas de alimento, tarjetas de comida), 22–24 (tarjetas), 28–30 (barra de voz, tarjetas grandes, barra de pestañas 28), 32 (hoja inferior, arriba), 999 (chips, pills, stepper).

### Sombras

Casi no se usan. Hoja de escucha: `0 -10px 40px rgba(0,0,0,.25)`. Fondo detrás de la hoja: `rgba(0,0,0,.45)`.

### Tamaños táctiles

Mínimo 44px en todos los botones (48dp en Android). Botón primario: alto 56. Micrófono de Hoy: 64. Botón «Listo» al escuchar: 84. Obturador: 80.

### Íconos

**Material Symbols Rounded** (Google Fonts), peso 400, tamaños 16–34. Nombres usados: `mic, photo_camera, keyboard, close, arrow_back, expand_more, expand_less, add, remove, check, check_circle, delete, edit, undo, restart_alt, auto_awesome, local_fire_department, coffee, lunch_dining, dark_mode, local_cafe, icecream, egg_alt, water_drop, monitor_weight, fitness_center, medication, record_voice_over, swap_horiz, search, cancel, barcode_scanner, chat_bubble, flash_off, photo_library, today, calendar_month, trending_up, trending_down, sync_alt, eco, person, repeat, menu_book, edit_square, lock, emoji_events, monitoring, nutrition, flag, forum, event_note, notifications, translate, light_mode, shield, help, logout, info, error, science, desktop_windows, directions_walk, directions_bike, directions_run, monitor_heart, pool, rowing, hiking, sports_gymnastics, bolt, accessibility_new, accessibility, sports_soccer, sports_tennis, sports_basketball, sports_volleyball, sports_hockey, sports_mma, music_note, self_improvement, signal_cellular_alt, wifi, battery_full`.

### Logo

Círculo `sage` con un «mordisco»: círculo del color de fondo, de diámetro 50% del logo, centrado en la esquina superior derecha (desplazado −10px/−10px en un logo de 52px).

---

## Componentes clave

**Barra de voz «¿Qué comiste?»** — `s1`, borde 1px `line`, radio 30, padding 8/8/8/20, fila con gap 8. Izquierda (flex 1, toca → dictado por teclado): «¿Qué comiste?» 19/800 + «Contalo como si mandaras un audio» 13 `ink2` (una línea, elipsis). Botón cámara 48 círculo `s2`. Botón micrófono 64 círculo `ink`, ícono 30 `inv`.

**Fila de alimento (revisión)** — `s1`, radio 20, borde 1.5px `line` (plegada) / `ink` (abierta). Fila: nombre 16/700 + meta 13 `ink2` («1 taza · 250 g»), kcal, chevron `ink3`, botón borrar 44 (`delete`, `ink3`). Abierta (separador 1px `line`, padding 14/16/16, gap 14):

1. Segmentado Chica / Mediana / Grande (contenedor `s2` radio 14 pad 4; botón alto 38 radio 10; activo `ink`/`inv`). Chica = 0,67× gramos base, Grande = 1,47×.
2. Stepper de gramos (pill `s2` alto 44: −, «75 g» 15/800, +; paso = 10% de la porción base redondeado a 5) + texto «P 11 · C 8 · G 13».
3. Si el alimento se cocina: chips de cocción Frita / Al horno / A la plancha / Hervida / Cruda.
4. Link «Cambiar alimento» (`swap_horiz`) → buscador.

**Chips** — alto 40 (44 en onboarding), padding 0 14–16, radio 999, 14/700. Normal `s2` (o `s1` sobre fondo), seleccionado `ink`/`inv`. Variante «agregar» con ícono `add` que pasa a `check` al activarse.

**Tarjeta «Lo de siempre»** — ancho 168, `s1`, radio 22, padding 14, gap 8, borde 1.5px transparente. Ícono+comida 12/700 `ink2`; nombre 15/700 (2 líneas, min-alto 39); fila: «240 kcal» 13 `ink2` + botón 40 círculo `s2` `add`. Agregada: borde `ink`, botón `ink` con `check`. Carrusel horizontal que sangra hasta el borde de pantalla.

**Corregir + Guardar (pie fijo de revisión)** — Pie absoluto abajo, padding 28/16/18, fondo `scrim`, gap 10. Barra: `s1`, borde 1.5px `line`, radio 26, padding 5/5/5/16; input «¿Algo no está bien? Decilo» 15/600; botón 44 círculo: vacío = `mic` en `s2`; con texto = `arrow_upward` en `ink`. Botón Guardar: alto 56, radio 20, `ink`/`inv`, 16/800, ícono `check` + «Guardar 2 comidas · 824 kcal».

**Toggle** — 52×32, radio 999. On: pista `ink`, perilla `bg`. Off: pista `s2`, perilla `ink3`. Perilla 24, top 4, left 4 → 24, transición left .18s.

**Botón primario** — alto 56, radio 20, `ink`/`inv`, 16/800. Deshabilitado: `s2`/`ink3`.

**Header modal** — alto 60, padding 0 8: botón 48 (`close` o `arrow_back`) + título 19/800.

**Barra de pestañas** — absoluta: left/right 12, bottom 12, alto 72, radio 28, fondo `tab` + blur 14, borde 1px `line`, grilla de 5. Pestañas: Hoy (`today`), Diario (`calendar_month`), **micrófono central** (botón 60×60 radio 22 `ink`, ícono `mic` 28 `inv` → escuchando), Progreso (`trending_up`), Perfil (`person`). Ícono 24 + etiqueta 11/700; activa `ink`, inactiva `ink3`. Visible solo en Hoy, Diario, Progreso y Perfil (que llevan padding inferior 120).

---

## Pantallas

Marco: 390×844. Barra de estado 44px (en el prototipo es decorativa; en la app usar la del sistema).

### 03 · Hoy (primer día) / 06 · Hoy (con comidas)

Scroll vertical, padding 6/20/120, gap 22.

1. **Header**: «Buenas noches» 13/600 `ink2` sobre «Hoy, domingo 11 ⌄» 22/800 (toca → selector de fecha). Derecha: pill de racha (alto 44, `s1`, radio 16, `local_fire_department` en `c` + «1»; solo si hay comidas) y botón coach 44 `s1` radio 16 (`auto_awesome` → Coach).
2. **Barra de voz** (ver componentes). Mic → escuchando; cámara → cámara; texto → dictado.
3. **Lo de siempre** (solo con historial): «Lo de siempre» 16/800 + «Un toque y listo» 13 `ink3`; carrusel de tarjetas. Al agregar: se suma a Comidas con animación de entrada, se descuentan kcal y macros.
4. **Resumen**: «Te quedan» 14/700 `ink2` (si se supera: «Por encima del objetivo», mismo estilo, sin rojo); número 76/800 + «kcal» 20/700 `ink2`; barra 10px `s2` con relleno `sage` (transición width .4s); «1.404 consumidas» / «Objetivo 2.150» 13/600.
5. **Macros**: tarjeta `s1` radio 24 padding 16/18, grilla de 3: punto 8px del color + etiqueta 13; «52» 19/800 + «/164 g» 13 `ink3`; mini barra de 5px.
6. **Comidas** (con historial): «Comidas» 20/800 + total. Fila por comida: `s1` radio 20, tile de ícono 44 `s2` radio 14, «Desayuno · 08:30», ítems en una línea con elipsis, kcal 16/800. Debajo: botón punteado (borde 1.5px dashed `line`, radio 20, alto 56) «+ Agregar merienda» con `mic` a la derecha → escuchando.
7. **Sugerencia de proteína**: `s1` radio 24, tile con `egg_alt` en `p`, «Te faltan 112 g de proteína» 16/800 + ideas 14 `ink2`.
8. **Primer día** (en lugar de 3, 6 y 7): tarjeta con borde 1.5px dashed `line`, radio 28, centrada: botón mic 64 radio 22 `s2`, «Registrá tu primera comida» 20/800, «Tocá el micrófono y contá lo que comiste. Podés nombrar varias comidas de una.», dos chips de ejemplo («Un café con leche y dos medialunas», «Un plato hondo de fideos con tuco») → escuchando.
9. **Tiles 2×2** (`s1` radio 24 padding 16): Agua (`water_drop` en `f`, «750 / 2.850 ml», barra en `f`, botón «+ 250 ml» suma 250); Peso («82 kg», «Registrar peso» → peso); Actividad («Sin actividad», «Registrar» → entrenamiento); Suplementos («Sin cargar», «Agregá los tuyos» → suplementos).

Datos de ejemplo: Desayuno 08:30 «Café con leche, 2 medialunas» 411; Almuerzo 13:15 «Tarta de jamón y queso, ensalada» 580; Cena 21:00 «Milanesa de carne, puré de papa» 413. Total 1.404; macros 52/164, 139/223, 71/67. Lo de siempre: Merienda «Mate con 2 tostadas y queso» 240; Merienda «Yogur con granola y banana» 260; Desayuno «Café con leche y 2 medialunas» 411.

### 04a/04b · Escuchando — **dos variantes, configurable**

Opción de producto (en el prototipo es la prop `escucha`: `hoja` por defecto, o `completa`).

- **Hoja inferior (`hoja`)**: Hoy queda visible atrás con un velo `rgba(0,0,0,.45)` (tocarlo cancela). La hoja se ancla abajo, alto según el contenido, fondo `s1`, radio 32 arriba, sombra hacia arriba, entra con `translateY(40px)→0` + opacidad .4→1 en .3s ease-out. Agarradera 40×5 `line`. Transcripción a 24px.
- **Pantalla completa (`completa`)**: ocupa toda la pantalla, fondo `bg`, transcripción a 30px.

Contenido común (de arriba a abajo):

1. Header alto 52: cancelar (`close`) · centro: punto 8px `p` titilando (1.2s) + «Escuchando» + tiempo `0:07` en `ink3` · derecha: pill «ES · AR» (alto 32, `s2`, 12/700).
2. **Transcripción en vivo**: las palabras aparecen de a una (en el prototipo cada 240ms) con un cursor de 3px que titila. Sin texto todavía: «Probá: «desayuné café con leche…»» 15 `ink3`.
3. **Comidas detectadas** en vivo: filas `s2` radio 16 padding 10/12 que entran con `rise` (opacidad 0→1, translateY 8→0, .35s): ícono + «Desayuno» 14/800 + «café con leche, 2 medialunas» 14 `ink2`.
4. Pista: «Usá medidas caseras: «plato hondo», «un puñado», «media»» 13 `ink3` centrado.
5. **Onda de voz**: 30 barras de 4px de ancho, gap 4, alto 18–56px, color `ink` con opacidad variada, animación `scaleY .18 → 1 → .18` ease-in-out infinita, duración 0,7–1,2s y desfase distintos por barra. En producción: conectar a la amplitud real del micrófono.
6. **Controles** (grilla 1fr/auto/1fr, padding 6/32/22): «Escribir» (56 círculo `s2`, `keyboard` → dictado) · **«Listo»** (84 círculo `ink`, `check` 34 `inv`, con anillo de 2px `ink` que pulsa: scale 1→1.55, opacidad .4→0, 1.8s) → analizando · «De nuevo» (56, `restart_alt`, reinicia). Etiquetas 12/700 `ink2`.

### 04c · Dictado / texto

Header «Contá qué comiste» (cerrar → Hoy). Textarea: `s1`, borde 1.5px `line`, radio 24, padding 18, min-alto 168, texto 20/600, interlineado 1.4. Debajo, en vivo: «Vamos a separar» + chips de comidas detectadas por palabras clave (desayun → Desayuno, almorz → Almuerzo, merend → Merienda, cen → Cena). «Ejemplos» 15/800 + 3 chips (rellenan el texto). «Te quedan 5 análisis hoy» 13 `ink3`. Pie: botón 56×56 radio 20 `s2` con `mic` (→ escuchando) + primario «✦ Analizar» (`auto_awesome`) → analizando.

### 04d · Analizando

Padding 20/24. «Analizando…» 28/800, la frase entre comillas 16 `ink2`. Lista de 4 pasos (alto 28, gap 16): «Separando comidas», «Reconociendo alimentos», «Estimando porciones», «Calculando calorías y macros». Estados: hecho = `check_circle` `ink`; actual = spinner 18px (borde 2.5px `line`, borde superior `ink`, giro .8s); pendiente = círculo 20px borde 2px `line` y texto `ink3`. Debajo, 3 esqueletos `s1` radio 18 alto 60 con opacidad .6. Pasa a Revisión al terminar (en el prototipo, a los 2,5s).

### 05 / 05b / 05c · Revisión

Header «Revisá tu comida» + subtítulo «Domingo 11 · 2 comidas» 12/600 `ink2`. Scroll padding 4/16/200, gap 14. Pie fijo (Corregir + Guardar).

1. **Pregunta única** (solo si hay una duda relevante): `s1`, borde 1.5px `ink`, radio 24, padding 16. «¿La milanesa fue frita o al horno?» 17/800 + «Cambia unas 35 kcal» 13 `ink2`; dos botones de igual ancho, alto 48, pill `s2` («Frita», «Al horno»). Al responder: la tarjeta desaparece y se actualiza el alimento.
2. **Corrección por voz aplicada** (05c): tarjeta `s1` que entra con `rise`: `record_voice_over` + «Entendí: «era al horno y sin puré»»; lista de cambios con delta de kcal («Milanesa de carne → al horno −34 kcal», «Puré de papa → quitado −210 kcal»); botón «Deshacer» (`undo`).
3. **Total**: «Total» 14/700 `ink2` + «824» 34/800 + «kcal»; barra apilada de 6px (P/C/G proporcional a kcal de cada macro: P×4, C×4, G×9; gap 3); fila «Proteínas 28 g · Carbos 84 g · Grasas 41 g».
4. **Grupos por comida**: encabezado «Desayuno 08:30 ✎» 17/800 (editable: nombre y hora) + «411 kcal»; filas de alimento (ver componentes). 05b muestra la milanesa abierta.
5. «+ Agregar alimento» → buscador.
6. **«¿Le agregaste algo que no se ve?»**: chips Aceite (1 cda, 119 kcal), Manteca (1 cdita, 36), Mayonesa (1 cda, 94), Chimichurri (1 cda, 70). Al activar se agregan como alimentos a la cena.
7. «Valores estimados. La precisión mejora cuando corregís porciones.» 13 `ink3`.

Datos: Café con leche 1 taza · 250 g · 83 kcal (P6 C9 G3); Medialunas de manteca 2 unidades · 80 g · 328 (P6 C36 G18); Milanesa de carne ½ porción · 75 g: frita 203 (P11 C8 G13), al horno 169 (G9), a la plancha 158, hervida 150, cruda 143; Puré de papa 1 porción · 200 g · 210 (P5 C31 G7). Las kcal y los macros escalan linealmente con los gramos. Guardar → Hoy.

### 10 · Cámara con pista

Siempre oscura. Header: cerrar, pill «Te quedan 3 escaneos hoy» (`rgba(255,255,255,.12)`), `flash_off`. Visor: marco de 300×300 con 4 esquinas en L (40×40, trazo 3px blanco, radio 22). «Encuadrá todo el plato, desde arriba o en 45°» 15/700. Hoja inferior `#151716` radio 28 arriba, padding 16/16/20, gap 12:

- Campo de pista (`#232726` radio 22): `chat_bubble` + input «Contale algo (opcional)» (ej.: «es de pollo, sin aceite») + botón mic 44 para dictar la pista.
- Chips rápidos que se agregan a la pista: «+ Sin aceite», «+ Casero», «+ Porción chica», «+ Compartido».
- Selector de modo (pill `#232726`): Foto / Código / Etiqueta / Voz (activo `#ECEEE9` con texto `#111312`). «Voz» → escuchando.
- Galería (52 radio 16) · obturador 80 (aro 4px blanco, círculo interno `#ECEEE9`) → analizando.

### 15 · Buscador

Header «Agregar a Cena» + escanear código (`barcode_scanner`). Campo de búsqueda alto 52, `s1`, borde 1.5px `line`, radio 18, ícono `search`, placeholder «Buscá entre 1.500 alimentos», botón borrar. Segmentado Buscar / Recientes / Favoritos / Míos (contenedor `s1`; activo con fondo `bg`). Resultados: fila padding 10/12/10/16, borde inferior `line`: tile 40 `s2` radio 12 con el **código de país** («AR», «VE», «CO», «CL», «PE», «MX», «BR») 11/800; nombre 16/700 + «Plato casero · por 100 g» 13; kcal 16/800; botón 44 círculo `s2` `add` → `ink` `check`. Búsqueda sin distinguir acentos ni mayúsculas. Sin resultados: «No encontramos «x»» + «Contalo con la voz y lo estimamos igual.». Pie fijo: «🎤 ¿No está? Decilo con la voz» (`s2`, alto 52) → escuchando.

### Onboarding

Header de paso (alto 60): atrás (48) · barra de progreso 6px (`s2`, relleno `ink`, ancho = paso/12) · «3/12» 13/700. Contenido padding 12/20/24, gap 20. Título 30/800 + subtítulo 16 `ink2`. Pie: primario «Continuar» (deshabilitado hasta elegir en pasos de opciones).

- **01 Bienvenida**: logo 52; «Contá lo que comiste. Bocado hace las cuentas.» 36/800; bajada 16 `ink2`; tarjeta demo (`s1` radio 26): mic 40 `ink` + «Desayuné café con leche y dos medialunas, y a la noche media milanesa con puré», separador, «Desayuno · Café con leche, 2 medialunas 411» y «Cena · ½ milanesa, puré 413»; 3 beneficios con ícono (foto, corregir hablando, objetivos sin culpa); aviso de modo demo (`warnBg`, `science`); «Crear cuenta» (primario), «Ya tengo cuenta» (borde `line`) y «Modo demo» (`s2`) en fila; texto legal 12 con links.
- **Pasos con opciones** (tarjetas `s1` radio 22, min-alto 72, borde 2px transparente → `ink` al elegir, tile de ícono 44 opcional, título 17/800, sub 14, radio 24 a la derecha que se llena con `check`):
  - 1 Objetivo: Bajar de peso / Mantener mi peso / Subir de peso / Ganar músculo / Comer más sano (con subtítulos).
  - 2 Sexo biológico: Femenino / Masculino.
  - 7 Actividad: Sedentario / Poco activo / Moderado / Activo / Muy activo.
  - 8 Ritmo: 0,25 / 0,5 (badge «Recomendado») / 0,75 / 1 kg por semana.
- **3 Nacimiento**: 3 campos Día/Mes/Año (alto 60, radio 18, 22/800 centrado; columnas 1fr 1fr 1.4fr) + «Tenés 34 años.».
- **4 Altura / 5 Peso / 6 Peso objetivo**: segmentado Métrico (kg, cm) / Imperial (lb, ft); tarjeta `s1` radio 28 con número 76/800 + unidad 22/700 `ink2`; botones − / + de 60. En peso objetivo: «6 kg menos que hoy».
- **9 Preferencias**: chips multi (Vegetariano, Vegano, Sin TACC, Sin lactosa, Keto, Bajo en carbohidratos, Pescetariano, Halal, Kosher); «Alergias o intolerancias» con input (Enter agrega) y chips quitables.
- **10 Plan listo**: tarjeta con «2.150 kcal por día», barra `sage`, barra apilada de macros (164 / 223 / 67 g), «Basal 1.739 · Gasto 2.695 kcal · Agua 2.850 ml»; tarjeta «Tu proyección» con línea descendente de 82 a 76 kg en 15 semanas (24 de enero de 2027); aviso médico en `sageBg`. Botón «Empezar».
- **11 Permisos**: tarjetas Micrófono (nuevo, primero), Cámara y Recordatorios con «Permitir» → check; «Tu privacidad» con 2 toggles y «Nunca compartimos tus comidas, audios, fotos ni datos de salud con anunciantes.».
- **12 Premium**: logo + cerrar; «Desbloqueá todo Bocado»; 6 beneficios con check; planes con radio (Anual US$ 39,99 · US$ 3,33/mes · badge «Ahorrá 58 %» · 7 días gratis / Mensual US$ 7,99); nota de renovación que cambia según el plan; CTA «Empezar 7 días gratis» / «Suscribirme»; «Continuar gratis», «Restaurar compras»; aviso demo; legal.

### 07 · Diario

«Diario» 30/800 + pill «Octubre 2026 ⌄» que expande la tira semanal a mes completo. Calendario `s1` radio 24: L M M J V S D; día 38×38 radio 13; seleccionado `ink`/`inv`; días con registro `s2`; futuros y de otros meses `ink3`. Resumen del día: «domingo, 11 de octubre» 18/800; «1.404 / 2.150 kcal» (52/800); barra `sage`; «Te quedaron 746 kcal»; macros en 3 columnas con su color. Tarjetas por sección (Desayuno, Almuerzo, Merienda con botón `repeat`, Cena, Actividad, Suplementos) con botón + 44 y los ítems listados. Botones «Recetas» y «Crear alimento».

### 08 · Progreso

Segmentado 7 días / 30 días 🔒 / 90 días 🔒 (bloqueados → Premium). Peso: «82,0 kg» + «−0,6 kg esta semana», línea de tendencia, «Objetivo 76 kg». Calorías: Promedio diario 1.945 · Días en rango 4 de 7 · Días registrados 7/7; 7 barras `sage` (hoy opacidad 1, el resto .7) con línea punteada del objetivo. Links: Resumen semanal, Logros, Objetivo adaptativo (Premium), Micronutrientes (Premium).

### 09 · Perfil

Avatar 56 radio 18 + «Modo demo» / «Plan gratis · 1 día de racha». Tarjeta «Análisis con IA hoy 2 / 5» con barra + «Pasate a Premium» (primario `ink`; ya no salvia). Grupos: Objetivos y datos (Objetivos, Peso 82 kg, Logros, Mis recetas, Entrenamiento, Suplementos), Premium (con candado), Ajustes (Recordatorios, Idioma «Español (AR)», **Apariencia Oscuro/Claro**, Privacidad, Ayuda). «Cerrar sesión», «Versión 0.3.0».

### Secundarias

- **11 Registrar peso**: número 76/800 con ± 0,1 kg, consejo de pesarse en ayunas, últimos registros con borrar, Guardar.
- **12 Entrenamiento**: atajo de voz («Decilo: «45 minutos de pesas, intensidad media»»), selector de actividad desplegable por categorías (Cardio, Fuerza, Deportes, Cuerpo y mente), duración ±5 min, intensidad Suave/Moderada/Intensa, esfuerzo 1–10, tarjeta de kcal estimadas. kcal = MET × 82 kg × horas × factor de intensidad (0,8 / 1 / 1,35) × 0,75 (solo el gasto extra). Guardar muestra las kcal.
- **13 Suplementos (vacío)** y **20 Nuevo suplemento**: nombre + sugerencias, dosis + unidades, días L–D, horario, toggles «Recordarme a ese horario» y «Aporta calorías», aviso de que Bocado no recomienda suplementos.
- **14 Coach**: aviso en `sageBg`, «Plan gratis: tenés 1 mensaje de prueba.», 3 sugerencias; burbujas (usuario `ink` radio 20/20/6/20; coach `s1` radio 20/20/20/6); «El coach está escribiendo…»; barra inferior con cámara, input y botón que es mic (vacío) o enviar (con texto).
- **16 Recordatorios**: aviso + «Activar notificaciones»; Comidas (Desayuno 08:30, Almuerzo 13:00, Merienda, Cena 21:00, Recordatorio inteligente); Otros (Actividad, Agua, Pesaje semanal, Resumen semanal).
- **17 Objetivos**: kcal calculadas = P×4 + C×4 + G×9 (2.150 por defecto); chips de objetivo y de actividad; steppers de macros.
- **18 Plan de comidas**: bloqueado (Premium) + aviso médico. **19 Recetas**: vacío + «Nueva receta».

---

## Interacciones y comportamiento

- **Navegación**: Hoy → mic → Escuchando → Listo → Analizando → Revisión → Guardar → Hoy. Escuchando → Escribir → Dictado → Analizar. Cámara → obturador → Analizando. El micrófono central de la barra de pestañas siempre abre Escuchando.
- **Voz**: transcripción en streaming; detectar comidas y alimentos mientras se habla; aceptar medidas caseras («plato hondo», «puñado», «media»); varias comidas en un solo dictado.
- **Corregir hablando** en Revisión: texto o voz libre se interpreta como cambios sobre la lista; mostrar el resumen de cambios con deltas y permitir Deshacer.
- **Una sola pregunta** por revisión, solo cuando cambia el resultado de forma relevante, con respuestas de un toque.
- **Animaciones**: `rise` .35s ease-out (elementos nuevos); hoja .3s ease-out; barra de kcal width .4s; agua .3s; toggles left .18s; anillo del micrófono 1.8s; cursor 1s steps; respetar «reducir movimiento» del sistema.
- **Tono**: voseo rioplatense, cálido y sin culpa («te quedan», nunca «te pasaste»). Preparar textos para inglés y portugués.
- **Accesibilidad**: etiquetas para lector de pantalla en todos los botones de solo ícono (están como `aria-label` en las referencias), `aria-pressed`/`aria-checked` en chips y toggles, contraste AA.

## Estado

- Global: tema (oscuro/claro/sistema), variante de escucha (`hoja` | `completa`), objetivo diario (kcal y macros), día seleccionado, comidas registradas (comida, hora, alimentos con gramos, cocción, kcal y macros), agua del día, peso, plan (gratis/premium) y análisis restantes.
- Escuchando: transcripción parcial, comidas detectadas, tiempo transcurrido.
- Revisión (borrador): alimentos agrupados por comida, alimento abierto, respuesta a la pregunta, extras agregados, alimentos quitados, texto de corrección, último cambio (para deshacer).
- Datos: endpoint de análisis (texto/audio/foto + pista → comidas con alimentos y una pregunta opcional), endpoint de corrección (borrador + frase → borrador nuevo + lista de cambios), búsqueda en la base regional (~1.500 alimentos con país y categoría).

## Archivos

- `referencia/Bocado App.dc.html` — contenedor del prototipo: marco, navegación, barra de pestañas, tema, variante de escucha. Contiene los tokens de color en CSS (`[data-bt=dark]` / `[data-bt=light]`).
- `referencia/Bocado Registro.dc.html` — Hoy, Escuchando (dos variantes), Dictado, Analizando, Revisión, Cámara, Buscador.
- `referencia/Bocado Onboarding.dc.html` — Bienvenida, 11 pasos y Premium.
- `referencia/Bocado Secciones.dc.html` — Diario, Progreso, Perfil y pantallas secundarias.
- `referencia/Bocado Lienzo.dc.html` — vista general con tokens, componentes y todas las pantallas.
- `referencia/support.js` — runtime necesario para abrir los `.dc.html` en el navegador (no es parte del diseño).
