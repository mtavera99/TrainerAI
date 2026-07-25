import type {
  ExercisePrescription,
  ExerciseTemplate,
  LoggedExercise,
  PhaseConfig,
  ProgressionAction,
  SessionLog,
  WorkoutDayTemplate,
} from '../types'
import {
  exerciseIdsForMovement,
  movementIdOf,
  phaseForWeek,
} from '../data/program'

// ============================================================
// MOTOR DE PROGRESIÓN
// ------------------------------------------------------------
// La idea: tú registras kg, reps y RIR. A partir de ahí la app estima tu
// fuerza real en ese movimiento (1RM estimado corregido por el RIR que
// anotaste) y despeja hacia atrás qué carga necesitas para cumplir el
// objetivo de la semana siguiente. No es "sube 2,5 kg y reza": si dejaste
// 3 reps en recámara cuando el objetivo era 1, el salto será mayor; si te
// quedaste corto, se ajusta a la baja.
//
// Además:
//  · El historial es POR MOVIMIENTO, no por casilla del día. Las laterales
//    de martes/jueves/sábado son el mismo ejercicio y progresan juntas.
//  · Las series suben dentro del bloque en los músculos prioritarios.
//  · Si llevas 2 sesiones sin mejorar, lo detecta y cambia de estrategia
//    en lugar de pedirte el mismo peso indefinidamente.
// ============================================================

/** Techo de subida por sesión: más de esto casi nunca es real, es error de registro */
const MAX_WEEKLY_INCREASE = 0.12
/** Suelo: no bajamos más de esto salvo descarga o estancamiento */
const MAX_WEEKLY_DECREASE = 0.08
/** Cuánto se recorta la carga para romper un estancamiento */
const STAGNATION_BACKOFF = 0.07

function roundToStep(weight: number, step: number): number {
  if (!Number.isFinite(weight) || weight <= 0) return 0
  const s = step && step > 0 ? step : 0.5
  return Math.round(weight / s) * s
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** 1RM estimado (Epley) a partir de una serie llevada al fallo */
export function estimated1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  return weight * (1 + reps / 30)
}

/**
 * 1RM estimado corrigiendo por RIR: si hiciste 10 reps dejando 2 en
 * recámara, tu verdadero máximo a ese peso eran ~12 reps. Sin esta
 * corrección, entrenar con RIR alto hace parecer que eres más débil de lo
 * que eres y la app te subestima la carga semana tras semana.
 */
export function estimated1RMWithRIR(
  weight: number,
  reps: number,
  rir: number,
): number {
  const repsToFailure = reps + Math.max(0, rir || 0)
  return estimated1RM(weight, repsToFailure)
}

/**
 * Carga necesaria para hacer `reps` repeticiones dejando `rir` en recámara,
 * dado un 1RM estimado. Es la fórmula de Epley despejada: esto es lo que
 * convierte "lo que hiciste" en "lo que deberías cargar".
 */
export function loadForTarget(e1rm: number, reps: number, rir: number): number {
  const repsToFailure = reps + Math.max(0, rir || 0)
  if (e1rm <= 0 || repsToFailure <= 0) return 0
  return e1rm / (1 + repsToFailure / 30)
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

// ------------------------------------------------------------
// Historial por movimiento
// ------------------------------------------------------------

/** Resumen de lo que hiciste en un movimiento en una sesión */
export interface MovementPerformance {
  week: number
  date: string
  /** Serie más pesada realizada */
  topWeight: number
  /** Reps de la serie más floja hecha con el peso top (lo que manda para subir) */
  minRepsAtTop: number
  /** Reps de la mejor serie con el peso top */
  maxRepsAtTop: number
  /** RIR medio de las series al peso top */
  avgRirAtTop: number
  /** Mejor 1RM estimado de la sesión (corregido por RIR) */
  e1rm: number
  /** Series efectivas registradas */
  setsDone: number
}

/**
 * Historial del movimiento ordenado de más reciente a más antiguo,
 * mirando TODOS los días donde aparece ese movimiento.
 */
export function movementHistory(
  sessions: SessionLog[],
  exerciseId: string,
  beforeWeek?: number,
): MovementPerformance[] {
  const ids = new Set(exerciseIdsForMovement(movementIdOf(exerciseId)))
  const out: MovementPerformance[] = []

  for (const s of sessions) {
    if (!s.completed) continue
    if (beforeWeek !== undefined && s.week >= beforeWeek) continue

    const logged = s.exercises.filter((e) => ids.has(e.exerciseId))
    if (logged.length === 0) continue

    const working = logged
      .flatMap((e) => e.sets)
      .filter((st) => st.done && st.weight > 0 && st.reps > 0)
    if (working.length === 0) continue

    const topWeight = Math.max(...working.map((st) => st.weight))
    const atTop = working.filter((st) => st.weight === topWeight)
    const e1rm = Math.max(
      ...working.map((st) => estimated1RMWithRIR(st.weight, st.reps, st.rir)),
    )

    out.push({
      week: s.week,
      date: s.date,
      topWeight,
      minRepsAtTop: Math.min(...atTop.map((st) => st.reps)),
      maxRepsAtTop: Math.max(...atTop.map((st) => st.reps)),
      avgRirAtTop:
        atTop.reduce((a, st) => a + (st.rir || 0), 0) / atTop.length,
      e1rm,
      setsDone: working.length,
    })
  }

  return out.sort((a, b) => b.week - a.week || b.date.localeCompare(a.date))
}

// ------------------------------------------------------------
// Escalado de volumen dentro del bloque
// ------------------------------------------------------------

/**
 * Series planificadas para la semana. Los ejercicios con `maxSets` (las
 * piernas) ganan una serie cada bloque de 3 semanas hasta su techo; el resto
 * se mantiene fijo. En descarga se recorta ~40%.
 */
export function plannedSets(
  ex: ExerciseTemplate,
  week: number,
  phase: PhaseConfig = phaseForWeek(week),
): { sets: number; added: number } {
  const ceiling = ex.maxSets ?? ex.sets
  const bump = Math.max(0, Math.floor((week - 1) / 3))
  const base = Math.min(ceiling, ex.sets + bump)

  if (phase.deload) {
    return { sets: Math.max(2, Math.round(ex.sets * 0.6)), added: 0 }
  }
  return { sets: base, added: base - ex.sets }
}

// ------------------------------------------------------------
// Detección de estancamiento
// ------------------------------------------------------------

export interface StagnationCheck {
  stagnant: boolean
  regressing: boolean
  sessionsWithoutProgress: number
}

/**
 * Compara el 1RM estimado de las últimas sesiones. Dos sesiones seguidas
 * sin mejorar es la señal de que hay que cambiar algo (carga, descanso o
 * ejercicio), no de insistir con lo mismo.
 */
export function checkStagnation(
  history: MovementPerformance[],
): StagnationCheck {
  if (history.length < 3) {
    return { stagnant: false, regressing: false, sessionsWithoutProgress: 0 }
  }

  // Contamos cuántas de las sesiones más recientes NO superaron el mejor
  // registro que ya existía antes de ellas. Margen del 0,5% para que el
  // redondeo de los discos no cuente como estancamiento.
  let without = 0
  for (let i = 0; i < history.length - 1; i++) {
    const bestBefore = Math.max(
      ...history.slice(i + 1).map((h) => h.e1rm),
    )
    if (history[i].e1rm > bestBefore * 1.005) break
    without++
  }

  return {
    stagnant: without >= 2,
    regressing: history[0].e1rm < history[1].e1rm * 0.97,
    sessionsWithoutProgress: without,
  }
}

// ------------------------------------------------------------
// Prescripción
// ------------------------------------------------------------

function clampWeight(
  target: number,
  reference: number,
  step: number,
  opts: { allowBigDrop?: boolean } = {},
): number {
  const max = reference * (1 + MAX_WEEKLY_INCREASE)
  const min = opts.allowBigDrop
    ? 0
    : reference * (1 - MAX_WEEKLY_DECREASE)
  return roundToStep(Math.min(max, Math.max(min, target)), step)
}

/**
 * Calcula la prescripción de un ejercicio para la semana `week`:
 * carga y reps objetivo, series según la fase, y el porqué.
 */
export function prescribeExercise(
  ex: ExerciseTemplate,
  week: number,
  sessions: SessionLog[],
  _dayId?: string,
): ExercisePrescription {
  const phase = phaseForWeek(week)
  const targetRIR = phase.targetRIR
  const { sets, added } = plannedSets(ex, week, phase)
  const history = movementHistory(sessions, ex.id, week)
  const last = history[0]

  const base = {
    exerciseId: ex.id,
    sets,
    repMin: ex.repMin,
    repMax: ex.repMax,
    targetRIR,
    restSec: ex.restSec,
    addedSets: added > 0 ? added : undefined,
    lastTop: last
      ? {
          weight: last.topWeight,
          reps: last.minRepsAtTop,
          rir: round1(last.avgRirAtTop),
          week: last.week,
        }
      : undefined,
  }

  // --- Ejercicios sin carga externa (colgado, peso corporal) ---
  if (ex.loadStep === 0 && ex.equipment === 'Peso corporal') {
    const action: ProgressionAction = last ? 'sumar-reps' : 'primera-vez'
    return {
      ...base,
      suggestedWeight: undefined,
      targetReps: last
        ? Math.min(ex.repMax, last.maxRepsAtTop + 1)
        : ex.repMin,
      action,
      rationale: last
        ? `La última vez llegaste a ${last.maxRepsAtTop} reps. Apunta a ${Math.min(
            ex.repMax,
            last.maxRepsAtTop + 1,
          )} con la misma calidad de movimiento; cuando superes ${ex.repMax} en todas las series, añade lastre.`
        : `Sin lastre: haz ${ex.repMin}-${ex.repMax} reps controladas y anótalas para tener referencia.`,
    }
  }

  // --- Semana de descarga ---
  if (phase.deload) {
    const suggested = last
      ? roundToStep(last.topWeight * 0.9, ex.loadStep)
      : undefined
    return {
      ...base,
      suggestedWeight: suggested,
      targetReps: ex.repMin,
      e1rm: last ? Math.round(last.e1rm) : undefined,
      action: 'descarga',
      rationale: last
        ? `Descarga: ${suggested} kg (90% de tus ${last.topWeight} kg) × ${ex.repMin}-${ex.repMax} y ${sets} series, RIR ${targetRIR}. Debe sobrarte de todo: es la semana en la que el músculo construido en el bloque se materializa.`
        : `Descarga: ${sets} series suaves con RIR ${targetRIR}. Sin buscar récords.`,
    }
  }

  // --- Primera vez con el movimiento ---
  if (!last) {
    return {
      ...base,
      suggestedWeight: undefined,
      targetReps: ex.repMax,
      action: 'primera-vez',
      rationale: `Primera vez con este ejercicio: busca un peso con el que llegues a ${ex.repMax} reps dejando ${targetRIR} en recámara (RIR ${targetRIR}). Prueba una serie de aproximación, ajusta y anota lo que hagas de verdad: a partir de esa cifra la app ya calcula sola.`,
    }
  }

  const e1rm = last.e1rm
  const stag = checkStagnation(history)

  // --- Retroceso o estancamiento de 2+ sesiones ---
  if (stag.stagnant || stag.regressing) {
    const target = last.topWeight * (1 - STAGNATION_BACKOFF)
    const suggested = roundToStep(target, ex.loadStep)
    return {
      ...base,
      suggestedWeight: suggested,
      targetReps: ex.repMax,
      e1rm: Math.round(e1rm),
      action: 'romper-estancamiento',
      alert: stag.regressing
        ? 'Has retrocedido respecto a la sesión anterior.'
        : `${stag.sessionsWithoutProgress} sesiones sin mejorar en este ejercicio.`,
      rationale: `Llevas ${stag.sessionsWithoutProgress} sesiones sin avanzar aquí, así que insistir con ${last.topWeight} kg no va a funcionar. Baja a ${suggested} kg y busca ${ex.repMax} reps limpias con técnica perfecta y descanso completo (${ex.restSec}s): reconstruyes desde una carga que sí puedes dominar y en 2 semanas superas el tope anterior. Si vuelve a atascarse, revisa sueño, comida y si estás llegando de verdad a RIR ${targetRIR}.`,
    }
  }

  // --- Alcanzó el tope del rango: toca subir carga ---
  if (last.minRepsAtTop >= ex.repMax) {
    const ideal = loadForTarget(e1rm, ex.repMin, targetRIR)
    const floor = last.topWeight + ex.loadStep
    const suggested = clampWeight(
      Math.max(ideal, floor),
      last.topWeight,
      ex.loadStep,
    )
    const jump = round1(suggested - last.topWeight)
    return {
      ...base,
      suggestedWeight: suggested,
      targetReps: ex.repMin,
      e1rm: Math.round(e1rm),
      action: 'subir-peso',
      rationale: `Cerraste las ${sets} series a ${last.topWeight} kg con ${last.minRepsAtTop}+ reps (RIR ~${round1(
        last.avgRirAtTop,
      )}), o sea que tu 1RM estimado ahí ya es ~${Math.round(
        e1rm,
      )} kg. Sube a ${suggested} kg (+${jump}) y vuelve al pie del rango: ${ex.repMin} reps a RIR ${targetRIR}. Cuando vuelvas a llegar a ${ex.repMax}, subimos otra vez.`,
    }
  }

  // --- Dejó demasiado margen: la carga se queda corta ---
  if (last.avgRirAtTop >= targetRIR + 1.5) {
    const ideal = loadForTarget(e1rm, last.minRepsAtTop, targetRIR)
    // Redondeamos HACIA ARRIBA: si el ideal cae entre dos discos, con este
    // margen de RIR interesa el de arriba. Redondeando a la baja el peso se
    // quedaba clavado y el aviso no servía de nada.
    const capped = Math.min(ideal, last.topWeight * (1 + MAX_WEEKLY_INCREASE))
    const suggested =
      capped > last.topWeight * 1.01
        ? Math.max(
            last.topWeight + ex.loadStep,
            roundToStep(capped, ex.loadStep),
          )
        : last.topWeight
    if (suggested > last.topWeight) {
      return {
        ...base,
        suggestedWeight: suggested,
        targetReps: Math.max(ex.repMin, last.minRepsAtTop),
        e1rm: Math.round(e1rm),
        action: 'ajustar-por-rir',
        rationale: `Hiciste ${last.minRepsAtTop} reps a ${last.topWeight} kg pero anotaste RIR ~${round1(
          last.avgRirAtTop,
        )}: te sobraron ${round1(
          last.avgRirAtTop - targetRIR,
        )} reps respecto al objetivo de esta fase (RIR ${targetRIR}). Con esa carga no estás estimulando lo suficiente. Ve a ${suggested} kg manteniendo las ${last.minRepsAtTop} reps: ahí sí acabarás a RIR ${targetRIR}.`,
      }
    }
  }

  // --- Camino normal: mismo peso, más reps (doble progresión) ---
  const targetReps = Math.min(ex.repMax, last.minRepsAtTop + 1)
  const repsLeft = ex.repMax - last.minRepsAtTop
  return {
    ...base,
    suggestedWeight: last.topWeight,
    targetReps,
    e1rm: Math.round(e1rm),
    action: 'sumar-reps',
    rationale: `Mantén ${last.topWeight} kg y sube a ${targetReps} reps en todas las series (tu serie más floja fueron ${last.minRepsAtTop}). Te ${
      repsLeft === 1 ? 'queda 1 rep' : `quedan ${repsLeft} reps`
    } para tocar el tope del rango y ganarte el aumento de carga. Añadir reps con el mismo peso es sobrecarga progresiva igual que añadir kilos.`,
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
