# Guía para testers

## Instalar el APK (Android 8 o superior)

1. Descargá el archivo `bocado-*.apk` que te compartieron (Drive, WhatsApp, link de EAS).
2. Abrilo desde el teléfono. Android va a pedir permiso para **instalar apps desconocidas** desde
   ese origen (Chrome, Archivos, WhatsApp…): Ajustes → Permitir de esta fuente → volver → Instalar.
3. Si Play Protect avisa "app no reconocida", tocá **Más detalles → Instalar de todos modos** (es
   normal en builds de prueba firmadas fuera de Play).
4. Para actualizar, instalá el APK nuevo encima: tus datos se mantienen. Si aparece "conflicto
   de paquete", desinstalá la versión anterior (en el APK demo los datos son solo locales).

> Cuando la app esté en **prueba cerrada de Google Play**, no hace falta el APK: aceptá la
> invitación en el link de "Unirse a la prueba" con tu cuenta de Google y descargala desde Play.
> Google exige que **al menos 12 testers la tengan instalada durante 14 días seguidos**: no la
> desinstales y abrila varias veces por semana.

## APK de demo vs. APK de prueba

- **Demo** (`bocado-demo-*.apk`): no necesita internet ni cuenta. La IA, las compras y la nube
  están **simuladas**: el escaneo devuelve uno de varios platos de ejemplo según la foto, y "comprar
  Premium" no cobra nada. Sirve para probar navegación, diseño, textos y flujos.
- **Preview** (`bocado-preview-*.apk`): conectado al backend real con IA real y compras de prueba
  (sandbox, no cobran).

## Qué probar (≈ 20 minutos)

1. **Onboarding:** elegí un objetivo, completá tus datos y mirá el plan propuesto. ¿Se entiende?
   Probá valores extremos (edad 16, meta muy baja): la app debe advertirte y no proponer algo
   inseguro.
2. **Escanear un plato:** botón central → foto de tu comida (o elegí una de la galería) → revisá
   los alimentos, cambiá gramos, borrá o agregá uno → Guardar.
3. **Texto o voz:** "dos empanadas de carne y una coca zero".
4. **Código de barras:** escaneá un producto envasado (en la demo se busca en Open Food Facts si
   hay internet; sin conexión probá el código de ejemplo abriendo
   `bocado://scan?mode=barcode&code=7790000000017`).
5. **Buscador:** buscá "milanesa", "mate", "medialuna"; probá favoritos y crear un alimento propio.
6. **Diario y progreso:** cargá tu peso, agua; revisá el calendario y los gráficos.
7. **Plan gratis:** hacé 4 escaneos con foto en el día → al cuarto debe aparecer el aviso de
   límite y la opción Premium.
8. **Premium:** abrí el paywall, "comprá" (demo/sandbox), probá el coach y el plan de comidas;
   después **Restaurar compras**.
9. **Sin conexión:** activá modo avión, registrá una comida, volvé a conectar.
10. **Ajustes:** idioma (es/en/pt), modo oscuro, recordatorios, exportar datos y eliminar cuenta.

## Cómo reportar

Por cada problema mandá: qué hiciste, qué esperabas, qué pasó, captura o video, modelo de teléfono
y versión de Android (Ajustes → Acerca del teléfono) y la versión de la app (al pie de la pestaña Perfil).
Si la IA se equivocó con un plato, usá **"Reportar error"** en la pantalla de revisión: nos llega
con el contexto.

---

## Para el equipo: compilar el APK localmente (sin EAS)

Requiere JDK 17+, Android SDK (platform 36, build-tools 36) y ~10 GB libres.

```bash
pnpm install
cd apps/mobile
EXPO_PUBLIC_USE_MOCKS=true npx expo prebuild -p android --clean
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
cd android && SENTRY_DISABLE_AUTO_UPLOAD=true ./gradlew assembleRelease            # arquitecturas: -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
# → android/app/build/outputs/apk/release/app-release.apk
```

El build `release` local queda firmado con la **clave de debug** de Android (solo para pruebas;
Play no la acepta). Para producción usá `eas build --profile production`, que gestiona la clave
de subida, o generá un keystore propio (`keytool -genkeypair -v -keystore upload.jks -alias upload
-keyalg RSA -keysize 2048 -validity 10000`) y guardalo **fuera del repo** con backup: si se pierde,
no se pueden publicar actualizaciones (con Play App Signing se puede pedir un reset).
