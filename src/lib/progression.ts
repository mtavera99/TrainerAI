import type {
  ExercisePrescription,
  ExerciseTemplate,
  LoggedExercise,
  SessionLog,
  WorkoutDayTemplate,
} from '../types'
import { phaseForWeek } from '../data/program'

function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2
}

/** 1RM estimado (fórmula de Epley) */
export function estimated1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  return weight * (1 + reps / 30)
}

/** Volumen total de un ejercicio registrado (kg movidos) */
export function exerciseVolume(le: LoggedExercise): number {
  return le.sets.reduce(
    (acc, s) => acc + (s.done ? s.weight * s.reps : 0),
    0,
  )
}

/** Devuelve la sesión más reciente COMPLETADA para un día concreto */
export function lastSessionForDay(
  sessions: SessionLog[],
  dayId: string,
  beforeWeek?: number,
): SessionLog | undefined {
  return sessions
    .filter(
      (s) =>
        s.dayId === dayId &&
        s.completed &&
        (beforeWeek === undefined || s.week < beforeWeek),
    )
    .sort((a, b) => b.week - a.week || b.date.localeCompare(a.date))[0]
}

interface LastPerf {
  topWeight: number
  minRepsAtTop: number
  avgRir: number
  hasData: boolean
}

function analyzeLast(
  last: SessionLog | undefined,
  exerciseId: string,
): LastPerf {
  const empty: LastPerf = {
    topWeight: 0,
    minRepsAtTop: 0,
    avgRir: 0,
    hasData: false,
  }
  if (!last) return empty
  const le = last.exercises.find((e) => e.exerciseId === exerciseId)
  if (!le) return empty
  const working = le.sets.filter((s) => s.done && s.weight > 0 && s.reps > 0)
  if (working.length === 0) return empty
  const topWeight = Math.max(...working.map((s) => s.weight))
  const atTop = working.filter((s) => s.weight === topWeight)
  const minRepsAtTop = Math.min(...atTop.map((s) => s.reps))
  const avgRir =
    atTop.reduce((a, s) => a + s.rir, 0) / atTop.length
  return { topWeight, minRepsAtTop, avgRir, hasData: true }
}

/**
 * Calcula la prescripción de un ejercicio para la semana `week`
 * aplicando doble progresión + periodización de RIR + descarga.
 */
export function prescribeExercise(
  ex: ExerciseTemplate,
  week: number,
  sessions: SessionLog[],
  dayId: string,
): ExercisePrescription {
  const phase = phaseForWeek(week)
  const last = lastSessionForDay(sessions, dayId, week)
  const perf = analyzeLast(last, ex.id)

  // Semana de descarga
  if (phase.deload) {
    const deloadSets = Math.max(2, Math.round(ex.sets * 0.6))
    const suggested = perf.hasData
      ? roundToHalf(perf.topWeight * 0.9)
      : undefined
    return {
      exerciseId: ex.id,
      sets: deloadSets,
      repMin: ex.repMin,
      repMax: ex.repMax,
      targetRIR: phase.targetRIR,
      restSec: ex.restSec,
      suggestedWeight: suggested,
      rationale: perf.hasData
        ? `Descarga: baja a ~${suggested} kg y ${deloadSets} series, RIR ${phase.targetRIR}. Toca frenar para asimilar el bloque.`
        : `Descarga: ${deloadSets} series suaves, RIR ${phase.targetRIR}. Sin prisa.`,
    }
  }

  // Sin historial previo: primera vez que se hace el ejercicio
  if (!perf.hasData) {
    return {
      exerciseId: ex.id,
      sets: ex.sets,
      repMin: ex.repMin,
      repMax: ex.repMax,
      targetRIR: phase.targetRIR,
      restSec: ex.restSec,
      suggestedWeight: undefined,
      rationale: `Primera vez: elige un peso con el que hagas ${ex.repMin}-${ex.repMax} reps dejando ${phase.targetRIR} en recámara (RIR ${phase.targetRIR}). Anótalo y a partir de ahí progresamos.`,
    }
  }

  // Doble progresión
  const hitTopOfRange = perf.minRepsAtTop >= ex.repMax
  const roomByRir = perf.avgRir > phase.targetRIR + 0.5

  if (hitTopOfRange) {
    const newWeight = roundToHalf(perf.topWeight + ex.loadStep)
    return {
      exerciseId: ex.id,
      sets: ex.sets,
      repMin: ex.repMin,
      repMax: ex.repMax,
      targetRIR: phase.targetRIR,
      restSec: ex.restSec,
      suggestedWeight: newWeight,
      rationale: `Completaste ${ex.repMax}+ reps a ${perf.topWeight} kg en todas las series → sube a ${newWeight} kg y vuelve a apuntar a ${ex.repMin} reps. Sobrecarga progresiva.`,
    }
  }

  // No llegó al tope de reps: mantener peso y sumar repeticiones
  const extra = roomByRir
    ? ` Te sobró margen (RIR ~${perf.avgRir.toFixed(0)}), así que aprieta un poco más.`
    : ''
  return {
    exerciseId: ex.id,
    sets: ex.sets,
    repMin: ex.repMin,
    repMax: ex.repMax,
    targetRIR: phase.targetRIR,
    restSec: ex.restSec,
    suggestedWeight: perf.topWeight,
    rationale: `Mantén ${perf.topWeight} kg y suma 1-2 reps por serie hacia ${ex.repMax} (la vez pasada tu serie más floja fue ${perf.minRepsAtTop} reps).${extra}`,
  }
}

/** Prescripción de todo un día para una semana */
export function prescribeDay(
  day: WorkoutDayTemplate,
  week: number,
  sessions: SessionLog[],
): ExercisePrescription[] {
  return day.exercises.map((ex) =>
    prescribeExercise(ex, week, sessions, day.id),
  )
}
