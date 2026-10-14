# Handoff: Bocado — nueva marca (logo «mordida») + widgets y atajos

## Resumen

Este paquete complementa `design_handoff_bocado_voz` (rediseño de pantallas). Contiene:

1. **El nuevo logo**: el símbolo pasa de «círculo con un mordisco liso» a **círculo con una mordida grande y 4 ondas (marcas de dientes)**. Hay que reemplazarlo en el ícono de la app, splash, notificaciones, onboarding, premium y en cualquier otro lugar donde aparezca.
2. **Sistema de marca**: colores, tipografía, tono y reglas, para que todo lo nuevo sea coherente.
3. **Funcionalidad nueva**: widgets de pantalla de inicio/bloqueo y atajos del ícono («Un click y lo anoto»).

## Sobre los archivos

- `assets/` son **archivos finales listos para usar** (SVG y PNG). Se copian tal cual al proyecto.
- `referencia/` son **referencias de diseño en HTML**, no código de producción. Recrearlas en el stack real de la app (React Native/Expo, Flutter, nativo…). Para verlas: abrir el `.dc.html` en un navegador con `support.js` (y `deck-stage.js` para las presentaciones) en la misma carpeta.

## Fidelidad

**Alta.** Formas, colores, medidas y textos son finales.

---

## 1. Logo

### Geometría del símbolo (viewBox 0 0 100 100, D = 100)

```
M52.50 0.06A50 50 0 1 0 99.94 47.50A11.07 11.07 0 0 1 80.76 45.74A11.07 11.07 0 0 1 64.39 35.61A11.07 11.07 0 0 1 54.26 19.24A11.07 11.07 0 0 1 52.50 0.06Z
```

- Plato: círculo Ø D.
- Mordida: círculo de radio 0,42 D con centro en (0,94 D; 0,06 D), arriba a la derecha.
- Dientes: 4 ondas convexas de radio ≈ 0,11 D repartidas sobre el borde de la mordida.
- **Usar siempre este path**; no redibujar ni reemplazar por un círculo con otro círculo encima (el método anterior con `overflow:hidden` + círculo del color de fondo queda obsoleto: falla sobre fondos con imagen o degradado).

### Versiones de color

| Versión      | Símbolo                               | Fondo                       |
| ------------ | ------------------------------------- | --------------------------- |
| Principal    | Salvia `#9CC0A3`                      | Papel `#F4F3EE` o blanco    |
| Sobre salvia | Tinta `#161918`                       | Salvia                      |
| Sobre oscuro | Salvia oscuro `#AFCBB3` (o `#9CC0A3`) | Tinta `#161918` / `#111312` |
| Monocromo    | Tinta o blanco                        | Cualquiera con contraste    |

### Logo horizontal

Símbolo + «Bocado» en Manrope ExtraBold (800), tracking −0,04 em. Altura del texto ≈ 0,86 × alto del símbolo; separación símbolo–texto = 0,28 × alto del símbolo; texto alineado al centro óptico del símbolo. En los SVG el texto usa la fuente Manrope: **antes de producción, convertir el texto a curvas** (o renderizar a PNG) para no depender de la fuente instalada.

### Reglas

- Área de resguardo: 0,5 D alrededor del símbolo.
- Tamaño mínimo: símbolo 16 px (5 mm impreso); logo horizontal 80 px de ancho (20 mm).
- No rotar, deformar, cambiar colores, agregar sombras, contornos ni degradados.

---

## 2. Dónde reemplazar el logo en la app

| Lugar                       | Archivo                                                             | Notas                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Ícono iOS                   | `assets/icono-app/ios/bocado-icono-ios-1024.svg` y `png/icon-*.png` | Fondo salvia a sangre, símbolo tinta al 50 % del lado, centrado. Sin esquinas redondeadas (las pone iOS).                             |
| Ícono iOS oscuro (iOS 18+)  | `bocado-icono-ios-oscuro-1024.svg`                                  | Fondo `#111312`, símbolo `#AFCBB3`.                                                                                                   |
| Ícono iOS tintado (iOS 18+) | `bocado-icono-ios-tintado-1024.svg`                                 | Escala de grises: símbolo blanco sobre negro.                                                                                         |
| Ícono adaptativo Android    | `android/ic_launcher_background.svg` + `ic_launcher_foreground.svg` | Lienzo 108 dp; símbolo de 48 dp centrado (dentro de la zona segura de 66 dp). Convertir a VectorDrawable.                             |
| Ícono temático Android 13+  | `android/ic_launcher_monochrome.svg`                                | Mismo encuadre que el foreground.                                                                                                     |
| Ícono legacy Android        | `android/png/mipmap-*/ic_launcher.png`                              | 48 a 192 px.                                                                                                                          |
| Google Play                 | `android/png/play-store-512.png`                                    | 512×512.                                                                                                                              |
| Splash / launch screen      | `splash/bocado-splash-claro.svg` y `-oscuro.svg`                    | Fondo papel (claro) o `#111312` (oscuro); símbolo ⅓ del ancho del lienzo. Para el Splash API de Android usar el foreground del ícono. |
| Notificaciones (Android)    | `notificacion/ic_stat_bocado.svg`                                   | Silueta blanca 24 dp, sin color (el sistema la tiñe).                                                                                 |
| Bienvenida (onboarding)     | —                                                                   | Símbolo 52 px salvia sobre fondo de la pantalla.                                                                                      |
| Premium                     | —                                                                   | Símbolo 40 px salvia.                                                                                                                 |
| Widgets                     | —                                                                   | Símbolo 16 px junto al nombre «Bocado» (ver 4).                                                                                       |
| Avatar de redes             | `assets/redes/bocado-avatar-1080.png`                               | Fondo salvia, símbolo tinta al 44 % (recorte circular seguro).                                                                        |

En `referencia/Bocado Onboarding.dc.html` ya está aplicado el logo nuevo (bienvenida y premium); usarlo como guía.

---

## 3. Sistema de marca (resumen)

### Colores

| Nombre       | Claro     | Oscuro (app)      | Uso                                |
| ------------ | --------- | ----------------- | ---------------------------------- |
| Salvia       | `#9CC0A3` | `#AFCBB3`         | Marca, calorías, fondo de piezas   |
| Tinta        | `#161918` | `#ECEEE9` (texto) | Texto y acción primaria            |
| Papel        | `#F4F3EE` | `#111312` (fondo) | Fondo base                         |
| Salvia clara | `#E2EDE3` | `#1E2A22`         | Fondos suaves, avisos informativos |
| Coral        | `#C5604D` | `#E6927F`         | Proteínas                          |
| Mostaza      | `#E5C070` | `#E5C070`         | Carbos                             |
| Azul         | `#5A76A6` | `#95AACD`         | Grasas, agua                       |

Los tokens completos de UI (superficies, líneas, textos 2 y 3) están en el README de `design_handoff_bocado_voz` y en `referencia/Bocado App.dc.html` (`[data-bt=dark]` / `[data-bt=light]`).

### Tipografía

**Manrope** (Google Fonts, licencia OFL). ExtraBold 800 para títulos y números (tracking −0,04 a −0,065 em, interlineado 0,86–1,05). 500–700 para texto. Números con `tabular-nums`.

### Tono

Voseo rioplatense, primera persona de la app en mensajes de marca («Un click y lo anoto»), cálido y sin culpa. Nunca «te pasaste», nunca comidas «buenas/malas», nunca promesas de kilos. Detalle completo en `referencia/Bocado Marca v2.dc.html` (capítulo 03 Lenguaje).

### Mensajes aprobados

- «Comé. Decilo. Listo.» (principal)
- «Un click y lo anoto.» (widgets y atajos)
- «Nadie pesa la milanesa.» (porciones caseras)
- «Una frase. Varias comidas.» (voz)
- «Platos. Bebidas. Envasados. Y lo que cocinás vos.» + «Los envasados los leo del código de barras. Lo casero, contámelo.»
- «Comé tranquilo.»
- «¿Qué comiste hoy?» (cierre / CTA)

---

## 4. Nuevo: widgets y atajos («Un click y lo anoto»)

Referencia visual: `referencia/Bocado Presentación C - Manifiesto.dc.html`, slide 5 (versión clara, widgets sueltos) y `Bocado Presentación D - Producto.dc.html`, slide 5 (dentro de una pantalla de inicio).

Todos los widgets usan Manrope, radio 28, sombra suave `0 12px 32px rgba(22,25,24,.12)` (solo en piezas de marketing; en el sistema la pone el SO).

### 4.1 Widget mediano · «Te quedan» (iOS systemMedium / Android 4×2)

- Fondo blanco (claro) / `#1B1E1D` (oscuro). Padding 18/18/18/20.
- Izquierda: símbolo 16 px salvia + «Bocado» 13/800 · «Te quedan» 13/600 `#565D59` · «746» 36/800 (−0,04 em) + «kcal» 15 · barra 6 px (`#EAE9E3`, relleno salvia, % consumido).
- Derecha, columna con gap 10: botón 58 px círculo tinta con `mic` → abre la app en **Escuchando**; botón 58 px `#EAE9E3` con `photo_camera` → abre **Cámara**.
- Se actualiza al guardar una comida.

### 4.2 Widget chico · «¿Qué comiste?» (systemSmall / 2×2)

- Fondo tinta `#161918`, texto papel. Padding 16.
- Arriba: círculo 72 px salvia con `mic` 36 px tinta. Abajo: «¿Qué comiste?» 19/800.
- Todo el widget → **Escuchando** (deep link `bocado://escuchar`).

### 4.3 Widget chico · «Lo de siempre» (systemSmall / 2×2)

- Fondo salvia, texto tinta. Padding 16.
- «LO DE SIEMPRE» 11/800 +0,06 em · nombre de la comida más repetida para la franja horaria actual 16/800 (máx. 2 líneas) · fila: «240 kcal» 13/700 + botón 40 px tinta con `add`.
- El botón **registra directamente** sin abrir la app (iOS: App Intent interactivo; Android: `PendingIntent` a un receiver). Al registrar, el ícono pasa a `check` 2 s.
- Si no hay historial: «Registrá tu primera comida» y el botón abre Escuchando.

### 4.4 Pantalla de bloqueo (iOS accessoryCircular / accessoryRectangular)

- Circular: `mic` 32 px sobre fondo translúcido del sistema → Escuchando.
- Rectangular: «746 kcal restantes» 15/800 + barra 5 px.
- Monocromos: el sistema los tiñe; no usar salvia.

### 4.5 Atajos del ícono (mantener presionado)

iOS `UIApplicationShortcutItems` / Android `shortcuts.xml` (estáticos), en este orden:

1. `mic` · **Dictar comida** → `bocado://escuchar`
2. `photo_camera` · **Sacar foto** → `bocado://camara`
3. `water_drop` · **Sumar 250 ml de agua** → acción directa, sin abrir la app (toast «Listo, +250 ml»)
4. `repeat` · **Repetir lo de siempre** → registra la comida habitual de la franja actual y muestra confirmación

También exponerlos como **Siri Shortcuts / App Intents** y **Google Assistant App Actions** («Oye Siri, anotá en Bocado…»).

### 4.6 Estado y datos

- Compartir con los widgets (App Group en iOS / `SharedPreferences` o Glance state en Android): kcal objetivo, kcal consumidas, comida «de siempre» por franja (desayuno, almuerzo, merienda, cena) con nombre y kcal, agua del día.
- Refrescar el timeline del widget al guardar comida, al cambiar de día y al cambiar el objetivo.
- Deep links: `bocado://escuchar`, `bocado://camara`, `bocado://hoy`.

---

## 5. Lector de código de barras (destacado en la comunicación)

Ya existe en el buscador (`barcode_scanner`) y en la cámara (modo «Código»). La comunicación ahora lo destaca («Los envasados los leo del código de barras»): asegurar que sea accesible en ≤ 2 toques desde Hoy (cámara → «Código») y que el resultado vaya directo a Revisión con la porción del envase.

---

## Archivos

```
assets/
  simbolo/   salvia, tinta, papel, salvia-oscuro (SVG) + png/ 512 px
  logo/      horizontal tinta, papel y monocromo (SVG; convertir texto a curvas)
  icono-app/
    ios/      1024 claro, oscuro, tintado (SVG) + png/ 1024…40
    android/  adaptive background/foreground/monochrome (SVG 108 dp), png/mipmap-*, play-store-512
  splash/    claro y oscuro
  notificacion/ ic_stat_bocado.svg
  redes/     avatar 1080
referencia/
  Bocado Marca v2.dc.html            manual de marca completo (5 capítulos)
  Bocado Manual G - Sistema.dc.html  especificaciones técnicas (construcción, color con RGB/CMYK, escalas)
  Bocado Presentación C - Manifiesto.dc.html  piezas de comunicación + widgets (slide 5)
  Bocado Presentación D - Producto.dc.html    widgets dentro de pantalla de inicio (slide 5)
  Bocado App / Registro / Onboarding / Secciones .dc.html  app con el logo nuevo aplicado
  support.js, deck-stage.js          necesarios solo para abrir las referencias
```

CMYK del manual G es aproximado: validar con la imprenta antes de imprimir.
