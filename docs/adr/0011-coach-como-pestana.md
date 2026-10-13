# 0011 — El coach como pestaña y platos registrables

## Contexto

El coach (Premium, 50 mensajes por día) era un modal al que se llegaba desde un ícono sin texto en
Hoy o desde Perfil → Premium. Las herramientas Premium (plan semanal, objetivo adaptativo,
micronutrientes) quedaban igual de escondidas. El uso más común es "¿qué cocino con lo que tengo?",
y las respuestas eran texto suelto: no se podían registrar.

## Decisión

- **Navegación:** la barra inferior queda Hoy · Diario · [micrófono] · Coach · Progreso. Perfil
  sigue siendo una ruta del navegador de pestañas, pero se abre desde el botón con la inicial
  arriba a la derecha en Hoy. Así el micrófono sigue centrado (2 + 1 + 2).
- **Pantalla del coach:**
  - Muestra lo que queda hoy.
  - Pone "¿Qué cocino con lo que tengo?" como acción principal: lista de ingredientes que se
    recuerda, o foto de la heladera.
  - Tiene atajos a la próxima comida, a un snack con proteína y a una foto de menú.
  - Muestra las herramientas Premium en una fila.
  - La conversación se guarda solo en el teléfono (`bocado.coachChat`) y se borra al cerrar sesión.
- **Respuesta estructurada:** `coach-chat` usa salida estructurada (`AiCoachReplySchema`):
  - `reply`: texto corto, con **negrita** y viñetas.
  - `dishes`: hasta 3 platos con ingredientes en gramos para una porción.
  - Los ingredientes pasan por el mismo enriquecimiento que un escaneo (base regional → USDA →
    estimación). "Registrar" abre la revisión de comida de siempre.
- **Contexto:** el servidor le pasa al modelo:
  - los objetivos;
  - lo consumido y lo que queda hoy;
  - los nombres de lo que se comió hoy, por comida;
  - la hora local.

  La instrucción es responder lo que el usuario pide, sin forzar a "completar el día".

## Consecuencias

- Las apps viejas siguen funcionando: `dishes` tiene default `[]` en el cliente y el servidor
  sigue mandando `reply`.
- Una respuesta con platos usa más tokens de salida (máximo 4000). Sigue contando como un mensaje
  de coach.
- Los flujos E2E siguen usando `tab-profile`, que ahora es el botón de Hoy.
