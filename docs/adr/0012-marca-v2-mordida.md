# 0012 — Marca v2: logo «mordida», widgets y atajos del ícono

## Contexto

Llegó un handoff de marca (`design/handoff-marca/README.md`):

- **Logo nuevo:** un círculo con una mordida grande y cuatro marcas de dientes, definido por un único `path`.
- **Activos finales:** íconos, splash, notificación y avatar.
- **Sistema de marca:** colores, tono y mensajes aprobados.
- **Funcionalidad:** widgets «Un click y lo anoto» y atajos del ícono.

Las referencias HTML reproducen las pantallas actuales con el logo nuevo aplicado. No hubo
rediseño de pantallas.

## Decisión

- **`AppLogo`** dibuja el `path` oficial (`BOCADO_SYMBOL_PATH`) en lugar de la máscara de dos
  círculos, que el handoff marca como obsoleta. Va en salvia sobre papel y en salvia clara en
  oscuro. En bienvenida mide 52 px; en Premium, 40 px.
- **Íconos:**
  - Ícono adaptativo Android: fondo salvia `#9CC0A3` con el símbolo tinta al 48 de 108 dp, más el
    monocromo (Android 13+).
  - iOS: el `icon-1024` del handoff.
  - Splash: papel `#F4F3EE` y oscuro `#111312` con el símbolo salvia.
  - Notificación: silueta blanca, color salvia.
  - Los PNG se generan desde los SVG del handoff y viven en `apps/mobile/assets/images`. Los
    originales quedan en `design/marca`.
- **Widgets:**
  - «Hoy» abre con la línea de marca: símbolo, «Bocado» y «Te quedan».
  - «¿Qué comiste?» (antes «Hablar») es la pieza tinta con el micrófono en salvia. Con 2×2 muestra
    la pregunta; con 1×1 queda solo el micrófono.
  - «Lo de siempre» y «Agua» siguen como estaban: son más completos que la versión chica del
    handoff.
- **Atajos del ícono (Android):** se declaran estáticos en `shortcuts.xml` con el plugin
  `plugins/withAndroidShortcuts.js`. Son cuatro: Dictar, Sacar foto, +250 ml de agua y Repetir lo
  de siempre.
  - Cada uno abre `bocado://shortcut/<id>`.
  - Dictar y foto llevan a su pantalla.
  - Agua y «lo de siempre» se registran solos y la app vuelve a Hoy con un aviso. Android exige
    abrir una actividad para un atajo, así que la app se ve un instante.

## Pendiente

- iOS: atajos (`UIApplicationShortcutItems`), widgets y App Intents, cuando se haga la versión
  iOS.
- Imágenes de vista previa de widgets (`assets/widgets/*.png`) y el gráfico destacado de Play.
  Hay que rehacerlas con el logo nuevo antes de publicar en la tienda.
