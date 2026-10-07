# ADR 0009 — Registro de entrenamiento y suplementos

- Estado: aceptada · Fecha: 2026-10-07

## Contexto

Los usuarios que entrenan quieren seguir en Bocado lo que hacen en el gimnasio o en el deporte y
los suplementos que toman, y que eso se refleje en sus calorías del día.

## Decisión

- **Tres colecciones nuevas** (`workouts`, `supplements`, `supplement_intakes`), con las mismas
  reglas que el resto: SQLite local primero, outbox de sincronización, RLS solo-dueño, borrado en
  cascada con la cuenta y exportación JSON. Las tomas se sincronizan después de los suplementos.
- **Calorías del ejercicio = METs netos:** `(MET − 1) × kg × horas`, con valores del Compendio
  de Actividades Físicas para 30 actividades y 3 intensidades. Se descuenta el MET de reposo
  porque ese gasto ya está en el objetivo diario. El usuario puede escribir sus propias calorías
  (por ejemplo, las de su reloj).
- **Sin doble conteo:** si el día tiene entrenamientos registrados se usan esos; las calorías
  activas de Salud/Health Connect solo cuando no hay nada registrado (`dailyExerciseKcal`). En
  Preferencias se puede desactivar que el ejercicio sume al objetivo.
- **Fuerza:** series de repeticiones × kg, volumen y récords personales con 1RM estimado (Epley).
  Peso siempre guardado en kg; la UI convierte a lb en sistema imperial.
- **Suplementos:** agenda por días y horarios, checklist del día, cumplimiento a 7/30 días,
  stock con aviso de faltante y recordatorios locales. Un suplemento con calorías (proteína en
  polvo) puede sumarse al diario: marcarlo crea una comida y desmarcarlo la borra.
- **Salud:** la app **no recomienda** suplementos ni dosis, solo registra lo que el usuario ya
  toma, con un aviso visible. El coach puede hablar de entrenamiento y de los suplementos
  registrados, pero no prescribe dosis.
- **Logros:** nueva categoría "Entrenamiento" (sesiones, minutos activos, días con todos los
  suplementos tomados): 138 logros en total.

## Consecuencias

- Las funciones son gratuitas: registrar no consume IA. El coach (Premium) recibe un resumen de
  la semana de entrenamiento y los nombres de los suplementos activos (recortados).
- Las estimaciones de calorías son aproximadas; la pantalla lo aclara.
