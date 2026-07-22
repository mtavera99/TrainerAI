import type {
  WorkoutDayTemplate,
  PhaseConfig,
  Profile,
} from '../types'

// ============================================================
// PROGRAMA BASE — Santiago Tavera
// ------------------------------------------------------------
// Bloque de 10 semanas. Prioridades (contexto maestro):
//   1) Mejorar piernas SIN irritar glúteo/lumbar derecho
//   2) Amplitud de espalda   3) Deltoide lateral
//   4) Mantener/progresar pecho superior   5) Integrar running (5 km)
//
// Construido con las MÁQUINAS Y EJERCICIOS que Santiago usa ahora
// mismo en su gimnasio nuevo. Juega fútbol los VIERNES, por lo que
// las piernas se programan lejos de ese día.
//
// Split de 5 días + fútbol (vie) + 3 salidas de running:
//   D1 Pierna A (cuádriceps)  ·  D2 Empuje (pecho/hombro/tríceps)
//   D3 Espalda + post. + bíceps  ·  D4 Pierna B (posterior)
//   D5 Hombro + amplitud + brazos
// Frecuencia: espalda 2x, deltoide lateral 3x, pecho 2x, pierna 2x
// (+ fútbol), antebrazo 3x (punto débil), abdomen 2x.
// ============================================================

export const PROFILE_SEED: Profile = {
  name: 'Santiago Tavera',
  age: 26,
  heightCm: 174,
  weightKg: 78,
  bodyFatPct: 15,
  level: 'Intermedio',
  goalWeightKg: 80.5,
}

export const BLOCK_LENGTH_WEEKS = 10

// Calendario semanal sugerido (piernas lejos del fútbol del viernes)
export interface ScheduleSlot {
  day: string
  activity: string
  workoutId?: string
  kind: 'fuerza' | 'running' | 'futbol' | 'descanso'
}

export const WEEK_SCHEDULE: ScheduleSlot[] = [
  { day: 'Lunes', activity: 'Pierna A · Cuádriceps', workoutId: 'd1', kind: 'fuerza' },
  { day: 'Martes', activity: 'Empuje · Pecho/Hombro/Tríceps', workoutId: 'd2', kind: 'fuerza' },
  { day: 'Miércoles', activity: 'Pierna B · Posterior + Running suave', workoutId: 'd4', kind: 'fuerza' },
  { day: 'Jueves', activity: 'Espalda + Bíceps + Running intervalos', workoutId: 'd3', kind: 'fuerza' },
  { day: 'Viernes', activity: 'Fútbol ⚽', kind: 'futbol' },
  { day: 'Sábado', activity: 'Hombro + Brazos + Running continuo', workoutId: 'd5', kind: 'fuerza' },
  { day: 'Domingo', activity: 'Descanso (running suave opcional)', kind: 'descanso' },
]

// Periodización del bloque (RIR descendente + descarga final)
export const PHASES: PhaseConfig[] = [
  {
    fromWeek: 1,
    toWeek: 3,
    name: 'Acumulación',
    targetRIR: 3,
    description:
      'Construir volumen y técnica. Deja 2-3 repeticiones en recámara (RIR 2-3). Prioriza conexión mente-músculo y rango completo.',
  },
  {
    fromWeek: 4,
    toWeek: 6,
    name: 'Intensificación',
    targetRIR: 2,
    description:
      'Sube carga manteniendo técnica. RIR 1-2 en las series principales. Aquí es donde más peso deberías añadir.',
  },
  {
    fromWeek: 7,
    toWeek: 9,
    name: 'Pico',
    targetRIR: 1,
    description:
      'Máxima tensión. RIR 0-1 en la última serie de los básicos. Cuida recuperación y sueño; la fatiga será alta.',
  },
  {
    fromWeek: 10,
    toWeek: 10,
    name: 'Descarga',
    targetRIR: 4,
    deload: true,
    description:
      'Semana de descarga: reduce ~40% el volumen y deja RIR 4. Asimila el bloque y llega fresco al siguiente.',
  },
]

export function phaseForWeek(week: number): PhaseConfig {
  return (
    PHASES.find((p) => week >= p.fromWeek && week <= p.toWeek) ??
    PHASES[PHASES.length - 1]
  )
}

// ------------------------------------------------------------
// Días de entrenamiento
// ------------------------------------------------------------

export const WORKOUT_DAYS: WorkoutDayTemplate[] = [
  // ---------------- DÍA 1 · PIERNA A (CUÁDRICEPS) ----------------
  {
    id: 'd1',
    name: 'Día 1 · Pierna A (Cuádriceps)',
    focus: 'Cuádriceps y gemelos sin irritar la lesión',
    color: '#22c55e',
    exercises: [
      {
        id: 'pendulo',
        name: 'Máquina de péndulo (Pendulum Squat)',
        muscle: 'Cuádriceps',
        equipment: 'Máquina',
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSec: 150,
        loadStep: 5,
        primary: true,
        note: 'Tu opción más segura para pierna pesada. Rango cómodo, sin dolor lumbar/glúteo. Nunca sacrifiques técnica por peso.',
      },
      {
        id: 'hack',
        name: 'Hack squat',
        muscle: 'Cuádriceps',
        equipment: 'Máquina',
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSec: 150,
        loadStep: 5,
        primary: true,
        note: 'Si notas la cadera/glúteo derecho, reduce el rango o sustitúyelo por más péndulo. Pies un poco altos para descargar la zona lumbar.',
      },
      {
        id: 'extensiones',
        name: 'Extensiones de cuádriceps',
        muscle: 'Cuádriceps',
        equipment: 'Máquina',
        sets: 3,
        repMin: 12,
        repMax: 15,
        restSec: 90,
        loadStep: 2.5,
        note: 'Pausa 1s arriba. Volumen de cuádriceps con cero estrés lumbar.',
      },
      {
        id: 'gemelos-pie',
        name: 'Gemelos de pie (pantorrillas)',
        muscle: 'Gemelos',
        equipment: 'Máquina',
        sets: 4,
        repMin: 10,
        repMax: 15,
        restSec: 60,
        loadStep: 5,
        note: 'Rango completo, estira abajo 1s. Clave para correr y prevenir molestias de tibial.',
      },
      {
        id: 'colgado-pies-barra',
        name: 'Colgado a la barra, pies a la barra',
        muscle: 'Core',
        equipment: 'Peso corporal',
        sets: 3,
        repMin: 8,
        repMax: 15,
        restSec: 60,
        loadStep: 0,
        note: 'Sube con control, sin balanceo. Abdomen fuerte protege la lumbar.',
      },
    ],
  },

  // ---------------- DÍA 2 · EMPUJE ----------------
  {
    id: 'd2',
    name: 'Día 2 · Empuje (Pecho/Hombro/Tríceps)',
    focus: 'Pecho superior, hombro y tríceps',
    color: '#f97316',
    exercises: [
      {
        id: 'press-agarre-ancho',
        name: 'Máquina de press (agarre ancho)',
        muscle: 'Pecho',
        equipment: 'Máquina',
        sets: 4,
        repMin: 8,
        repMax: 12,
        restSec: 120,
        loadStep: 2.5,
        primary: true,
        note: 'Estable, como te gusta. Retrae escápulas y baja controlando.',
      },
      {
        id: 'press-inclinado-smith',
        name: 'Press inclinado en Smith',
        muscle: 'Pecho',
        equipment: 'Smith',
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSec: 120,
        loadStep: 2.5,
        primary: true,
        note: 'Banco a ~30° para pecho superior (tu prioridad). Estira abajo, no choques arriba.',
      },
      {
        id: 'aperturas-maquina-inclinada',
        name: 'Aperturas en máquina inclinada',
        muscle: 'Pecho',
        equipment: 'Máquina',
        sets: 3,
        repMin: 12,
        repMax: 15,
        restSec: 75,
        loadStep: 2.5,
        note: 'Estiramiento máximo del pectoral. Aprieta 1s en el centro.',
      },
      {
        id: 'cruce-cables',
        name: 'Cruce de cables (de abajo hacia arriba)',
        muscle: 'Pecho',
        equipment: 'Polea',
        sets: 3,
        repMin: 12,
        repMax: 20,
        restSec: 60,
        loadStep: 1.25,
        note: 'Poleas bajas cruzando hacia arriba para enfatizar fibras claviculares.',
      },
      {
        id: 'lateral-maquina-d2',
        name: 'Elevaciones laterales en máquina (de pie)',
        muscle: 'Hombro lateral',
        equipment: 'Máquina',
        sets: 4,
        repMin: 12,
        repMax: 20,
        restSec: 60,
        loadStep: 2.5,
        primary: true,
        note: 'Punto débil prioritario. Sin impulso, lidera con el codo, tensión constante.',
      },
      {
        id: 'triceps-45-cbum',
        name: 'Extensión de tríceps 45° (polea, estilo CBUM)',
        muscle: 'Tríceps',
        equipment: 'Polea',
        sets: 3,
        repMin: 10,
        repMax: 15,
        restSec: 75,
        loadStep: 2.5,
        note: 'Inclinado hacia delante para estirar la cabeza larga. Estira bien arriba.',
      },
      {
        id: 'press-cerrado',
        name: 'Press cerrado',
        muscle: 'Tríceps',
        equipment: 'Smith',
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSec: 90,
        loadStep: 2.5,
        note: 'Tríceps en patrón compuesto. Codos cerca del cuerpo.',
      },
      {
        id: 'antebrazo-polea-d2',
        name: 'Curl de antebrazo en polea',
        muscle: 'Antebrazo',
        equipment: 'Polea',
        sets: 3,
        repMin: 12,
        repMax: 20,
        restSec: 45,
        loadStep: 1.25,
        note: 'Dosis 1/3 de la semana. Rango completo de muñeca, sin prisa.',
      },
    ],
  },

  // ---------------- DÍA 3 · ESPALDA + POSTERIOR + BÍCEPS ----------------
  {
    id: 'd3',
    name: 'Día 3 · Espalda + Bíceps',
    focus: 'Amplitud/grosor de espalda, deltoide posterior y bíceps',
    color: '#3b82f6',
    exercises: [
      {
        id: 'jalon-mag',
        name: 'Jalón al pecho (agarre MAG)',
        muscle: 'Espalda',
        equipment: 'Polea',
        sets: 4,
        repMin: 8,
        repMax: 12,
        restSec: 120,
        loadStep: 5,
        primary: true,
        note: 'Foco en amplitud: codos abajo y afuera, siente el dorsal. Pecho arriba, sin balanceo.',
      },
      {
        id: 'remo-maquina',
        name: 'Máquina de remo',
        muscle: 'Espalda',
        equipment: 'Máquina',
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSec: 120,
        loadStep: 5,
        primary: true,
        note: 'Apoyo en pecho = cero estrés lumbar. Retrae escápula, grosor de espalda media.',
      },
      {
        id: 'pullover-maquina-d3',
        name: 'Máquina de pull over',
        muscle: 'Espalda',
        equipment: 'Máquina',
        sets: 3,
        repMin: 12,
        repMax: 15,
        restSec: 75,
        loadStep: 2.5,
        note: 'Aísla el dorsal y trabaja la amplitud sin fatigar bíceps.',
      },
      {
        id: 'posterior-delt-pec',
        name: 'Deltoide posterior en pec-deck (invertido)',
        muscle: 'Hombro posterior',
        equipment: 'Máquina',
        sets: 4,
        repMin: 15,
        repMax: 20,
        restSec: 60,
        loadStep: 2.5,
        note: 'Salud de hombro y densidad posterior. Aprieta atrás sin encoger el cuello.',
      },
      {
        id: 'curl-bicep-sentado',
        name: 'Curl de bíceps sentado en máquina',
        muscle: 'Bíceps',
        equipment: 'Máquina',
        sets: 3,
        repMin: 10,
        repMax: 15,
        restSec: 60,
        loadStep: 2.5,
      },
      {
        id: 'curl-bayesian',
        name: 'Curl bayesian (polea)',
        muscle: 'Bíceps',
        equipment: 'Polea',
        sets: 3,
        repMin: 10,
        repMax: 15,
        restSec: 60,
        loadStep: 1.25,
        note: 'Brazo detrás del cuerpo = máximo estiramiento del bíceps.',
      },
      {
        id: 'antebrazo-polea-d3',
        name: 'Curl de antebrazo en polea',
        muscle: 'Antebrazo',
        equipment: 'Polea',
        sets: 3,
        repMin: 12,
        repMax: 20,
        restSec: 45,
        loadStep: 1.25,
        note: 'Dosis 2/3 de la semana.',
      },
    ],
  },

  // ---------------- DÍA 4 · PIERNA B (POSTERIOR) ----------------
  {
    id: 'd4',
    name: 'Día 4 · Pierna B (Posterior)',
    focus: 'Femoral, glúteo y aductores sin cargar la lumbar',
    color: '#14b8a6',
    exercises: [
      {
        id: 'curl-femoral-tumbado',
        name: 'Curl femoral tumbado (máquina de isquios)',
        muscle: 'Femoral',
        equipment: 'Máquina',
        sets: 4,
        repMin: 8,
        repMax: 12,
        restSec: 120,
        loadStep: 5,
        primary: true,
        note: 'Cadena posterior con cero riesgo lumbar. Controla la excéntrica.',
      },
      {
        id: 'curl-femoral-sentado',
        name: 'Curl femoral sentado (máquina de isquios)',
        muscle: 'Femoral',
        equipment: 'Máquina',
        sets: 3,
        repMin: 10,
        repMax: 15,
        restSec: 90,
        loadStep: 5,
        primary: true,
        note: 'Segundo ángulo de isquios. Femoral fuerte = rodillas sanas al correr.',
      },
      {
        id: 'hip-thrust',
        name: 'Hip thrust',
        muscle: 'Glúteo',
        equipment: 'Máquina',
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSec: 120,
        loadStep: 5,
        primary: true,
        note: 'Glúteo fuerte protege la lumbar. Barbilla metida, empuje con talones, NO hiperextiendas arriba.',
      },
      {
        id: 'prensa-unilateral',
        name: 'Prensa unilateral',
        muscle: 'Cuádriceps',
        equipment: 'Máquina',
        sets: 3,
        repMin: 10,
        repMax: 15,
        restSec: 90,
        loadStep: 5,
        unilateral: true,
        note: 'Corrige asimetrías. Controla la flexión de cadera del lado derecho; si molesta, reduce el rango.',
      },
      {
        id: 'aductores-d4',
        name: 'Aductores en máquina',
        muscle: 'Aductores',
        equipment: 'Máquina',
        sets: 3,
        repMin: 12,
        repMax: 20,
        restSec: 60,
        loadStep: 5,
        note: 'Estabilidad de cadera, útil para la lesión y para el fútbol.',
      },
      {
        id: 'gemelos-sentado',
        name: 'Gemelos sentado (pantorrillas)',
        muscle: 'Gemelos',
        equipment: 'Máquina',
        sets: 4,
        repMin: 12,
        repMax: 20,
        restSec: 60,
        loadStep: 2.5,
        note: 'Variante para el sóleo; complementa los gemelos de pie del Día 1.',
      },
      {
        id: 'maquina-crunch',
        name: 'Máquina de crunch',
        muscle: 'Core',
        equipment: 'Máquina',
        sets: 3,
        repMin: 12,
        repMax: 20,
        restSec: 45,
        loadStep: 2.5,
        note: 'Flexiona la columna con control, exhala al subir.',
      },
    ],
  },

  // ---------------- DÍA 5 · HOMBRO + AMPLITUD + BRAZOS ----------------
  {
    id: 'd5',
    name: 'Día 5 · Hombro + Brazos',
    focus: 'Hombro, 2ª dosis de amplitud de espalda y brazos',
    color: '#8b5cf6',
    exercises: [
      {
        id: 'press-militar-smith',
        name: 'Press militar en Smith (barra)',
        muscle: 'Hombro',
        equipment: 'Smith',
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSec: 120,
        loadStep: 2.5,
        primary: true,
        note: 'Estable, como te gusta. Baja a la clavícula sin forzar el hombro.',
      },
      {
        id: 'lateral-maquina-d5',
        name: 'Elevaciones laterales en máquina (de pie)',
        muscle: 'Hombro lateral',
        equipment: 'Máquina',
        sets: 4,
        repMin: 12,
        repMax: 20,
        restSec: 60,
        loadStep: 2.5,
        primary: true,
        note: 'Tercera dosis semanal de laterales. Alta frecuencia = hombros más anchos.',
      },
      {
        id: 'pullover-maquina-d5',
        name: 'Máquina de pull over (2ª dosis amplitud)',
        muscle: 'Espalda',
        equipment: 'Máquina',
        sets: 3,
        repMin: 12,
        repMax: 15,
        restSec: 75,
        loadStep: 2.5,
        note: 'Segunda dosis de dorsal en la semana para forzar la amplitud.',
      },
      {
        id: 'curl-predicador',
        name: 'Curl predicador',
        muscle: 'Bíceps',
        equipment: 'Máquina',
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSec: 75,
        loadStep: 2.5,
        note: 'Pico del bíceps con el brazo fijo. No rebotes abajo.',
      },
      {
        id: 'triceps-copa',
        name: 'Extensión de tríceps sobre la cabeza ("copa")',
        muscle: 'Tríceps',
        equipment: 'Mancuerna',
        sets: 3,
        repMin: 10,
        repMax: 15,
        restSec: 75,
        loadStep: 2,
        note: 'Estira la cabeza larga del tríceps. Codos apuntando al frente.',
      },
      {
        id: 'triceps-catana',
        name: 'Extensiones catana (polea)',
        muscle: 'Tríceps',
        equipment: 'Polea',
        sets: 3,
        repMin: 12,
        repMax: 15,
        restSec: 60,
        loadStep: 1.25,
        note: 'Cuerda por detrás de la nuca, énfasis en estiramiento.',
      },
      {
        id: 'antebrazo-polea-d5',
        name: 'Curl de antebrazo en polea',
        muscle: 'Antebrazo',
        equipment: 'Polea',
        sets: 3,
        repMin: 12,
        repMax: 20,
        restSec: 45,
        loadStep: 1.25,
        note: 'Dosis 3/3 de la semana. Trabajamos el antebrazo por ser punto débil.',
      },
    ],
  },
]

export function findExercise(exerciseId: string) {
  for (const day of WORKOUT_DAYS) {
    const ex = day.exercises.find((e) => e.id === exerciseId)
    if (ex) return ex
  }
  return undefined
}

export function findDay(dayId: string) {
  return WORKOUT_DAYS.find((d) => d.id === dayId)
}
