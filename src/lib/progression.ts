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
  findExercise,
  movementIdOf,
  phaseForWeek,
} from '../data/program'

// ============================================================
// MOTOR DE PROGRESIÓN
// ------------------------------------------------------------
// Tú registras kg, reps y RIR. A partir de ahí la app estima tu fuerza real en
// ese movimiento (1RM estimado corregido por el RIR que anotaste) y despeja
// hacia atrás qué carga necesitas para cumplir el objetivo de la semana
// siguiente. No es "sube 2,5 kg y reza".
//
// ============================================================
// LOS TRES FALLOS QUE HACÍAN QUE LA CARGA NUNCA SUBIERA
// ------------------------------------------------------------
// Durante el bloque anterior la app prescribía prácticamente el mismo peso
// todas las semanas. No era una sensación: eran tres fallos acumulados, y los
// tres están corregidos aquí.
//
//  1) EL HISTORIAL SE LEÍA POR NÚMERO DE SEMANA, NO POR FECHA.
//     El motor pedía "sesiones con week < semanaActual". La semana se avanza a
//     mano con las flechas de la pestaña Entreno, así que si no la movías —o si
//     repetías un día dentro de la misma semana— tu última sesión quedaba
//     FUERA del historial y el motor prescribía como si no existiera. Podías
//     registrar diez entrenos y seguir viendo "primera vez: calibra".
//     Ahora el historial es CRONOLÓGICO (por fecha) y solo se excluye la
//     sesión que estás editando en ese momento. El número de semana ya no
//     decide nada sobre la carga: solo la fase y el RIR objetivo.
//
//  2) SOLO CONTABAN LAS SESIONES "FINALIZADAS".
//     El autoguardado guarda como borrador (`completed: false`). Si salías con
//     la flecha atrás en lugar de pulsar Finalizar, el entreno quedaba
//     completo en la pantalla pero INVISIBLE para la progresión, el volumen y
//     las gráficas. Ahora cuenta como evidencia cualquier sesión con series
//     marcadas y kilos y reps reales (`hasEvidence`); `completed` pasa a ser
//     solo una etiqueta de la interfaz.
//
//  3) LA PUERTA PARA SUBIR PESO ERA IMPOSIBLE DE ATRAVESAR.
//     Se exigía tocar el TECHO del rango. Con rangos de 12-20 reps (laterales
//     3x/semana, antebrazo 3x/semana, aductores, gemelos sentado, crunch,
//     cruce de cables) llegar a 20 reps limpias con RIR bajo no pasa casi
//     nunca, así que el ejercicio caía eternamente en "mantén el peso y suma
//     1 rep". Ahora hay CUATRO puertas independientes (ver `raiseDecision`) y,
//     además, se han estrechado los rangos en el programa: un rango de 8 reps
//     de amplitud no es doble progresión, es una cinta de correr.
//
// ------------------------------------------------------------
// EL ÁMBITO DEL HISTORIAL: la carga se juzga POR HUECO
// ------------------------------------------------------------
//   · CARGA y ESTANCAMIENTO → historial del HUECO (mismo ejercicio, mismo día,
//     misma variante). Es la única comparación entre iguales que existe: las
//     laterales del jueves van en 5º lugar y las del sábado casi al principio,
//     así que los kilos no son los mismos.
//   · FUERZA del movimiento → historial del MOVIMIENTO, para gráficas. No
//     decide kilos.
// Y la variante cuenta: 20 kg de barra recta no son 20 kg de polea.
// ============================================================

/** Techo de subida por sesión: más de esto casi nunca es real, es error de registro */
const MAX_WEEKLY_INCREASE = 0.12
/** Suelo: no bajamos más de esto salvo descarga o estancamiento */
const MAX_WEEKLY_DECREASE = 0.08
/** Cuánto se recorta la carga para romper un estancamiento */
const STAGNATION_BACKOFF = 0.07
/**
 * Sesiones seguidas con el MISMO peso top, estando todas las series dentro del
 * rango, a partir de las cuales se fuerza una subida de un escalón.
 *
 * Es el seguro contra el fallo nº3. Si llevas tres sesiones moviendo lo mismo y
 * completando el rango, el que está atascado es el rango, no tú.
 */
const LOAD_PLATEAU_SESSIONS = 3

function roundToStep(weight: number, step: number): number {
  if (!Number.isFinite(weight) || weight <= 0) return 0
  const s = step && step > 0 ? step : 0.5
  return Math.round(weight / s) * s
}

/**
 * Redondea HACIA ABAJO al escalón, garantizando que baja al menos un escalón
 * respecto a la referencia.
 *
 * Hace falta porque redondear al más cercano puede deshacer el recorte: un
 * backoff del 7% sobre 15 kg da 13,95, y con discos de 2,5 el redondeo normal
 * lo devuelve a 15 kg. Es decir, la app decía "baja la carga" y prescribía
 * exactamente el mismo peso, con lo que el ejercicio se quedaba atascado con un
 * cartel de estancamiento puesto para siempre.
 */
function roundDownToStep(
  weight: number,
  step: number,
  reference: number,
): number {
  const s = step && step > 0 ? step : 0.5
  if (!Number.isFinite(weight) || weight <= 0) return 0
  let out = Math.floor(weight / s) * s
  if (out >= reference) out = reference - s
  return Math.max(s, Math.round(out * 100) / 100)
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

/**
 * ¿Esta sesión contiene entrenamiento real?
 *
 * El criterio ya NO es la casilla `completed`. Un entreno registrado y guardado
 * como borrador es exactamente igual de válido como evidencia que uno
 * finalizado: las series se hicieron. Lo único que se exige es que haya al
 * menos una serie marcada con peso y reps (o solo reps, para el peso corporal).
 */
export function hasEvidence(session: SessionLog): boolean {
  return session.exercises.some((le) =>
    le.sets.some((st) => st.done && st.reps > 0),
  )
}

/** Orden cronológico real: por fecha, y la semana solo como desempate */
function chronDesc(
  a: { date: string; week: number },
  b: { date: string; week: number },
): number {
  return b.date.localeCompare(a.date) || b.week - a.week
}

/** Devuelve la sesión con entrenamiento real más reciente de un día concreto */
export function lastSessionForDay(
  sessions: SessionLog[],
  dayId: string,
  excludeSessionId?: string,
): SessionLog | undefined {
  return sessions
    .filter(
      (s) =>
        s.dayId === dayId &&
        s.id !== excludeSessionId &&
        hasEvidence(s),
    )
    .sort(chronDesc)[0]
}

// ------------------------------------------------------------
// Historial de rendimiento
// ------------------------------------------------------------

/** Resumen de lo que hiciste en un ejercicio en una sesión */
export interface MovementPerformance {
  sessionId: string
  week: number
  date: string
  /** Hueco del programa al que corresponde */
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
  /**
   * Reps registradas muy por encima del rango del ejercicio (>1,8×). Se marca
   * en lugar de corregirse en silencio: quien tiene que decidir si fue un error
   * de tecleo eres tú, pero conviene que la app lo señale en vez de calcular su
   * 1RM estimado como si fuera real.
   */
  suspectReps?: boolean
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
  /**
   * Sesión que se está editando ahora mismo. Se excluye para que un entreno no
   * se compare consigo mismo. Sustituye al viejo `beforeWeek`, que descartaba
   * por número de semana y dejaba fuera sesiones reales.
   */
  excludeSessionId?: string
}

/** La variante de un registro, normalizada: `undefined` = la de plantilla */
function swapIdOf(le: LoggedExercise): string | undefined {
  return le.swap?.id
}

/**
 * Resume lo que se hizo en un ejercicio dentro de una sesión. Se exporta
 * porque la auditoría de todo el historial (`lib/audit.ts`) necesita
 * exactamente el mismo criterio que el motor de progresión: si midieran
 * distinto, el informe y las cargas se contradirían.
 */
export function summarizePerformance(
  session: SessionLog,
  le: LoggedExercise,
): MovementPerformance | undefined {
  return summarize(session, le)
}

function summarize(
  session: SessionLog,
  le: LoggedExercise,
): MovementPerformance | undefined {
  const working = le.sets.filter((st) => st.done && st.weight > 0 && st.reps > 0)
  if (working.length === 0) return undefined

  const topWeight = Math.max(...working.map((st) => st.weight))
  const atTop = working.filter((st) => st.weight === topWeight)

  // Tope de reps para estimar el 1RM. La fórmula de Epley deja de ser fiable
  // muy por encima de las 15-20 reps, y un error de tecleo (44 kg × 30 reps
  // cuando eran 13) multiplica el 1RM estimado y contamina la prescripción de
  // las semanas siguientes. Se recorta la entrada de la fórmula, no el
  // registro: las reps que anotaste se conservan intactas.
  const tmpl = findExercise(le.exerciseId)
  const repCap = tmpl ? Math.max(20, tmpl.repMax + 4) : 20
  const e1rmOf = (st: { weight: number; reps: number; rir: number }) =>
    estimated1RMWithRIR(st.weight, Math.min(st.reps, repCap), st.rir)

  return {
    sessionId: session.id,
    week: session.week,
    date: session.date,
    exerciseId: le.exerciseId,
    swap: le.swap,
    topWeight,
    minRepsAtTop: Math.min(...atTop.map((st) => st.reps)),
    maxRepsAtTop: Math.max(...atTop.map((st) => st.reps)),
    avgRirAtTop: atTop.reduce((a, st) => a + (st.rir || 0), 0) / atTop.length,
    e1rm: Math.max(...working.map(e1rmOf)),
    setsDone: working.length,
    /** Reps muy por encima del rango: casi siempre es un error de tecleo */
    suspectReps: !!tmpl && Math.max(...working.map((st) => st.reps)) > tmpl.repMax * 1.8,
  }
}

/**
 * Historial ordenado de más reciente a más antiguo, por FECHA.
 *
 * Un registro por EJERCICIO y sesión, no por sesión: si un día llevara dos
 * huecos del mismo movimiento, cada uno cuenta por separado.
 */
export function performanceHistory(
  sessions: SessionLog[],
  exerciseId: string,
  opts: HistoryOptions = {},
): MovementPerformance[] {
  const { scope = 'slot', swapId, anyVariant = false, excludeSessionId } = opts

  const ids =
    scope === 'movement'
      ? new Set(exerciseIdsForMovement(movementIdOf(exerciseId)))
      : new Set([exerciseId])

  const out: MovementPerformance[] = []

  for (const s of sessions) {
    // El criterio es "hay entrenamiento registrado", no "está finalizada".
    if (s.id === excludeSessionId) continue

    for (const le of s.exercises) {
      if (!ids.has(le.exerciseId)) continue
      // Sin esto, una sustitución con barra recta contaminaría el historial de
      // la polea y la app sugeriría kilos de un material en el otro.
      if (!anyVariant && swapIdOf(le) !== swapId) continue
      const perf = summarize(s, le)
      if (perf) out.push(perf)
    }
  }

  return out.sort(chronDesc)
}

/** Historial del HUECO: mismo ejercicio, mismo día, misma variante */
export function slotHistory(
  sessions: SessionLog[],
  exerciseId: string,
  swapId?: string,
  excludeSessionId?: string,
): MovementPerformance[] {
  return performanceHistory(sessions, exerciseId, {
    scope: 'slot',
    swapId,
    excludeSessionId,
  })
}

/**
 * Historial del MOVIMIENTO completo (todos sus días y variantes). Es la vista
 * de "cómo va mi fuerza en este movimiento"; no decide cargas.
 */
export function movementHistory(
  sessions: SessionLog[],
  exerciseId: string,
  excludeSessionId?: string,
): MovementPerformance[] {
  return performanceHistory(sessions, exerciseId, {
    scope: 'movement',
    anyVariant: true,
    excludeSessionId,
  })
}

/**
 * Última variante usada en un hueco. Es lo que permite que, si sueles hacer el
 * antebrazo con barra recta, la app te la ofrezca ya elegida la próxima vez.
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
// Tendencia de fuerza
// ------------------------------------------------------------

/** Pendiente por mínimos cuadrados de una serie de puntos (y por unidad de x) */
function slope(points: { x: number; y: number }[]): number {
  const n = points.length
  if (n < 2) return 0
  const mx = points.reduce((a, p) => a + p.x, 0) / n
  const my = points.reduce((a, p) => a + p.y, 0) / n
  let num = 0
  let den = 0
  for (const p of points) {
    num += (p.x - mx) * (p.y - my)
    den += (p.x - mx) ** 2
  }
  return den === 0 ? 0 : num / den
}

/**
 * Tendencia del 1RM estimado del hueco, en % por sesión.
 *
 * Se usa en lugar de "¿la última superó a la anterior?" porque una sola sesión
 * mala (dormir poco, fútbol la víspera) no es un estancamiento. La pendiente
 * sobre las últimas sesiones sí distingue un bache de una meseta.
 */
export function e1rmTrendPct(history: MovementPerformance[], take = 4): number {
  const recent = history.slice(0, take).reverse()
  if (recent.length < 2) return 0
  const base = recent[0].e1rm
  if (base <= 0) return 0
  const s = slope(recent.map((h, i) => ({ x: i, y: h.e1rm })))
  return round1((s / base) * 100)
}

export interface StagnationCheck {
  stagnant: boolean
  regressing: boolean
  sessionsWithoutProgress: number
  /** Tendencia del 1RM estimado en % por sesión */
  trendPct: number
  /** Sesiones seguidas moviendo EXACTAMENTE el mismo peso top */
  sessionsAtSameLoad: number
}

/**
 * Estancamiento real del hueco.
 *
 * Hacen falta DOS señales, no una: que no haya récord nuevo en al menos 2
 * sesiones Y que la tendencia del 1RM estimado no esté subiendo. Con una sola
 * señal, un mal día aislado disparaba un recorte del 7% sobre un ejercicio que
 * iba bien.
 *
 * OJO: hay que pasarle un historial de ámbito `slot`. Con el del movimiento
 * entero mezcla días de fatiga distinta y el día flojo cuenta como "sin
 * mejorar" todas las semanas.
 */
export function checkStagnation(
  history: MovementPerformance[],
): StagnationCheck {
  const trendPct = e1rmTrendPct(history)

  // Sesiones seguidas con el mismo peso top: la señal del "siempre lo mismo"
  let atSameLoad = 0
  if (history.length > 0) {
    const top = history[0].topWeight
    for (const h of history) {
      if (h.topWeight !== top) break
      atSameLoad++
    }
  }

  if (history.length < 3) {
    return {
      stagnant: false,
      regressing: false,
      sessionsWithoutProgress: 0,
      trendPct,
      sessionsAtSameLoad: atSameLoad,
    }
  }

  // Cuántas de las sesiones más recientes NO superaron el mejor registro que
  // ya existía antes de ellas. Margen del 0,5% para que el redondeo de los
  // discos no cuente como estancamiento.
  let without = 0
  for (let i = 0; i < history.length - 1; i++) {
    const bestBefore = Math.max(...history.slice(i + 1).map((h) => h.e1rm))
    if (history[i].e1rm > bestBefore * 1.005) break
    without++
  }

  return {
    // Dos señales: ni récord nuevo ni tendencia positiva.
    stagnant: without >= 2 && trendPct <= 0.5,
    regressing: history[0].e1rm < history[1].e1rm * 0.97,
    sessionsWithoutProgress: without,
    trendPct,
    sessionsAtSameLoad: atSameLoad,
  }
}

// ------------------------------------------------------------
// Escalado de volumen dentro del bloque
// ------------------------------------------------------------

/**
 * Series planificadas para la semana. Los ejercicios con `maxSets` ganan una
 * serie cada bloque de 3 semanas hasta su techo; el resto se mantiene fijo.
 * En descarga se recorta ~40%.
 *
 * AUTORREGULACIÓN: el volumen extra solo se aplica si ese hueco SIGUE
 * PROGRESANDO. Añadir series encima de un ejercicio estancado no produce más
 * músculo, produce más fatiga.
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
    const variant = swap ?? lastSwapForSlot(sessions, ex.id)
    const history = slotHistory(sessions, ex.id, variant?.id)
    if (checkStagnation(history).stagnant) {
      bump -= 1
      held = true
    }
  }

  const sets = Math.min(ceiling, ex.sets + bump)
  return { sets, added: sets - ex.sets, held }
}

// ------------------------------------------------------------
// La decisión de subir carga
// ------------------------------------------------------------

/**
 * Umbral de reps a partir del cual se considera que dominas el rango.
 *
 * En un rango estrecho (8-12) es prácticamente el techo. En uno ancho es el 60%
 * superior, porque exigir el techo de un 12-20 equivale a no subir nunca.
 * Estrechar los rangos en el programa y añadir este umbral atacan el mismo
 * problema por los dos lados.
 */
function upperBandReps(ex: ExerciseTemplate): number {
  const width = ex.repMax - ex.repMin
  return ex.repMin + Math.ceil(width * 0.6)
}

type RaiseReason = 'techo' | 'banda-alta' | 'rir' | 'meseta' | null

/**
 * ¿Toca subir el peso? CUATRO puertas independientes, cualquiera vale.
 *
 * La regla mira dos series distintas de la última sesión:
 *   · la MEJOR (`maxRepsAtTop`) dice si la carga ya te queda corta,
 *   · la PEOR  (`minRepsAtTop`) dice si aguantas todas las series.
 *
 * Que las últimas series bajen es normal y esperado; lo que importa es que se
 * queden dentro del rango.
 */
function raiseDecision(
  ex: ExerciseTemplate,
  last: MovementPerformance,
  targetRIR: number,
  stag: StagnationCheck,
): RaiseReason {
  const allInsideRange = last.minRepsAtTop >= ex.repMin
  if (!allInsideRange) return null

  // 1) Doble progresión clásica: has tocado el techo del rango.
  if (last.maxRepsAtTop >= ex.repMax) return 'techo'

  // 2) Banda alta del rango con el esfuerzo correcto. Esta es la puerta que
  //    faltaba: en un 12-20 permite subir al llegar a ~17 reps a RIR bajo, en
  //    lugar de exigir 20 y condenar el ejercicio a no moverse jamás.
  if (
    last.maxRepsAtTop >= upperBandReps(ex) &&
    last.avgRirAtTop <= targetRIR + 0.5
  ) {
    return 'banda-alta'
  }

  // 3) Te sobró margen: la carga se quedó corta aunque no llegaras arriba.
  //    Antes el umbral era +1,5 de RIR, tan alto que casi nunca rescataba nada.
  if (last.avgRirAtTop >= targetRIR + 1) return 'rir'

  // 4) Meseta de carga: 3 sesiones moviendo lo mismo con todas las series
  //    dentro del rango. Si el peso no se mueve en 3 semanas y completas el
  //    trabajo, el atascado es el rango, no tú.
  if (stag.sessionsAtSameLoad >= LOAD_PLATEAU_SESSIONS) return 'meseta'

  return null
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
  const min = opts.allowBigDrop ? 0 : reference * (1 - MAX_WEEKLY_DECREASE)
  return roundToStep(Math.min(max, Math.max(min, target)), step)
}

export interface PrescribeOptions {
  /** Sesión que se está registrando ahora: no debe compararse consigo misma */
  excludeSessionId?: string
}

/**
 * Calcula la prescripción de un ejercicio para la semana `week`:
 * carga y reps objetivo, series según la fase, y el porqué.
 *
 * `week` solo determina la FASE (RIR objetivo y escalado de series). La carga
 * sale del historial cronológico del hueco, así que ya no importa si has
 * movido las flechas de semana o no.
 */
export function prescribeExercise(
  ex: ExerciseTemplate,
  week: number,
  sessions: SessionLog[],
  swap?: LoggedSwap,
  opts: PrescribeOptions = {},
): ExercisePrescription {
  const phase = phaseForWeek(week)
  const targetRIR = phase.targetRIR
  const { sets, added, held } = plannedSets(ex, week, phase, sessions, swap)

  // La referencia de carga sale del MISMO hueco y la MISMA variante: es la
  // única comparación entre iguales.
  const history = slotHistory(sessions, ex.id, swap?.id, opts.excludeSessionId)
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
      targetReps: last ? Math.min(ex.repMax, last.maxRepsAtTop + 1) : ex.repMin,
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
    // y la misma variante en otro día. Sirve como punto de partida.
    const seed = performanceHistory(sessions, ex.id, {
      scope: 'movement',
      swapId: swap?.id,
      excludeSessionId: opts.excludeSessionId,
    })[0]

    if (seed) {
      return {
        ...base,
        suggestedWeight: roundToStep(seed.topWeight, loadStep),
        targetReps: ex.repMin,
        e1rm: Math.round(seed.e1rm),
        action: 'primera-vez',
        rationale: `Primera vez que registras este ejercicio en este día, así que tomo como referencia lo que moviste en otro día del mismo movimiento (S${seed.week}: ${seed.topWeight} kg × ${seed.maxRepsAtTop}). Ajústalo a lo que puedas hoy sin miedo: la posición dentro del entreno cambia mucho los kilos, y a partir de esta sesión este día ya progresa con su propio historial.`,
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

  // La referencia de fuerza es el MEJOR 1RM estimado de las últimas 3 sesiones
  // del hueco, no solo el de la última. Con una sola sesión de referencia, un
  // día flojo borraba de un plumazo lo que habías demostrado la semana antes.
  const recent = history.slice(0, 3)
  const e1rm = Math.max(...recent.map((h) => h.e1rm))
  const stag = checkStagnation(history)
  const raise = raiseDecision(ex, last, targetRIR, stag)

  // --- Estancamiento real: sin récord, sin tendencia Y sin puerta para subir ---
  //
  // El orden importa y estaba mal. Subir SIEMPRE tiene prioridad sobre recortar:
  // si llevas tres semanas moviendo el mismo peso y completando el rango, el
  // detector de estancamiento se disparaba (no hay récord nuevo, tendencia
  // plana) y la app te BAJABA la carga un 7%. Pero ahí no hay nada que
  // reconstruir: nunca se te había pedido más. Era el peor caso posible, porque
  // convertía un fallo de prescripción en un recorte de carga.
  //
  // Recortar solo tiene sentido cuando no existe ninguna vía para subir: es
  // decir, cuando no puedes completar el rango con ese peso ni te sobra margen.
  if (stag.stagnant && !raise) {
    const target = last.topWeight * (1 - STAGNATION_BACKOFF)
    const suggested = roundDownToStep(target, loadStep, last.topWeight)
    return {
      ...base,
      suggestedWeight: suggested,
      targetReps: ex.repMax,
      e1rm: Math.round(e1rm),
      action: 'romper-estancamiento',
      alert: `${stag.sessionsWithoutProgress} sesiones de este día sin mejorar (tendencia ${stag.trendPct > 0 ? '+' : ''}${stag.trendPct}%/sesión).`,
      rationale:
        `Llevas ${stag.sessionsWithoutProgress} sesiones de este día sin avanzar aquí y la tendencia de tu 1RM estimado es de ${stag.trendPct}% por sesión, así que insistir con ${last.topWeight} kg no va a funcionar. Baja a ${suggested} kg y busca ${ex.repMax} reps limpias con técnica perfecta y descanso completo (${ex.restSec}s): reconstruyes desde una carga que sí puedes dominar y en 2 semanas superas el tope anterior. Si vuelve a atascarse, cambia el ejercicio por una variante (botón "Cámbialo"): a veces el problema es el patrón, no la carga.` +
        (held
          ? ` También he retenido la serie extra de volumen que tocaba en esta fase: no tiene sentido añadir más trabajo encima de un ejercicio que no avanza.`
          : ''),
    }
  }

  // --- ¿Toca subir la carga? ---
  if (raise) {
    // Con el objetivo puesto en el pie del rango, la carga que corresponde a tu
    // fuerza actual. El suelo es "un escalón más": si la fórmula se queda corta
    // por redondeo, igual subimos, que es de lo que se trata.
    const ideal = loadForTarget(e1rm, ex.repMin, targetRIR)
    const floor = last.topWeight + loadStep

    // El tope del 12% protege contra un error de tecleo, pero NUNCA debe
    // impedir subir un solo escalón. En cargas ligeras el disco más pequeño ya
    // supera ese 12%: en unas aperturas a 10 kg con incrementos de 2,5, subir
    // un paso es +25%, así que el tope lo devolvía a 10 kg y el ejercicio se
    // quedaba clavado para siempre por aritmética, no por fatiga. Le pasó de
    // verdad: 9 sesiones seguidas a 10 kg. Un escalón nunca es un salto
    // absurdo, es el mínimo incremento que existe en esa máquina.
    const capped = clampWeight(Math.max(ideal, floor), last.topWeight, loadStep)
    const suggested = Math.max(capped, roundToStep(floor, loadStep))
    const jump = round1(suggested - last.topWeight)

    const REASONS: Record<Exclude<RaiseReason, null>, string> = {
      techo: `La última vez a ${last.topWeight} kg llegaste a ${last.maxRepsAtTop} reps (techo del rango) y ninguna serie bajó de ${ex.repMin}: eso es exactamente la señal de subir.`,
      'banda-alta': `A ${last.topWeight} kg hiciste ${last.maxRepsAtTop} reps con RIR ~${round1(
        last.avgRirAtTop,
      )} y ninguna serie bajó de ${ex.repMin}. Estás en la parte alta del rango con el esfuerzo correcto, así que no hace falta que llegues a ${ex.repMax} para ganarte los kilos: esperar al techo de un rango de ${ex.repMax - ex.repMin} reps es lo que antes te dejaba semanas con el mismo peso.`,
      rir: `Hiciste ${last.maxRepsAtTop} reps a ${last.topWeight} kg pero anotaste RIR ~${round1(
        last.avgRirAtTop,
      )}, o sea ${round1(last.avgRirAtTop - targetRIR)} reps de sobra respecto al objetivo de esta fase (RIR ${targetRIR}). Con esa carga no estás estimulando lo suficiente.`,
      meseta: `Llevas ${stag.sessionsAtSameLoad} sesiones seguidas moviendo ${last.topWeight} kg con todas las series dentro del rango. No es que no progreses: es que el rango es tan ancho que nunca "tocabas el techo". Subo yo la carga.`,
    }

    return {
      ...base,
      suggestedWeight: suggested,
      targetReps: ex.repMin,
      e1rm: Math.round(e1rm),
      action: raise === 'meseta' ? 'forzar-subida' : 'subir-peso',
      rationale: `${REASONS[raise]} Tu 1RM estimado ahí es ~${Math.round(
        e1rm,
      )} kg. Ve a ${suggested} kg (+${jump}) y vuelve al pie del rango, ${ex.repMin} reps a RIR ${targetRIR}. No hace falta que las ${sets} series lleguen a ${ex.repMax}: que caigan por fatiga es normal, lo que cuenta es que se queden dentro del rango.`,
    }
  }

  // --- Alguna serie se cayó por debajo del rango: consolidar antes de subir ---
  if (last.minRepsAtTop < ex.repMin) {
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
  const toBand = Math.max(0, upperBandReps(ex) - last.maxRepsAtTop)
  return {
    ...base,
    suggestedWeight: last.topWeight,
    targetReps,
    e1rm: Math.round(e1rm),
    action: 'sumar-reps',
    rationale: `Mantén ${last.topWeight} kg. Tu mejor serie fueron ${last.maxRepsAtTop} reps y la más floja ${last.minRepsAtTop}, todas dentro del rango: sube a ${targetReps} en la primera serie y deja que las demás caigan donde caigan sin bajar de ${ex.repMin}. ${
      toBand > 0
        ? `Con ${
            toBand === 1 ? '1 rep más' : `${toBand} reps más`
          } en tu mejor serie (${upperBandReps(ex)}) ya te ganas la subida de peso, no hace falta llegar a ${ex.repMax}.`
        : `En la próxima sesión que mantengas esto, subo la carga.`
    } Añadir reps con el mismo peso es sobrecarga progresiva igual que añadir kilos.`,
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
  opts: PrescribeOptions = {},
): ExercisePrescription[] {
  return day.exercises.map((ex) =>
    prescribeExercise(ex, week, sessions, swaps[ex.id], opts),
  )
}


/**
 * Bloque de una sesión. Las sesiones guardadas antes de existir el campo son
 * del bloque 1, que es exactamente lo que eran.
 */
export function blockOf(session: SessionLog): number {
  return session.block ?? 1
}

/** Sesiones de una semana concreta DE UN BLOQUE concreto, con entreno real */
export function sessionsOfWeek(
  sessions: SessionLog[],
  week: number,
  block: number,
): SessionLog[] {
  return sessions.filter(
    (s) => s.week === week && blockOf(s) === block && hasEvidence(s),
  )
}
