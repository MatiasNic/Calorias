# Semana de prueba con IA real

Objetivo: usar Bocado una semana con **IA real** (la foto se analiza de verdad, detecta cuando no
es comida), cuenta propia y datos guardados en la nube, antes de publicar.

## 1. Lo que hace el dueño (≈ 20 minutos)

1. **Supabase** → <https://supabase.com> → New project (región São Paulo). Anotá la contraseña de
   la base. En _Account → Access tokens_ generá un token.
2. **Anthropic** → <https://console.anthropic.com> → cargá crédito (US$ 10 alcanza de sobra para
   una semana), creá una API key y poné un **límite de gasto mensual** (ej. US$ 20).
3. (Opcional) **USDA** → <https://fdc.nal.usda.gov/api-key-signup> → clave gratuita.
4. Cargá estos valores como **variables del entorno** de la sesión de Claude Code (menú del
   entorno → Editar). No los pegues en el chat:

   | Variable                   | Valor                                                     |
   | -------------------------- | --------------------------------------------------------- |
   | `SUPABASE_ACCESS_TOKEN`    | token del paso 1                                          |
   | `SUPABASE_PROJECT_REF`     | el id del proyecto (`xxxx` de `https://xxxx.supabase.co`) |
   | `SUPABASE_DB_PASSWORD`     | contraseña de la base                                     |
   | `BOCADO_ANTHROPIC_API_KEY` | key del paso 2 (**no** `ANTHROPIC_API_KEY`: ver nota)     |
   | `USDA_FDC_API_KEY`         | (opcional)                                                |

   > El entorno de Claude Code reserva el nombre `ANTHROPIC_API_KEY` para su propia autenticación
   > ("no se usará para autenticar solicitudes") y no lo pasa a los comandos. Por eso la key de la
   > app va como `BOCADO_ANTHROPIC_API_KEY`; el script de deploy acepta cualquiera de los dos.

5. Abrí una sesión nueva y pedí: _"desplegá el backend y generame el APK de prueba real"_.

## 2. Lo que hace Claude Code con esas variables

```bash
./scripts/deploy-backend.sh        # base + RLS + 229 alimentos + funciones + secretos
```

> Si el entorno no llega al puerto de Postgres (sesiones en la nube con red restringida), usá el
> workflow **Deploy backend + real APK** (`.github/workflows/deploy-backend.yml`): cargá los mismos
> valores como secretos del repositorio (_Settings → Secrets and variables → Actions_) y ejecutalo
> desde _Actions → Run workflow_. Despliega, compila el APK real y lo publica como Release
> `vX.Y.Z-real`.

Después compila un APK `preview` con `EXPO_PUBLIC_USE_MOCKS=false` y la URL/anon key públicas
del proyecto (esas dos sí van en la app; no son secretas) y lo publica en el Release de GitHub.

## 2b. Ingresar con Google (opcional)

El botón "Continuar con Google" necesita que el proveedor esté activado en Supabase; si no, la app
avisa "El ingreso con Google todavía no está habilitado" y se puede usar email y contraseña.

1. Google Cloud Console → _APIs y servicios → Credenciales_ → Crear credenciales → **ID de cliente
   de OAuth** → tipo **Aplicación web**. En _URIs de redireccionamiento autorizados_ poné
   `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`.
2. Supabase → _Authentication → Sign In / Providers → Google_ → activalo y pegá el Client ID y el
   Client Secret.
3. Supabase → _Authentication → URL Configuration_ → en _Redirect URLs_ agregá
   `bocado://auth/callback` y `bocado://auth/reset-password`.

## 3. Premium sin pagar durante la prueba

Mientras no estén creados los productos en Play Console y RevenueCat, el dueño se da Premium a sí
mismo desde el editor SQL de Supabase (reemplazá el email):

```sql
insert into public.subscriptions (user_id, entitlement, product_id, platform, status, expires_at)
select id, 'premium', 'premium_annual', 'promotional', 'active', now() + interval '30 days'
from auth.users where email = 'tu-email@ejemplo.com'
on conflict (user_id) do update set status = 'active', expires_at = excluded.expires_at;
```

El servidor es la fuente de verdad del plan: con esa fila, el coach, el plan de comidas, el
objetivo adaptativo y los micronutrientes funcionan con IA real.

## 4. Qué probar y cuánto cuesta

- Fotos de platos reales (también fotos que **no** son comida: la IA responde "no parece comida"
  y no descuenta el escaneo), texto/voz, etiquetas nutricionales y códigos de barras.
- Costo estimado de la semana para un usuario intensivo: menos de US$ 2 (ver `docs/COSTS.md`).
- Cada análisis queda registrado con su costo en la tabla `ai_scans`.
