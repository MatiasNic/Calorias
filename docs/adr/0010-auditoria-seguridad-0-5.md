# ADR 0010 — Endurecimiento de seguridad, privacidad y sincronización (0.5)

- Estado: aceptada · Fecha: 2026-10-13

## Contexto

Antes de abrir la app a más usuarios se auditaron el backend, la app y la organización del
código. No había fallas críticas de RLS ni de autenticación. Sí aparecieron caminos para gastar IA
sin límite real, datos de una cuenta visibles para otra en el mismo celular y una sincronización
que podía perder historial.

## Decisión

- **Costo de IA acotado por usuario, no solo por plan.** Hay un techo diario de llamadas por
  usuario (gratis 40, premium 300) que las devoluciones no reinician. Solo 3 respuestas "no es
  comida" por día se devuelven a la cuota. El historial del coach se recorta a 12 mensajes o
  12.000 caracteres. Los cuerpos de las requests tienen un máximo de 256 KB.
- **Pagos:** las compras de prueba (sandbox) no dan Premium salvo `REVENUECAT_ACCEPT_SANDBOX=true`.
  Créditos y eventos de suscripción se aplican con funciones SQL atómicas (sin leer y después
  escribir).
- **Datos de cada cuenta aislados en el dispositivo.** Toda lectura local filtra por `user_id`.
  Al entrar con una cuenta (o como invitado) se borran los datos que dejó otra cuenta. Un único
  `wipeDeviceUserData` limpia base, fotos, widgets, recordatorios, plan y exportaciones al
  cerrar sesión, cambiar de cuenta o eliminarla. Cerrar sesión nunca descarta cambios sin
  subir sin preguntar.
- **Los enlaces externos no disparan acciones pagas.** `bocado://analyzing` solo analiza texto
  abierto desde la app (va en memoria con un id de un solo uso); un enlace externo abre el
  editor de texto. Las fechas de los enlaces se validan.
- **Sincronización completa y barata.** Se descarga por páginas (500 filas) en orden estable y el
  cursor avanza solo cuando se guardaron todas. Cada página entra en una transacción. Las filas
  iguales a las guardadas no cuentan como cambio. Un registro rechazado no frena al resto.
- **CI con privilegio mínimo.** Los secretos de Supabase y de IA solo llegan al paso de deploy
  (nunca a `pnpm install`). El APK se firma con una clave de release propia cuando está
  configurada (`ANDROID_KEYSTORE_BASE64` y afines).

## Consecuencias

- Pasar de la clave de debug a la de release obliga a desinstalar la versión anterior una vez
  (Android no acepta actualizar entre firmas distintas). Conviene sincronizar antes.
- Las migraciones nuevas (`20261013000100_security_hardening.sql`) se aplican con el próximo
  deploy del backend.
- Pendiente, con prueba en un dispositivo: activar R8 y resource shrinking (APK más chico); subir
  en lote en vez de una request por registro; contadores incrementales para logros.
