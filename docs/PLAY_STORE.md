# Publicar Bocado en Play Store — paso a paso

Guía corta, en orden. Cada paso dice quién lo hace: **Vos** (necesita tu identidad, tarjeta o
contraseñas) o **Claude** (código, archivos y textos). El detalle técnico de todos los servicios
está en [RELEASE.md](RELEASE.md).

## 1. Cuenta de Google Play — Vos

1. Entrá a <https://play.google.com/console/signup> con tu cuenta de Google.
2. Elegí cuenta **personal**, pagá los US$ 25 (una sola vez, sirve para todas tus apps) y
   verificá tu identidad con el documento. La verificación puede tardar unos días.
3. Activá la verificación en dos pasos de esa cuenta de Google.

## 2. Clave de firma — Vos (15 minutos, una sola vez)

La clave demuestra que las actualizaciones son tuyas. Seguí el punto 1 de
[PENDIENTES.md](PENDIENTES.md): se genera en tu computadora y se guarda como secretos de GitHub.
**Si se pierde no se puede actualizar la app**: guardala en un gestor de contraseñas y hacé una
copia. Nunca la pegues en un chat.

## 3. Página de privacidad, términos y baja de cuenta — Claude + Vos

Play exige tres direcciones web públicas. Las páginas ya están en `web/legal` y se publican
gratis con GitHub Pages (sin comprar dominio).

1. **Vos:** pasale a Claude estos datos (son públicos, van a aparecer en la página): nombre y
   apellido o razón social del responsable, domicilio legal (alcanza ciudad y provincia), ciudad
   de los tribunales y un correo de contacto para usuarios.
2. **Claude:** los carga en `web/legal/site.config.json` y en la app.
3. **Vos:** en GitHub → repo → Settings → Pages → Source: **GitHub Actions**. (GitHub Pages
   gratis necesita que el repositorio sea público.)
4. **Claude:** corre el workflow "Publish legal site". Quedan:
   - Privacidad: `https://matiasnic.github.io/Calorias/privacidad/`
   - Términos: `https://matiasnic.github.io/Calorias/terminos/`
   - Eliminar cuenta: `https://matiasnic.github.io/Calorias/eliminar-cuenta/`

Los textos son borradores razonables; conviene que los revise un/a abogado/a (datos de salud,
Ley 25.326).

## 4. Archivo para Play (.aab) — Claude

Con la clave del paso 2 cargada, Claude corre el workflow "Deploy backend + real APK" con
`build_aab` activado. El archivo `bocado-play-<versión>.aab` aparece en el release de GitHub.
Ese archivo no se instala en el celular: se sube a Play Console.

Cada archivo que se sube a Play necesita un número de versión interno mayor al anterior
(`versionCode` en `apps/mobile/app.config.ts`); Claude lo sube en cada versión.

## 5. Crear la app en Play Console — Vos (copiar y pegar)

**Crear app:** nombre `Bocado: contador de calorías IA`, idioma español (Latinoamérica), tipo
**App**, **Gratis**.

**Ficha de Play Store principal** (textos completos en [STORE_LISTING.md](STORE_LISTING.md)):

- Descripción breve:
  `Sacale una foto a tu comida y la IA calcula calorías, proteínas y más en segundos.`
- Descripción completa: el bloque "Descripción larga" de STORE_LISTING.md.
- Ícono 512×512 y gráfico destacado 1024×500: en `design/marca`.
- Capturas de teléfono: mínimo 2 (recomendado 6). Lista en STORE_LISTING.md.

**Contenido de la app** (menú "Política y programas → Contenido de la app"):

| Formulario                 | Qué responder                                                                 |
| -------------------------- | ----------------------------------------------------------------------------- |
| Política de privacidad     | La dirección de privacidad del paso 3                                         |
| Acceso a la app            | "Todas las funciones están disponibles sin restricciones" + cuenta de prueba  |
| Anuncios                   | No contiene anuncios                                                          |
| Clasificación de contenido | Cuestionario: categoría "Utilidad / Salud", sin violencia ni contenido adulto |
| Público objetivo           | 18 años o más                                                                 |
| Seguridad de los datos     | La tabla "Google Play — Data safety" de [PRIVACY.md](PRIVACY.md)              |
| Eliminación de cuentas     | La dirección "eliminar-cuenta" del paso 3                                     |
| Apps de salud              | "Nutrición y control de peso"; no es un dispositivo médico                    |
| Health Connect             | Lee peso, pasos y calorías activas para ajustar objetivos; escribe peso       |

**Categoría:** Salud y bienestar. **Contacto:** el mismo correo del paso 3.

## 6. Prueba cerrada con 12 personas — Vos

Las cuentas personales nuevas tienen que hacer una prueba cerrada con **12 testers durante 14
días seguidos** antes de pedir la publicación.

1. Play Console → Pruebas → **Prueba cerrada** → crear versión → subir el `.aab` del paso 4.
2. La primera vez Play ofrece "Firma de apps de Play": aceptala.
3. Crear una lista de correos con 15 a 20 personas (por si alguna se baja) y mandarles el enlace
   de participación. Tienen que aceptar la invitación e instalar la app desde Play.
4. Pediles que la usen de verdad esas dos semanas. Guía para ellos: [TESTERS.md](TESTERS.md).

## 7. Suscripciones y cobros — Vos, con guía de Claude

1. Play Console → Configuración → **Perfil de pagos**: cargar tus datos fiscales y la cuenta
   bancaria donde Google deposita.
2. Play Console → Monetización → Suscripciones: crear `premium_monthly` y `premium_annual`
   (con 7 días de prueba gratis en el anual). Precios y países: ver la sección 3 de RELEASE.md.
3. Crear la cuenta en RevenueCat (gratis) y conectarla con Play: sección 4 de RELEASE.md.
4. Hacer una compra de prueba completa con una cuenta de tester: comprar, restaurar y cancelar.

## 8. Pedir la publicación — Vos

Cuando se cumplen los 14 días, Play Console habilita "Solicitar acceso a producción". Hay que
contar cómo fue la prueba (cuántos testers, qué comentarios hubo, qué se corrigió). Google
responde normalmente en menos de una semana. Después se crea la versión de producción con el
mismo `.aab` o uno más nuevo.

## Antes de pedir producción, revisar

- [ ] Límite de gasto mensual puesto en la consola de Anthropic.
- [ ] Secreto `REVENUECAT_ACCEPT_SANDBOX` quitado o en `false`.
- [ ] Supabase → Authentication: contraseña mínima 8, protección de contraseñas filtradas, sin
      `exp://**` en las redirecciones (punto 3 de PENDIENTES.md).
- [ ] Verificación en dos pasos en Google, GitHub, Supabase y Anthropic.
- [ ] Supabase en plan Pro cuando haya clientes pagos (copias de seguridad).

## Después de publicar (15 minutos por semana)

- **Play Console:** reseñas, cierres inesperados y avisos de políticas (también llegan por mail;
  no ignorarlos).
- **RevenueCat:** suscriptores e ingresos.
- **Anthropic:** gasto de IA.
- **Una vez por año:** actualizar la app a la versión de Android que exige Google.
