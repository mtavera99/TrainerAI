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

/** Plantilla de un ejercicio dentro del programa base */
export interface ExerciseTemplate {
  id: string
  name: string
  muscle: MuscleGroup
  equipment: Equipment
  /** Rango de repeticiones objetivo (doble progresión) */
  repMin: number
  repMax: number
  /** Series de trabajo base */
  sets: number
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
}

/** Un día de entrenamiento del programa base */
export interface WorkoutDayTemplate {
  id: string
  name: string
  focus: string
  color: string
  exercises: ExerciseTemplate[]
}

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
  /** Explicación de por qué se sugiere esto (progresión) */
  rationale: string
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
