# Privacidad, términos y formularios de las tiendas

> **Borradores.** Deben ser revisados por un/a abogado/a antes de publicarse (Ley 25.326 de
> Argentina, LGPD de Brasil y, si aplica, GDPR). Reemplazá `[TITULAR]`, `[DOMICILIO]`, `[EMAIL]`
> y `[FECHA]`. Publicalos en tu dominio y apuntá `EXPO_PUBLIC_PRIVACY_URL` y
> `EXPO_PUBLIC_TERMS_URL` a esas páginas. Si cambian, subí `LEGAL_VERSION`
> (`apps/mobile/src/config/env.ts`) para que la app pida aceptarlos de nuevo.

## Inventario de datos (fuente de verdad para los formularios)

| Dato                                          | Dónde se guarda                                                                             | Para qué                 | ¿Se comparte?                                            | Opcional                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------- | --------------------------- |
| Email, nombre, ID de usuario                  | Supabase Auth                                                                               | Cuenta, inicio de sesión | No                                                       | Sí (modo invitado)          |
| Edad, sexo, altura, peso, objetivo, actividad | Teléfono + Supabase (`profiles`, `goals`)                                                   | Calcular metas           | No                                                       | No (para usar la app)       |
| Comidas, agua, peso, medidas                  | Teléfono + Supabase                                                                         | Diario y progreso        | No                                                       | —                           |
| Fotos de comidas                              | Storage privado; **se borran tras el análisis** salvo que el usuario active "guardar fotos" | Analizar el plato        | Se envían a Anthropic (procesador) solo para el análisis | Sí                          |
| Texto/voz de comidas, preguntas al coach      | Supabase (`ai_scans`) — sin audio, solo texto                                               | Analizar/responder       | Anthropic (procesador)                                   | Sí                          |
| Datos de Health Connect / HealthKit           | Solo lectura en el teléfono; el peso se guarda en el diario                                 | Ajustar metas            | No                                                       | Sí, desactivado por defecto |
| Compras / estado de suscripción               | RevenueCat + Supabase (`subscriptions`)                                                     | Habilitar Premium        | RevenueCat, Google, Apple (procesadores)                 | —                           |
| Diagnóstico de errores                        | Sentry                                                                                      | Corregir fallas          | Sentry (procesador)                                      | Sí, opt-in                  |
| Eventos de uso (sin comidas, pesos ni fotos)  | PostHog                                                                                     | Mejorar el producto      | PostHog (procesador)                                     | Sí, opt-in                  |

No se venden datos. No hay publicidad ni SDKs de anuncios. No se usan los datos para entrenar
modelos (la API de Anthropic no entrena con datos de clientes de la API por defecto).
Cifrado en tránsito (TLS) y en reposo (Supabase). La sesión se guarda en el almacenamiento seguro
del sistema (Keychain/Keystore). El usuario puede **exportar** (Privacidad → Exportar mis datos,
JSON) y **eliminar su cuenta** desde la app, lo que borra todos sus registros y fotos.

---

## Política de privacidad (es-AR)

**Última actualización: [FECHA]**

[TITULAR] ("nosotros"), con domicilio en [DOMICILIO], es responsable de los datos personales
tratados a través de la aplicación Bocado.

**1. Qué datos recolectamos.** (a) Datos de cuenta: email y, si usás Google o Apple, el nombre
que esos servicios compartan. (b) Datos que cargás: edad, sexo, altura, peso, objetivo, nivel de
actividad, comidas, agua, medidas corporales. (c) Fotos de comidas y textos o dictados que
enviás para analizarlos. (d) Si lo habilitás: datos de Health Connect o Apple Salud (peso, pasos,
calorías activas). (e) Si lo aceptás: datos técnicos de errores y de uso anónimo. (f) Estado de
tus compras (no vemos datos de tu tarjeta).

**2. Datos de salud.** Tus datos de peso y alimentación son datos sensibles. Los tratamos solo
con tu consentimiento expreso, que podés retirar en cualquier momento eliminando tu cuenta.

**3. Para qué los usamos.** Para calcular tus objetivos, mostrar tu diario y progreso, analizar
tus comidas con inteligencia artificial, enviarte recordatorios que configures, gestionar tu
suscripción, y —solo si lo aceptás— corregir errores y mejorar la app. No hacemos publicidad ni
vendemos datos.

**4. Inteligencia artificial.** Las fotos y textos que enviás para analizar se procesan con
modelos de Anthropic, PBC (EE. UU.), que actúa como encargado del tratamiento y no los usa para
entrenar sus modelos. Las fotos se eliminan de nuestros servidores al terminar el análisis,
salvo que actives "Guardar fotos de mis comidas". Las estimaciones de la IA pueden tener
errores: siempre podés revisarlas y corregirlas.

**5. Con quién compartimos.** Solo con proveedores que nos prestan servicios: Supabase
(alojamiento y base de datos), Anthropic (análisis con IA), RevenueCat, Google y Apple (pagos), y
—si lo aceptás— Sentry (errores) y PostHog (analítica). Algunos están fuera de tu país; exigimos
garantías adecuadas de protección. También podemos revelar datos si una autoridad lo exige
legalmente.

**6. Cuánto tiempo.** Mientras tengas la cuenta. Si la eliminás, borramos tus datos y fotos en
forma inmediata, salvo registros mínimos que la ley nos obligue a conservar (por ejemplo,
comprobantes de compra). Los registros técnicos de uso de IA se anonimizan.

**7. Tus derechos.** Podés acceder, rectificar, exportar y suprimir tus datos desde la app
(Perfil → Privacidad) o escribiendo a [EMAIL]. La Agencia de Acceso a la Información Pública
(AAIP), órgano de control de la Ley 25.326, atiende denuncias por incumplimiento. Si estás en
Brasil, podés ejercer los derechos de la LGPD; en la UE, los del RGPD.

**8. Menores.** La app no está dirigida a menores de 16 años. Para menores de 18 no se ofrecen
planes de descenso de peso.

**9. Seguridad.** Usamos cifrado en tránsito y en reposo, control de acceso por usuario a nivel
de base de datos y almacenamiento privado para fotos.

**10. Cambios.** Si cambiamos esta política te vamos a avisar en la app y, si corresponde, te
vamos a pedir que la aceptes de nuevo.

**Contacto:** [EMAIL]

---

## Términos y condiciones (es-AR)

**1. Servicio.** Bocado es una herramienta de registro de alimentación y estimación nutricional.
**No es un dispositivo médico ni brinda diagnóstico o tratamiento.** No reemplaza la consulta con
un/a médico/a o nutricionista. Si estás embarazada, en período de lactancia, tenés una
enfermedad crónica, un trastorno de la conducta alimentaria o sos menor de 18, consultá a un
profesional antes de cambiar tu alimentación.

**2. Estimaciones.** Las calorías y nutrientes calculados (incluidos los estimados por IA a partir
de fotos) son aproximados y pueden contener errores. Sos responsable de revisarlos.

**3. Cuenta.** Debés tener al menos 16 años. Sos responsable de la confidencialidad de tu
contraseña. Podés eliminar tu cuenta en cualquier momento desde la app.

**4. Suscripciones.** Bocado Premium se ofrece como suscripción mensual o anual con renovación
automática, cobrada por Google Play o App Store. La prueba gratuita, si la hay, se convierte en
suscripción paga al terminar salvo que la canceles al menos 24 h antes. Podés cancelar desde la
configuración de suscripciones de tu tienda; la cancelación aplica al final del período en curso.
Los reembolsos se rigen por las políticas de la tienda. En Argentina podés ejercer el derecho de
arrepentimiento dentro de los 10 días (Ley 24.240) y usar el "botón de baja".

**5. Uso justo.** Los planes tienen límites diarios de escaneos y consultas para garantizar el
servicio. Podemos limitar cuentas que hagan uso automatizado o abusivo.

**6. Contenido.** Las fotos y datos que cargás son tuyos. Nos das una licencia limitada para
procesarlos con el único fin de prestarte el servicio.

**7. Responsabilidad.** En la medida permitida por la ley, no somos responsables por decisiones de
salud tomadas solo con base en la app.

**8. Ley aplicable.** Leyes de la República Argentina; jurisdicción de los tribunales de
[CIUDAD], sin perjuicio de los derechos del consumidor.

---

## Privacy policy & terms (en-US) — summary version

Use the Spanish text above as the master; an English version must say the same. Key points:
data collected (account, profile, meals, optional photos, optional health-platform data, purchase
status, opt-in diagnostics/analytics); photos are processed by Anthropic as a processor and
deleted after analysis unless "Save meal photos" is on; no ads, no sale of data, no training;
in-app export and deletion; 16+; not medical advice; auto-renewing subscriptions managed by the
store, cancel ≥24 h before renewal.

---

## Google Play — Data safety (respuestas)

- ¿Recolecta o comparte datos? **Sí recolecta. No comparte** (los proveedores actúan como
  procesadores, lo cual Google no considera "compartir").
- ¿Datos cifrados en tránsito? **Sí.** ¿El usuario puede pedir eliminación? **Sí** (in-app + web
  de soporte; Google exige un **link web** para pedir eliminación: publicá una página con el
  formulario/email).

| Categoría Google             | Tipo                                                                                        | Recolectado | Opcional | Propósitos                       |
| ---------------------------- | ------------------------------------------------------------------------------------------- | ----------- | -------- | -------------------------------- |
| Información personal         | Email, nombre                                                                               | Sí          | Sí*      | Funcionalidad, gestión de cuenta |
| Salud y estado físico        | Info de salud, de ejercicio                                                                 | Sí          | No       | Funcionalidad, personalización   |
| Fotos y videos               | Fotos                                                                                       | Sí          | Sí       | Funcionalidad                    |
| Audio                        | — (la voz la transcribe el reconocedor del sistema; a nuestros servidores solo llega texto) | No          | —        | —                                |
| Información financiera       | Historial de compras                                                                        | Sí          | No       | Funcionalidad                    |
| Actividad en la app          | Interacciones                                                                               | Sí          | Sí       | Analítica                        |
| Info y rendimiento de la app | Registros de fallas, diagnóstico                                                            | Sí          | Sí       | Analítica                        |
| Identificadores              | ID de usuario                                                                               | Sí          | No       | Funcionalidad, gestión de cuenta |

\* Opcional porque se puede usar en modo invitado.

Además: **Declaración de apps de salud** → "Nutrición y control de peso"; no es dispositivo
médico. **Público objetivo** 18+ (o 16+ con justificación). **Health Connect**: justificar
lectura de peso, pasos y calorías activas para ajustar objetivos y escritura de peso.

## App Store — App Privacy (etiquetas)

"Data Linked to You" (todo se vincula a la cuenta; nada se usa para rastreo → **no requiere
ATT**):

- **Health & Fitness:** Health, Fitness → App Functionality.
- **Contact Info:** Email Address, Name → App Functionality.
- **User Content:** Photos or Videos, Other User Content (comidas, preguntas) → App Functionality.
- **Identifiers:** User ID → App Functionality.
- **Purchases:** Purchase History → App Functionality.
- **Usage Data:** Product Interaction → Analytics (opt-in).
- **Diagnostics:** Crash Data, Performance Data → App Functionality (opt-in).

Tracking: **No**. Privacy manifest: lo genera Expo con las APIs requeridas por los SDKs.
