# Pendientes que necesitan al dueño del proyecto

Todo lo demás del plan de mejoras está hecho (ver `docs/adr/0010-auditoria-seguridad-0-5.md`).
Estas tareas requieren cuentas, contraseñas o un celular, así que no se pueden automatizar.

## 1. Firma propia del APK (importante, ~15 min)

Hoy el APK de prueba se firma con la clave de debug, que es pública.

1. En tu computadora (con Java instalado):
   ```bash
   keytool -genkeypair -v -keystore bocado.keystore -alias bocado \
     -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 bocado.keystore > bocado.keystore.b64   # en macOS: base64 -i bocado.keystore
   ```
2. GitHub → repo → Settings → Secrets and variables → Actions → New repository secret:
   - `ANDROID_KEYSTORE_BASE64`: el contenido de `bocado.keystore.b64`
   - `ANDROID_KEYSTORE_PASSWORD`: la contraseña del keystore
   - `ANDROID_KEY_ALIAS`: `bocado`
   - `ANDROID_KEY_PASSWORD`: la contraseña de la clave (la misma si no pusiste otra)
3. Guardá `bocado.keystore` y las contraseñas en un lugar seguro (gestor de contraseñas + copia).
   **Si se pierde, no se pueden publicar actualizaciones.** Nunca lo subas al repo ni lo pegues
   en un chat.
4. El próximo APK sale firmado con esa clave. Como la firma cambia, hay que **desinstalar una vez**
   la versión anterior. Antes, abrí la app con conexión para que se sincronice todo.

## 2. Probar el APK achicado (R8, ~10 min)

Descargá `bocado-real-<versión>-min.apk` del último release y probá:

- [ ] Widgets: agua (+250, deshacer) y "Lo de siempre" (+)
- [ ] Paywall y "Restaurar compras"
- [ ] Cámara, foto de comida y código de barras
- [ ] Conectar Health Connect (Perfil → Salud)
- [ ] Dictado por voz (botón central)

Si todo anda, avisá y queda como opción por defecto. Si algo falla, decí qué pantalla.

## 3. Panel de Supabase → Authentication (~5 min)

- [ ] Largo mínimo de contraseña: **8**
- [ ] Activar **leaked password protection**
- [ ] URL configuration: dejar `bocado://auth/callback` y `bocado://auth/reset-password`;
      **sacar `exp://**`** si está

## 4. Opcionales

- **Compras de prueba:** mientras pruebes compras con cuentas de tester de Play, agregá el secreto
  `REVENUECAT_ACCEPT_SANDBOX` = `true` y corré el deploy del backend. Sacalo (o poné `false`) antes
  de publicar.
- **Errores legibles en Sentry:** crear un token en Sentry (Settings → Auth Tokens) y guardarlo
  como secreto `SENTRY_AUTH_TOKEN`, más `SENTRY_ORG` y `SENTRY_PROJECT`. Con eso los errores
  muestran el código original en vez del minificado.
- **Fase 5 (tiendas):** cuenta de Google Play Console y de Apple Developer cuando decidas publicar.
