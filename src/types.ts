// ============================================================
// Modelo de datos de la app de entrenamiento de Santiago
// ============================================================

export type MuscleGroup =
  | 'Espalda'
  | 'Pecho'
  | 'Hombro lateral'
  | 'Hombro posterior'
  | 'Hombro'
  | 'Cuádriceps'
  | 'Femoral'
  | 'Glúteo'
  | 'Aductores'
  | 'Gemelos'
  | 'Bíceps'
  | 'Tríceps'
  | 'Antebrazo'
  | 'Core'

export type Equipment =
  | 'Máquina'
  | 'Polea'
  | 'Mancuerna'
  | 'Smith'
  | 'Barra'
  | 'Peso corporal'

/** Énfasis de longitud muscular del ejercicio (dónde genera más tensión) */
export type LengthEmphasis = 'estirado' | 'medio' | 'acortado'

/** Plantilla de un ejercicio dentro del programa base */
export interface ExerciseTemplate {
  id: string
  /**
   * Identifica el MOVIMIENTO, no la casilla del día. Dos entradas en días
   * distintos con el mismo `movementId` comparten historial y progresan
   * juntas (ej. las elevaciones laterales que haces 3 veces por semana).
   * Si se omite, se usa el propio `id`.
   */
  movementId?: string
  name: string
  muscle: MuscleGroup
  equipment: Equipment
  /** Rango de repeticiones objetivo (doble progresión) */
  repMin: number
  repMax: number
  /** Series de trabajo base (semanas 1-3) */
  sets: number
  /**
   * Techo de series cuando el bloque escala volumen. Si es mayor que `sets`,
   * la app añade series al avanzar las fases (músculos prioritarios).
   */
  maxSets?: number
  /** Descanso recomendado entre series (segundos) */
  restSec: number
  /** Incremento mínimo de carga sugerido (kg) para este equipo */
  loadStep: number
  /** Si el ejercicio es unilateral (reps por lado) */
  unilateral?: boolean
  /** Si las "reps" son en realidad segundos (planchas, isométricos) */
  timeBased?: boolean
  /** Nota técnica / propósito del ejercicio */
  note?: string
  /** Si es un ejercicio principal (prioridad de progresión) */
  primary?: boolean
  /**
   * Si está presente, este ejercicio es la ALTERNATIVA del ejercicio con ese
   * id: se hace uno de los dos, nunca los dos. No suma al volumen planificado.
   */
  alternativeOf?: string
  /** Etiqueta de la opción cuando forma parte de un par A/B */
  optionLabel?: string
  /** Dónde genera más tensión (para explicar el porqué de la selección) */
  emphasis?: LengthEmphasis
}

/** Un día de entrenamiento del programa base */
export interface WorkoutDayTemplate {
  id: string
  name: string
  focus: string
  color: string
  exercises: ExerciseTemplate[]
}

/** Decisión que ha tomado el motor de progresión */
export type ProgressionAction =
  | 'primera-vez'
  | 'subir-peso'
  | 'sumar-reps'
  | 'ajustar-por-rir'
  | 'romper-estancamiento'
  | 'descarga'

/** Prescripción calculada para una semana concreta */
export interface ExercisePrescription {
  exerciseId: string
  sets: number
  repMin: number
  repMax: number
  targetRIR: number
  restSec: number
  /** Peso sugerido para la semana (puede ser undefined si no hay historial) */
  suggestedWeight?: number
  /** Reps concretas a las que apuntar con ese peso */
  targetReps?: number
  /** Explicación de por qué se sugiere esto (progresión) */
  rationale: string
  /** Qué ha decidido el motor */
  action: ProgressionAction
  /** 1RM estimado de referencia (a partir de reps + RIR de la última sesión) */
  e1rm?: number
  /** Aviso destacado (estancamiento, retroceso, exceso de fatiga) */
  alert?: string
  /** Series añadidas respecto a la base por el escalado de volumen */
  addedSets?: number
  /** Peso y reps de referencia de la última vez que hiciste el movimiento */
  lastTop?: { weight: number; reps: number; rir: number; week: number }
}

// ---------- Registro de sesiones ----------

export interface LoggedSet {
  weight: number
  reps: number
  rir: number
  done: boolean
}

export interface LoggedExercise {
  exerciseId: string
  sets: LoggedSet[]
}

export interface SessionLog {
  id: string
  dayId: string
  week: number
  /** ISO date */
  date: string
  exercises: LoggedExercise[]
  bodyweight?: number
  notes?: string
  completed: boolean
}

// ---------- Running ----------

export type RunType = 'Intervalos' | 'Continuo' | 'Suave' | 'Test 5K'

export interface RunSessionTemplate {
  id: string
  label: string
  type: RunType
  description: string
  /** Duración estimada en minutos */
  durationMin: number
  /** Día de la semana en el que toca esta salida */
  day: string
  /** Salida opcional: solo si vas sobrado de energía */
  optional?: boolean
}

export interface RunLog {
  id: string
  date: string
  type: RunType
  distanceKm: number
  durationMin: number
  /** Cadencia media (pasos por minuto) si la mide */
  cadence?: number
  notes?: string
  rpe?: number
}

// ---------- Perfil ----------

export interface Profile {
  name: string
  age: number
  heightCm: number
  weightKg: number
  bodyFatPct: number
  level: string
  goalWeightKg: number
}

export interface BodyWeightEntry {
  date: string
  weightKg: number
}

// ---------- Periodización ----------

export interface PhaseConfig {
  fromWeek: number
  toWeek: number
  name: string
  targetRIR: number
  description: string
  deload?: boolean
}

// ---------- Estado global ----------

export interface AppState {
  version: number
  profile: Profile
  currentWeek: number
  blockLengthWeeks: number
  sessions: SessionLog[]
  runs: RunLog[]
  bodyweightLog: BodyWeightEntry[]
  onboarded: boolean
}
