import type {
  ExercisePrescription,
  ExerciseTemplate,
  LoggedExercise,
  LoggedSwap,
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
//  · Las series suben dentro del bloque en los músculos prioritarios.
//  · Si llevas 2 sesiones sin mejorar, lo detecta y cambia de estrategia
//    en lugar de pedirte el mismo peso indefinidamente.
//
// ------------------------------------------------------------
// EL ÁMBITO DEL HISTORIAL: por qué la referencia de carga es POR DÍA
// ------------------------------------------------------------
// La primera versión llevaba UN solo historial por movimiento: las elevaciones
// laterales de martes, jueves y sábado compartían todo. La idea era buena
// (progresar como una sola cosa) pero producía dos fallos graves y visibles:
//
//  1) La carga sugerida se tomaba de la ÚLTIMA sesión cronológica del
//     movimiento, sin mirar de qué día era. En las laterales, que en el día de
//     espalda van en 5ª posición y en el de hombro casi al principio, los kilos
//     que se mueven no son los mismos. Resultado: el martes se prescribía el
//     peso del sábado anterior y el sábado el del jueves, así que la app
//     mandaba BAJAR el peso en días en los que sí se estaba progresando.
//
//  2) La detección de estancamiento comparaba el 1RM estimado de sesiones de
//     días distintos. El día "flojo" (mismo ejercicio, más fatiga acumulada)
//     nunca superaba el récord del día "fuerte", así que cada semana contaba
//     como una sesión sin mejorar. Con 3 sesiones semanales del mismo
//     movimiento, el contador llegaba a 2 SIEMPRE, y el motor aplicaba un
//     recorte del 7% de carga semana tras semana sobre un ejercicio que
//     estaba progresando. Un bucle de bajada, no un estancamiento real.
//
// A partir de aquí se distingue el ámbito:
//   · CARGA y ESTANCAMIENTO → historial del HUECO (mismo ejercicio, mismo día,
//     misma variante). Es la única comparación entre iguales que existe.
//   · FUERZA del movimiento → historial del MOVIMIENTO, para gráficas y para
//     ver el progreso global. No decide cargas.
//
// Y la variante cuenta: 20 kg de barra recta no son 20 kg de polea, así que
// cada variante lleva su propio historial (ver `LoggedSwap`).
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
// Historial de rendimiento
// ------------------------------------------------------------

/** Resumen de lo que hiciste en un ejercicio en una sesión */
export interface MovementPerformance {
  week: number
  date: string
  /** Hueco del programa al que corresponde (útil al mirar el movimiento entero) */
  exerciseId: string
  /** Variante realizada, si no fue la de plantilla */
  swap?: LoggedSwap
  /** Serie más pesada realizada */
  topWeight: number
  /** Reps de la serie más floja hecha con el peso top */
  minRepsAtTop: number
  /** Reps de la mejor serie con el peso top (la que manda para subir carga) */
  maxRepsAtTop: number
  /** RIR medio de las series al peso top */
  avgRirAtTop: number
  /** Mejor 1RM estimado de la sesión (corregido por RIR) */
  e1rm: number
  /** Series efectivas registradas */
  setsDone: number
}

/**
 * `slot`     → solo este ejercicio, en este día, con esta variante.
 *              Es el único ámbito en el que las cargas son comparables.
 * `movement` → todos los días donde aparece el movimiento. Sirve para ver la
 *              fuerza global, NO para decidir cargas.
 */
export type HistoryScope = 'slot' | 'movement'

export interface HistoryOptions {
  scope?: HistoryScope
  /** Variante concreta. `undefined` = el ejercicio de plantilla, sin sustituir */
  swapId?: string
  /** Mezclar todas las variantes (solo para gráficas de fuerza global) */
  anyVariant?: boolean
  beforeWeek?: number
}

/** La variante de un registro, normalizada: `undefined` = la de plantilla */
function swapIdOf(le: LoggedExercise): string | undefined {
  return le.swap?.id
}

function summarize(
  session: SessionLog,
  le: LoggedExercise,
): MovementPerformance | undefined {
  const working = le.sets.filter((st) => st.done && st.weight > 0 && st.reps > 0)
  if (working.length === 0) return undefined

  const topWeight = Math.max(...working.map((st) => st.weight))
  const atTop = working.filter((st) => st.weight === topWeight)

  return {
    week: session.week,
    date: session.date,
    exerciseId: le.exerciseId,
    swap: le.swap,
    topWeight,
    minRepsAtTop: Math.min(...atTop.map((st) => st.reps)),
    maxRepsAtTop: Math.max(...atTop.map((st) => st.reps)),
    avgRirAtTop: atTop.reduce((a, st) => a + (st.rir || 0), 0) / atTop.length,
    e1rm: Math.max(
      ...working.map((st) => estimated1RMWithRIR(st.weight, st.reps, st.rir)),
    ),
    setsDone: working.length,
  }
}

/**
 * Historial ordenado de más reciente a más antiguo.
 *
 * Un registro por EJERCICIO y sesión, no por sesión: si un día llevara dos
 * huecos del mismo movimiento, cada uno cuenta por separado en lugar de
 * fundirse en un único resumen que mezcla cargas distintas.
 */
export function performanceHistory(
  sessions: SessionLog[],
  exerciseId: string,
  opts: HistoryOptions = {},
): MovementPerformance[] {
  const { scope = 'slot', swapId, anyVariant = false, beforeWeek } = opts

  const ids =
    scope === 'movement'
      ? new Set(exerciseIdsForMovement(movementIdOf(exerciseId)))
      : new Set([exerciseId])

  const out: MovementPerformance[] = []

  for (const s of sessions) {
    if (!s.completed) continue
    if (beforeWeek !== undefined && s.week >= beforeWeek) continue

    for (const le of s.exercises) {
      if (!ids.has(le.exerciseId)) continue
      // Sin esto, una sustitución con barra recta contaminaría el historial de
      // la polea y la app sugeriría kilos de un material en el otro.
      if (!anyVariant && swapIdOf(le) !== swapId) continue
      const perf = summarize(s, le)
      if (perf) out.push(perf)
    }
  }

  return out.sort((a, b) => b.week - a.week || b.date.localeCompare(a.date))
}

/** Historial del HUECO: mismo ejercicio, mismo día, misma variante */
export function slotHistory(
  sessions: SessionLog[],
  exerciseId: string,
  swapId?: string,
  beforeWeek?: number,
): MovementPerformance[] {
  return performanceHistory(sessions, exerciseId, {
    scope: 'slot',
    swapId,
    beforeWeek,
  })
}

/**
 * Historial del MOVIMIENTO completo (todos sus días y variantes). Es la vista
 * de "cómo va mi fuerza en este movimiento"; no decide cargas.
 */
export function movementHistory(
  sessions: SessionLog[],
  exerciseId: string,
  beforeWeek?: number,
): MovementPerformance[] {
  return performanceHistory(sessions, exerciseId, {
    scope: 'movement',
    anyVariant: true,
    beforeWeek,
  })
}

/**
 * Última variante usada en un hueco. Es lo que permite que, si sueles hacer el
 * antebrazo con barra recta, la app te la ofrezca ya elegida la próxima vez en
 * lugar de volver a la polea cada semana.
 */
export function lastSwapForSlot(
  sessions: SessionLog[],
  exerciseId: string,
): LoggedSwap | undefined {
  const withData = performanceHistory(sessions, exerciseId, {
    scope: 'slot',
    anyVariant: true,
  })
  return withData[0]?.swap
}

// ------------------------------------------------------------
// Escalado de volumen dentro del bloque
// ------------------------------------------------------------

/**
 * Series planificadas para la semana. Los ejercicios con `maxSets` (las
 * piernas) ganan una serie cada bloque de 3 semanas hasta su techo; el resto
 * se mantiene fijo. En descarga se recorta ~40%.
 *
 * AUTORREGULACIÓN: el volumen extra solo se aplica si ese movimiento SIGUE
 * PROGRESANDO. Añadir series encima de un ejercicio que ya está estancado no
 * produce más músculo, produce más fatiga: si detectamos estancamiento, el
 * escalado se retiene un escalón hasta que la carga vuelva a subir. Así el
 * techo de volumen lo marcan tus datos y no un número que yo haya elegido.
 */
export function plannedSets(
  ex: ExerciseTemplate,
  week: number,
  phase: PhaseConfig = phaseForWeek(week),
  sessions?: SessionLog[],
  swap?: LoggedSwap,
): { sets: number; added: number; held: boolean } {
  if (phase.deload) {
    return { sets: Math.max(2, Math.round(ex.sets * 0.6)), added: 0, held: false }
  }

  const ceiling = ex.maxSets ?? ex.sets
  let bump = Math.max(0, Math.floor((week - 1) / 3))
  let held = false

  if (bump > 0 && ceiling > ex.sets && sessions && sessions.length > 0) {
    // Se juzga sobre el historial del HUECO y de la variante que de verdad
    // usas: comparar días distintos daba estancamientos que no existían.
    const variant = swap ?? lastSwapForSlot(sessions, ex.id)
    const history = slotHistory(sessions, ex.id, variant?.id, week)
    if (checkStagnation(history).stagnant) {
      bump -= 1
      held = true
    }
  }

  const sets = Math.min(ceiling, ex.sets + bump)
  return { sets, added: sets - ex.sets, held }
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
 * Compara el 1RM estimado de las últimas sesiones DEL MISMO HUECO. Dos
 * sesiones seguidas sin mejorar es la señal de que hay que cambiar algo
 * (carga, descanso o ejercicio), no de insistir con lo mismo.
 *
 * OJO: hay que pasarle un historial de ámbito `slot`. Con el historial del
 * movimiento entero mezclaba días con fatiga distinta y el día flojo contaba
 * como "sin mejorar" todas las semanas, disparando un recorte de carga
 * permanente sobre ejercicios que estaban progresando.
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
 *
 * `swap` es la variante que se va a hacer hoy (barra recta en lugar de polea,
 * por ejemplo). Cambia el escalón de carga y, sobre todo, el historial que se
 * consulta: cada variante progresa con sus propios kilos.
 */
export function prescribeExercise(
  ex: ExerciseTemplate,
  week: number,
  sessions: SessionLog[],
  swap?: LoggedSwap,
): ExercisePrescription {
  const phase = phaseForWeek(week)
  const targetRIR = phase.targetRIR
  const { sets, added, held } = plannedSets(ex, week, phase, sessions, swap)

  // La referencia de carga sale del MISMO hueco y la MISMA variante: es la
  // única comparación entre iguales. Mirar el movimiento entero hacía que el
  // martes heredara los kilos del sábado y viceversa.
  const history = slotHistory(sessions, ex.id, swap?.id, week)
  const last = history[0]

  const loadStep =
    swap?.loadStep && swap.loadStep > 0 ? swap.loadStep : ex.loadStep
  const equipment = swap?.equipment ?? ex.equipment

  const base = {
    exerciseId: ex.id,
    sets,
    repMin: ex.repMin,
    repMax: ex.repMax,
    targetRIR,
    restSec: ex.restSec,
    addedSets: added > 0 ? added : undefined,
    variantName: swap?.name,
    lastTop: last
      ? {
          weight: last.topWeight,
          reps: last.minRepsAtTop,
          repsBest: last.maxRepsAtTop,
          rir: round1(last.avgRirAtTop),
          week: last.week,
        }
      : undefined,
  }

  // --- Ejercicios sin carga externa (colgado, peso corporal) ---
  if (loadStep === 0 && equipment === 'Peso corporal') {
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
      ? roundToStep(last.topWeight * 0.9, loadStep)
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

  // --- Primera vez en este hueco ---
  if (!last) {
    // Aunque no haya historial de ESTE día, puede haberlo del mismo movimiento
    // y la misma variante en otro día. Sirve como punto de partida: sin esto,
    // pasar la carga a un ámbito por día obligaría a recalibrar cada hueco
    // desde cero, que es peor que el problema que se quería arreglar.
    const seed = performanceHistory(sessions, ex.id, {
      scope: 'movement',
      swapId: swap?.id,
      beforeWeek: week,
    })[0]

    if (seed) {
      return {
        ...base,
        suggestedWeight: roundToStep(seed.topWeight, loadStep),
        targetReps: ex.repMin,
        e1rm: Math.round(seed.e1rm),
        action: 'primera-vez',
        rationale: `Primera vez que registras este ejercicio en este día, así que de momento tomo como referencia lo que moviste en otro día del mismo movimiento (S${seed.week}: ${seed.topWeight} kg × ${seed.maxRepsAtTop}). Ajústalo a lo que puedas hoy sin miedo: la posición dentro del entreno cambia mucho los kilos, y a partir de esta sesión este día ya progresa con su propio historial.`,
      }
    }

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

  // --- Estancamiento real: 2+ sesiones del MISMO día sin avanzar ---
  //
  // Un retroceso aislado ya NO dispara el recorte. Antes bastaba una sesión
  // peor que la anterior para bajar la carga un 7%, y con un mal día (dormir
  // poco, fútbol la víspera) el motor te castigaba una semana entera. Ahora
  // hace falta que se repita: dos sesiones sin superar el récord del hueco.
  if (stag.stagnant) {
    const target = last.topWeight * (1 - STAGNATION_BACKOFF)
    const suggested = roundToStep(target, loadStep)
    return {
      ...base,
      suggestedWeight: suggested,
      targetReps: ex.repMax,
      e1rm: Math.round(e1rm),
      action: 'romper-estancamiento',
      alert: `${stag.sessionsWithoutProgress} sesiones de este día sin mejorar.`,
      rationale:
        `Llevas ${stag.sessionsWithoutProgress} sesiones de este día sin avanzar aquí, así que insistir con ${last.topWeight} kg no va a funcionar. Baja a ${suggested} kg y busca ${ex.repMax} reps limpias con técnica perfecta y descanso completo (${ex.restSec}s): reconstruyes desde una carga que sí puedes dominar y en 2 semanas superas el tope anterior. Si vuelve a atascarse, revisa sueño, comida y si estás llegando de verdad a RIR ${targetRIR}.` +
        (held
          ? ` También he retenido la serie extra de volumen que tocaba en esta fase: no tiene sentido añadir más trabajo encima de un ejercicio que no avanza. Volverá cuando la carga vuelva a subir.`
          : ''),
    }
  }

  // ----------------------------------------------------------
  // ¿Toca subir la carga? La regla mira DOS cosas distintas:
  //
  //   · la MEJOR serie (`maxRepsAtTop`) dice si la carga ya te queda corta
  //   · la PEOR serie (`minRepsAtTop`) dice si aguantas todas las series
  //
  // Antes solo se miraba la peor y se exigía que llegara al tope del rango.
  // Con 4 series y un rango de 12-20 reps eso no ocurre nunca: la última
  // serie siempre cae por fatiga. El resultado era un ejercicio condenado a
  // "mantén el peso y suma 1 rep" para siempre, con un objetivo por debajo de
  // lo que ya habías hecho en la primera serie. Es justo lo que pasaba con las
  // elevaciones laterales.
  //
  // La regla correcta: subes cuando has TOCADO el techo del rango en tu mejor
  // serie y NINGUNA serie se ha caído por debajo del mínimo. Es decir, todas
  // las series están dentro del rango prescrito y el techo ya se alcanzó.
  // ----------------------------------------------------------
  const reachedTop = last.maxRepsAtTop >= ex.repMax
  const allInsideRange = last.minRepsAtTop >= ex.repMin

  if (reachedTop && allInsideRange) {
    const ideal = loadForTarget(e1rm, ex.repMin, targetRIR)
    const floor = last.topWeight + loadStep
    const suggested = clampWeight(
      Math.max(ideal, floor),
      last.topWeight,
      loadStep,
    )
    const jump = round1(suggested - last.topWeight)
    return {
      ...base,
      suggestedWeight: suggested,
      targetReps: ex.repMin,
      e1rm: Math.round(e1rm),
      action: 'subir-peso',
      rationale: `La última vez a ${last.topWeight} kg llegaste a ${last.maxRepsAtTop} reps (tope del rango) y ninguna serie bajó de ${ex.repMin}: eso es exactamente la señal de subir. Tu 1RM estimado ahí ya es ~${Math.round(
        e1rm,
      )} kg. Ve a ${suggested} kg (+${jump}) y vuelve al pie del rango, ${ex.repMin} reps a RIR ${targetRIR}. No hace falta que las ${sets} series lleguen a ${ex.repMax}: que caigan por fatiga es normal y esperado, lo que cuenta es que se queden dentro del rango.`,
    }
  }

  // --- Dejó demasiado margen: la carga se queda corta ---
  if (last.avgRirAtTop >= targetRIR + 1.5) {
    const ideal = loadForTarget(e1rm, last.maxRepsAtTop, targetRIR)
    // Redondeamos HACIA ARRIBA: si el ideal cae entre dos discos, con este
    // margen de RIR interesa el de arriba. Redondeando a la baja el peso se
    // quedaba clavado y el aviso no servía de nada.
    const capped = Math.min(ideal, last.topWeight * (1 + MAX_WEEKLY_INCREASE))
    const suggested =
      capped > last.topWeight * 1.01
        ? Math.max(last.topWeight + loadStep, roundToStep(capped, loadStep))
        : last.topWeight
    if (suggested > last.topWeight) {
      return {
        ...base,
        suggestedWeight: suggested,
        targetReps: Math.max(ex.repMin, last.minRepsAtTop),
        e1rm: Math.round(e1rm),
        action: 'ajustar-por-rir',
        rationale: `Hiciste hasta ${last.maxRepsAtTop} reps a ${last.topWeight} kg pero anotaste RIR ~${round1(
          last.avgRirAtTop,
        )}: te sobraron ${round1(
          last.avgRirAtTop - targetRIR,
        )} reps respecto al objetivo de esta fase (RIR ${targetRIR}). Con esa carga no estás estimulando lo suficiente. Ve a ${suggested} kg manteniendo las reps: ahí sí acabarás a RIR ${targetRIR}.`,
      }
    }
  }

  // --- Alguna serie se cayó por debajo del rango: consolidar antes de subir ---
  if (!allInsideRange) {
    const gap = ex.repMin - last.minRepsAtTop
    return {
      ...base,
      suggestedWeight: last.topWeight,
      targetReps: ex.repMin,
      e1rm: Math.round(e1rm),
      action: 'consolidar',
      rationale: `Con ${last.topWeight} kg llegaste a ${last.maxRepsAtTop} reps en tu mejor serie, así que de fuerza vas bien: el problema es que la más floja se quedó en ${last.minRepsAtTop} y el mínimo del rango es ${ex.repMin}. No es que la carga sea excesiva, es que ${sets} series a ese peso todavía te pasan factura. Mantén ${last.topWeight} kg y trabaja las últimas series: te ${
        gap === 1 ? 'falta 1 rep' : `faltan ${gap} reps`
      } para que ninguna baje de ${ex.repMin}. Si no llegas, alarga el descanso a ${ex.restSec}s antes de tocar el peso. En cuanto todas entren en el rango, subimos carga.`,
    }
  }

  // --- Camino normal: mismo peso, más reps (doble progresión) ---
  const targetReps = Math.min(ex.repMax, last.maxRepsAtTop + 1)
  const repsLeft = ex.repMax - last.maxRepsAtTop
  return {
    ...base,
    suggestedWeight: last.topWeight,
    targetReps,
    e1rm: Math.round(e1rm),
    action: 'sumar-reps',
    rationale: `Mantén ${last.topWeight} kg. Tu mejor serie fueron ${last.maxRepsAtTop} reps y la más floja ${last.minRepsAtTop}, todas dentro del rango: sube a ${targetReps} en la primera serie y deja que las demás caigan donde caigan sin bajar de ${ex.repMin}. Te ${
      repsLeft === 1 ? 'queda 1 rep' : `quedan ${repsLeft} reps`
    } para tocar el techo del rango y ganarte el aumento de carga. Añadir reps con el mismo peso es sobrecarga progresiva igual que añadir kilos.`,
  }
}

/**
 * Prescripción de todo un día para una semana.
 *
 * `swaps` mapea id de ejercicio → variante elegida hoy, para que la carga se
 * calcule con el historial de esa variante y no con el de la de plantilla.
 */
export function prescribeDay(
  day: WorkoutDayTemplate,
  week: number,
  sessions: SessionLog[],
  swaps: Record<string, LoggedSwap | undefined> = {},
): ExercisePrescription[] {
  return day.exercises.map((ex) =>
    prescribeExercise(ex, week, sessions, swaps[ex.id]),
  )
}
