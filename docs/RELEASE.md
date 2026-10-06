# Release — de cero a las tiendas

Guía paso a paso para conectar servicios reales y publicar Bocado. Seguila en orden. Las casillas
son el checklist de lanzamiento (sección 11 del brief).

> Valores de identidad (cambialos en `.env` antes del primer build si querés otro nombre):
> `APP_NAME=Bocado`, `APP_BUNDLE_ID=com.bocadoapp.bocado`, esquema de deep links `bocado://`.
> El `package`/`bundleIdentifier` **no se puede cambiar** una vez publicado.

---

## 0. Cuentas que tenés que crear (dueño del proyecto)

| #   | Servicio                        | Para qué                                   | Costo aprox.              | Qué tenés que obtener                                                    |
| --- | ------------------------------- | ------------------------------------------ | ------------------------- | ------------------------------------------------------------------------ |
| 1   | **Supabase** (plan Pro)         | Auth, base, fotos, Edge Functions          | USD 25/mes                | Project ref, URL, anon key, service role key, DB password                |
| 2   | **Anthropic Console**           | IA de visión y coach                       | Por uso (ver COSTS.md)    | `ANTHROPIC_API_KEY` + límite de gasto mensual configurado                |
| 3   | **USDA FoodData Central**       | Datos nutricionales de respaldo            | Gratis                    | `USDA_FDC_API_KEY` (api.data.gov)                                        |
| 4   | **Expo / EAS**                  | Builds en la nube, OTA updates, submit     | Gratis / USD 19+/mes      | `EXPO_TOKEN`, `EAS_PROJECT_ID`                                           |
| 5   | **Google Play Console**         | Publicar en Android                        | USD 25 única vez          | Cuenta de desarrollador verificada, service account JSON para submit     |
| 6   | **Apple Developer Program**     | Publicar en iOS                            | USD 99/año                | Team ID, App Store Connect app, clave de API (.p8) para submit           |
| 7   | **RevenueCat**                  | Suscripciones y compras                    | Gratis hasta USD 2,5k/mes | API keys públicas Android/iOS, secreto del webhook                       |
| 8   | **Google Cloud (OAuth)**        | "Continuar con Google"                     | Gratis                    | Web client ID + secret (para Supabase), Android client (SHA-1)           |
| 9   | **Apple Sign in**               | "Continuar con Apple" (obligatorio en iOS) | Incluido en #6            | Services ID, Key ID, clave .p8 → secreto JWT para Supabase               |
| 10  | **Sentry** (opcional)           | Errores y crashes                          | Gratis (Developer)        | DSN, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`                 |
| 11  | **PostHog** (opcional)          | Analytics de producto (opt-in)             | Gratis hasta 1M eventos   | Project API key, host (US/EU)                                            |
| 12  | **Dominio + web**               | Política de privacidad, términos, soporte  | ~USD 15/año               | URLs públicas para `EXPO_PUBLIC_PRIVACY_URL` / `TERMS_URL`, mail soporte |
| 13  | **Nutricionista matriculado/a** | Revisión de textos y salvaguardas          | Honorarios                | Firma/aval de la revisión (ver §8)                                       |

---

## 1. Supabase (producción)

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <REF>
pnpm exec supabase db push                       # aplica supabase/migrations
psql "$PROD_DB_URL" -f supabase/seed/01_foods_regional.sql   # seed de alimentos (una vez)
pnpm exec supabase functions deploy              # despliega las 10 Edge Functions
pnpm exec supabase secrets set --env-file .env.production.server
```

`.env.production.server` (no se commitea) contiene: `ANTHROPIC_API_KEY`, `AI_MODEL_FREE`,
`AI_MODEL_PREMIUM`, `AI_DAILY_BUDGET_USD`, `AI_ALERT_WEBHOOK_URL`, `USDA_FDC_API_KEY`,
`REVENUECAT_WEBHOOK_SECRET`, `AI_MOCK=false`. (`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya los
inyecta Supabase en las funciones.)

En el dashboard:

- [ ] **Auth → URL configuration:** Site URL `bocado://`, Redirect URLs `bocado://auth/callback`,
      `bocado://auth/reset-password`.
- [ ] **Auth → Email:** confirmación de email activada; SMTP propio (Resend, Postmark, SES) — el
      SMTP de Supabase tiene límite de pocos mails por hora. Plantillas en español.
- [ ] **Auth → Providers:** Google (client ID/secret web; agregá también el client ID de Android
      en "Authorized Client IDs") y Apple (Services ID + secreto JWT).
- [ ] **Auth → Rate limits** y **CAPTCHA** (hCaptcha/Turnstile) para registro.
- [ ] **Storage:** verificar que `meal-photos` y `progress-photos` sean **privados** (los crea la
      migración).
- [ ] **Database → Backups:** PITR activado (plan Pro).
- [ ] Correr `select * from pg_tables where schemaname='public' and not rowsecurity;` → debe
      devolver 0 filas.

## 2. Anthropic

- [ ] Crear organización y API key de producción (una key separada para staging).
- [ ] **Configurar límite de gasto mensual** en la consola (además del `AI_DAILY_BUDGET_USD`
      del servidor, que corta el servicio si se supera el presupuesto diario).
- [ ] Opcional: `AI_ALERT_WEBHOOK_URL` = webhook de Slack/Discord para alertas de presupuesto.
- [ ] Revisar [COSTS.md](COSTS.md) y ajustar cuotas en `packages/shared/src/plans.ts` si hace falta.

## 3. Tiendas y productos

Productos (mismos IDs en ambas tiendas, ya definidos en `packages/shared/src/plans.ts`):

| ID                | Tipo                       | Precio base USD | Notas                                  |
| ----------------- | -------------------------- | --------------- | -------------------------------------- |
| `premium_monthly` | Suscripción auto-renovable | 7,99            | Grupo "Premium"                        |
| `premium_annual`  | Suscripción auto-renovable | 39,99           | Prueba gratis de 7 días (oferta intro) |
| `premium_weekly`  | Suscripción auto-renovable | 3,99            | **No activar** al lanzar               |
| `scan_pack_30`    | Consumible                 | 1,99            | 30 escaneos extra                      |

Usá precios por país (Play/App Store sugieren equivalentes; en Argentina conviene revisar a mano).

### Google Play

- [ ] Crear la app en Play Console (`com.bocadoapp.bocado`), completar ficha con
      [STORE_LISTING.md](STORE_LISTING.md).
- [ ] **Play App Signing** activado; subir el primer AAB (`eas build -p android --profile
production`) a la pista **Prueba interna**.
- [ ] Crear los productos y la suscripción con planes base + oferta de prueba de 7 días en el anual.
- [ ] **Data safety**, **clasificación de contenido**, **público objetivo** (18+ recomendado,
      mínimo 13), **declaración de apps de salud** — respuestas en [PRIVACY.md](PRIVACY.md).
- [ ] **Health Connect:** si activás `EXPO_PUBLIC_FEATURE_HEALTH=true`, completar el formulario
      de permisos de Health Connect (peso, pasos, calorías activas) con la justificación.
- [ ] **Cuentas personales nuevas:** Google exige **prueba cerrada con ≥ 12 testers durante 14
      días continuos** antes de pedir acceso a producción. Planificalo: invitá 15-20 personas por
      lista de emails o Google Group y pediles que usen la app de verdad (guía en
      [TESTERS.md](TESTERS.md)).
- [ ] Service account con acceso a la API de Play → JSON para `eas submit` (se carga en EAS, no en
      el repo).
- [ ] Agregar los SHA-1 (de Play App Signing y de upload) al client OAuth de Android en Google Cloud.

### App Store

- [ ] Registrar el bundle ID con capacidades **Sign in with Apple**, **HealthKit** (si se usa) y
      **In-App Purchase**.
- [ ] Crear la app en App Store Connect; poner su ID en `apps/mobile/eas.json` →
      `submit.production.ios.ascAppId`.
- [ ] Crear el grupo de suscripción "Premium" con los productos de arriba; oferta introductoria
      de 7 días gratis en el anual. Completar metadatos de revisión de cada producto (captura del
      paywall).
- [ ] **App Privacy** (etiquetas nutricionales) — respuestas en [PRIVACY.md](PRIVACY.md).
- [ ] Cuenta demo para el revisor (ver STORE_LISTING) y nota: "La función principal requiere
      fotografiar comida; se puede usar una foto de la galería".
- [ ] La guía 5.1.1(v) exige **borrar cuenta desde la app** → ya implementado en Perfil →
      Privacidad → Eliminar cuenta.
- [ ] Guía 3.1.2: el paywall muestra precio, período, renovación automática, cómo cancelar,
      términos y privacidad, y "Restaurar compras". ✔
- [ ] TestFlight con testers internos antes de enviar a revisión.

## 4. RevenueCat

- [ ] Crear proyecto, apps Android (con service account JSON de Play) e iOS (con clave In-App
      Purchase .p8 / shared secret).
- [ ] Importar los 4 productos; crear el **entitlement `premium`** con monthly/annual/weekly.
- [ ] Offering **`default`** con paquetes `$rc_monthly`, `$rc_annual` (y `$rc_weekly` sin mostrar).
- [ ] **Webhook:** URL `https://<REF>.supabase.co/functions/v1/revenuecat-webhook`,
      header Authorization = `Bearer <REVENUECAT_WEBHOOK_SECRET>` (mismo valor que el secreto de
      Supabase). Probar con "Send test event" → la función responde 200.
- [ ] Copiar las API keys **públicas** a EAS: `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`,
      `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.
- [ ] El app user ID de RevenueCat es el `user.id` de Supabase (lo hace la app al iniciar sesión).

## 5. EAS (builds y variables)

```bash
npm i -g eas-cli && eas login
cd apps/mobile && eas init                      # crea el proyecto → copiá el ID a EAS_PROJECT_ID
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://<REF>.supabase.co --visibility plaintext
# repetir para EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_REVENUECAT_*, EXPO_PUBLIC_SENTRY_DSN,
# EXPO_PUBLIC_POSTHOG_*, EXPO_PUBLIC_USE_MOCKS=false, EXPO_PUBLIC_*_URL, APP_NAME, APP_BUNDLE_ID,
# EAS_PROJECT_ID; y SENTRY_AUTH_TOKEN como "secret" (solo para subir sourcemaps)
eas build -p android --profile production
eas build -p ios --profile production           # EAS gestiona certificados y provisioning
eas submit -p android --profile production      # va a "internal" como borrador
eas submit -p ios --profile production
```

Perfiles (`apps/mobile/eas.json`): `development` (dev client), `demo` (APK con mocks),
`preview` (APK interno contra backend real), `production` (AAB/IPA, versión autoincremental).
`targetSdkVersion` 36 configurado vía `expo-build-properties`.

Para CI: guardá `EXPO_TOKEN` como secreto del repo en GitHub si querés builds automáticos.

## 6. Observabilidad

- [ ] Sentry: crear proyecto React Native → DSN a `EXPO_PUBLIC_SENTRY_DSN`; `SENTRY_ORG`,
      `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` en EAS para sourcemaps, y en `eas.json` → perfil
      `production` agregá `"env": { "SENTRY_DISABLE_AUTO_UPLOAD": "false" }` (por defecto la subida
      está desactivada para que los builds no fallen sin token). Sentry solo se activa si el
      usuario acepta el diagnóstico (opt-in).
- [ ] PostHog: key + host (EU si priorizás GDPR). También opt-in; nunca se envían fotos, comidas
      ni pesos, solo eventos de uso.
- [ ] Alerta por presupuesto de IA (`AI_ALERT_WEBHOOK_URL`) y monitor de la tabla `ai_scans`
      (tasa de error, latencia, costo/día).

## 7. Legal

- [ ] Publicar política de privacidad y términos (borradores en [PRIVACY.md](PRIVACY.md)) en tu
      dominio y actualizar `EXPO_PUBLIC_PRIVACY_URL` / `EXPO_PUBLIC_TERMS_URL`.
- [ ] Revisión por abogado/a: Ley 25.326 (Argentina, inscripción de base en la AAIP), LGPD
      (Brasil), GDPR si apuntás a UE. Los datos de salud son **sensibles**: consentimiento
      explícito (ya se pide en el onboarding).
- [ ] Si cambiás los textos legales, subí `LEGAL_VERSION` en `src/config/env.ts` para volver a
      pedir aceptación.

## 8. Revisión de nutricionista (obligatoria antes de producción)

Pedile a un/a nutricionista matriculado/a que revise y firme:

- [ ] Fórmulas y salvaguardas de `packages/shared/src/nutrition/` (Mifflin-St Jeor, pisos
      1200/1500 kcal, ritmo máximo, IMC objetivo mínimo, menores, embarazo/lactancia).
- [ ] Textos de onboarding, advertencias, coach (prompt en `supabase/functions/_shared/ai/prompts.ts`)
      y el mensaje ante patrones restrictivos.
- [ ] Los 229 alimentos regionales (`scripts/data/foods_regional_source.py`) — valores y porciones.
- [ ] Disclaimers ("no reemplaza consejo profesional", "las estimaciones de IA pueden tener error").

## 9. Checklist final antes de "Enviar a revisión"

- [ ] CI verde (lint, typecheck, tests, RLS, deno check).
- [ ] Probar en dispositivos reales: Android gama baja (Android 8+, 2-3 GB RAM) y iPhone viejo.
- [ ] Flujos Maestro (`apps/mobile/.maestro`) pasando sobre el build `preview`.
- [ ] Compra real en sandbox (Play: licencia de prueba; iOS: sandbox tester) + restaurar + cancelar + webhook refleja estado en `subscriptions`.
- [ ] Eliminar cuenta borra todo (datos + fotos) y exportar datos descarga el JSON.
- [ ] Modo offline: registrar sin conexión, volver a conectar, verificar sync.
- [ ] Capturas y textos de la ficha en es/en/pt.
- [ ] Monitores de costo y errores funcionando; límite de gasto en Anthropic configurado.
- [ ] Versión en `app.config.ts` (`version`) actualizada; changelog.

## 10. Después del lanzamiento

- OTA updates de JS: `eas update --channel production` (solo cambios sin código nativo; respeta
  `runtimeVersion`).
- Revisar semanalmente: costo de IA por usuario activo, conversión del paywall, tasa de
  "la IA se equivocó" (`ai_feedback`), crashes.
- Ajustar modelos con `AI_MODEL_FREE` / `AI_MODEL_PREMIUM` sin publicar una versión nueva.
