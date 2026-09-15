import type { AppState, MuscleGroup, SessionLog } from '../types'
import { WORKOUT_DAYS, findDay, findExercise, phaseForWeek } from '../data/program'
import {
  blockOf,
  e1rmTrendPct,
  hasEvidence,
  plannedSets,
  summarizePerformance,
  type MovementPerformance,
} from './progression'
import { VOLUME_TARGETS, PRIORITY_MUSCLES } from './volume'

// ============================================================
// AUDITORÍA DE TODO EL HISTORIAL
// ------------------------------------------------------------
// La app sabía decir qué toca hoy, pero no sabía responder a la pregunta que de
// verdad importa al cerrar un bloque: "¿esto ha funcionado?".
//
// Este fichero lee TODAS las sesiones registradas y responde tres cosas, cada
// una con sus datos delante:
//
//  1) POR EJERCICIO: ¿ha subido la carga o llevo semanas clavado? Con el
//     número de sesiones movidas al mismo peso, para que una meseta no se
//     pueda confundir con "voy progresando despacio".
//  2) POR MÚSCULO: ¿cuántas series he hecho DE VERDAD por semana, frente a las
//     que el programa planificaba? Es la diferencia entre un músculo mal
//     programado y un músculo que se queda sin hacer porque va siempre al
//     final del entreno y llegas fundido.
//  3) POR SESIÓN: ¿cuántos entrenos tengo a medias? Un entreno registrado y no
//     finalizado antes no contaba para nada; ahora cuenta, pero conviene verlo.
//
// Nada de esto se escribe a mano en ningún sitio: sale del registro.
// ============================================================

/** Sesiones mínimas de un hueco para poder juzgar si progresa o está plano */
const MIN_SESSIONS_FOR_TREND = 3
/** Por debajo de esta adherencia, el músculo se está quedando sin entrenar */
const NEGLECT_THRESHOLD = 0.8

export type SlotStatus = 'progresa' | 'plano' | 'retrocede' | 'pocos-datos'

/** Análisis de un hueco concreto: ejercicio + día + variante */
export interface SlotAudit {
  key: string
  exerciseId: string
  swapId?: string
  dayId: string
  dayName: string
  /** Nombre de lo que se hizo de verdad (la variante, si la hubo) */
  name: string
  muscle: MuscleGroup
  sessions: number
  firstDate: string
  lastDate: string
  firstWeek: number
  lastWeek: number
  firstWeight: number
  lastWeight: number
  bestWeight: number
  deltaKg: number
  deltaPct: number
  e1rmFirst: number
  e1rmLast: number
  e1rmBest: number
  e1rmDeltaPct: number
  /** Tendencia del 1RM estimado, % por sesión */
  trendPct: number
  /** Sesiones seguidas moviendo exactamente el mismo peso top */
  sessionsAtSameLoad: number
  /** Series totales registradas en este hueco */
  setsDone: number
  status: SlotStatus
  repMin: number
  repMax: number
  /**
   * Amplitud del rango de reps. Se incluye porque es la causa mecánica de
   * media de las mesetas del bloque anterior: con 8 reps de amplitud, la regla
   * de "sube al tocar el techo" no se disparaba nunca.
   */
  rangeWidth: number
}

export type MuscleAuditStatus = 'descuidado' | 'justo' | 'ok'

/** Análisis de un músculo a lo largo de todo el historial */
export interface MuscleAudit {
  muscle: MuscleGroup
  priority: boolean
  /** Series directas registradas en todo el historial */
  setsDone: number
  /** Semanas distintas en las que se entrenó */
  weeksTrained: number
  /** Media de series directas por semana entrenada */
  setsPerWeek: number
  /** Series directas que el programa planifica por semana (fase actual) */
  plannedPerWeek: number
  /** setsPerWeek / plannedPerWeek */
  adherencePct: number
  target: [number, number]
  status: MuscleAuditStatus
  slots: number
  progressingSlots: number
  stalledSlots: number
}

export interface DayAudit {
  dayId: string
  name: string
  sessions: number
  /** Media de series marcadas por sesión */
  avgSetsDone: number
  /** Series que el programa planifica para ese día */
  plannedSets: number
  adherencePct: number
  unfinished: number
}

export interface BlockAudit {
  totalSessions: number
  sessionsWithEvidence: number
  /** Sesiones con entreno registrado pero sin finalizar (antes no contaban) */
  unfinishedWithData: number
  weeksCovered: number[]
  firstDate?: string
  lastDate?: string
  days: DayAudit[]
  slots: SlotAudit[]
  muscles: MuscleAudit[]
  /** Huecos con meseta de carga, los más atascados primero */
  stalled: SlotAudit[]
  /** Músculos que se están quedando sin entrenar de verdad */
  neglected: MuscleAudit[]
  /** Huecos que sí progresan, los que más primero */
  bestProgress: SlotAudit[]
  headline: string
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function pct(n: number): number {
  return Math.round(n * 1000) / 10
}

function slotKey(exerciseId: string, swapId?: string): string {
  return `${exerciseId}::${swapId ?? ''}`
}

/**
 * Series directas registradas por músculo y semana.
 * Se cuenta por el músculo del HUECO del programa: una variante entrena el
 * mismo músculo con las mismas series, así que no cambia nada aquí.
 */
function setsByMuscleAndWeek(
  sessions: SessionLog[],
): Map<MuscleGroup, Map<number, number>> {
  const out = new Map<MuscleGroup, Map<number, number>>()
  for (const s of sessions) {
    for (const le of s.exercises) {
      const ex = findExercise(le.exerciseId)
      if (!ex) continue
      const n = le.sets.filter((st) => st.done && st.reps > 0).length
      if (n === 0) continue
      if (!out.has(ex.muscle)) out.set(ex.muscle, new Map())
      const byWeek = out.get(ex.muscle)!
      byWeek.set(s.week, (byWeek.get(s.week) ?? 0) + n)
    }
  }
  return out
}

/** Agrupa el historial por hueco (ejercicio + variante) */
function historiesBySlot(
  sessions: SessionLog[],
): Map<string, MovementPerformance[]> {
  const out = new Map<string, MovementPerformance[]>()
  for (const s of sessions) {
    for (const le of s.exercises) {
      const perf = summarizePerformance(s, le)
      if (!perf) continue
      const key = slotKey(le.exerciseId, le.swap?.id)
      if (!out.has(key)) out.set(key, [])
      out.get(key)!.push(perf)
    }
  }
  // Más reciente primero, igual que el motor de progresión
  for (const list of out.values()) {
    list.sort((a, b) => b.date.localeCompare(a.date) || b.week - a.week)
  }
  return out
}

function auditSlot(key: string, history: MovementPerformance[]): SlotAudit | undefined {
  const [exerciseId, rawSwap = ''] = key.split('::')
  const ex = findExercise(exerciseId)
  if (!ex || history.length === 0) return undefined

  const newest = history[0]
  const oldest = history[history.length - 1]
  const day = WORKOUT_DAYS.find((d) => d.exercises.some((e) => e.id === exerciseId))

  const bestWeight = Math.max(...history.map((h) => h.topWeight))
  const e1rmBest = Math.max(...history.map((h) => h.e1rm))
  const deltaKg = round1(newest.topWeight - oldest.topWeight)
  const e1rmDeltaPct =
    oldest.e1rm > 0 ? pct((newest.e1rm - oldest.e1rm) / oldest.e1rm) : 0
  const trendPct = e1rmTrendPct(history, Math.min(6, history.length))

  let sessionsAtSameLoad = 0
  for (const h of history) {
    if (h.topWeight !== newest.topWeight) break
    sessionsAtSameLoad++
  }

  let status: SlotStatus
  if (history.length < MIN_SESSIONS_FOR_TREND) status = 'pocos-datos'
  else if (e1rmDeltaPct < -2) status = 'retrocede'
  else if (trendPct > 0.5 || deltaKg > 0) status = 'progresa'
  else status = 'plano'

  return {
    key,
    exerciseId,
    swapId: rawSwap || undefined,
    dayId: day?.id ?? '—',
    dayName: day?.name.split('·')[0].trim() ?? '—',
    name: newest.swap?.name ?? ex.name,
    muscle: ex.muscle,
    sessions: history.length,
    firstDate: oldest.date,
    lastDate: newest.date,
    firstWeek: oldest.week,
    lastWeek: newest.week,
    firstWeight: oldest.topWeight,
    lastWeight: newest.topWeight,
    bestWeight,
    deltaKg,
    deltaPct:
      oldest.topWeight > 0
        ? pct((newest.topWeight - oldest.topWeight) / oldest.topWeight)
        : 0,
    e1rmFirst: Math.round(oldest.e1rm),
    e1rmLast: Math.round(newest.e1rm),
    e1rmBest: Math.round(e1rmBest),
    e1rmDeltaPct,
    trendPct,
    sessionsAtSameLoad,
    setsDone: history.reduce((a, h) => a + h.setsDone, 0),
    status,
    repMin: ex.repMin,
    repMax: ex.repMax,
    rangeWidth: ex.repMax - ex.repMin,
  }
}

/**
 * Informe completo del historial. `referenceWeek` solo se usa para saber
 * cuántas series planificaba el programa por semana (el plan escala dentro del
 * bloque), no para filtrar nada.
 */
export function buildAudit(state: AppState, referenceWeek?: number): BlockAudit {
  const week = referenceWeek ?? state.currentWeek
  const phase = phaseForWeek(week)
  const real = state.sessions.filter(hasEvidence)
  const sorted = [...real].sort((a, b) => a.date.localeCompare(b.date))

  const slotHistories = historiesBySlot(real)
  const slots = [...slotHistories.entries()]
    .map(([key, h]) => auditSlot(key, h))
    .filter((s): s is SlotAudit => !!s)
    .sort((a, b) => b.sessions - a.sessions)

  // ---- Músculos ----
  const perMuscle = setsByMuscleAndWeek(real)
  const muscles: MuscleAudit[] = []

  for (const day of WORKOUT_DAYS) {
    for (const ex of day.exercises) {
      if (ex.alternativeOf) continue
      if (muscles.some((m) => m.muscle === ex.muscle)) continue

      const muscle = ex.muscle
      const byWeek = perMuscle.get(muscle) ?? new Map<number, number>()
      const weeksTrained = byWeek.size
      const setsDone = [...byWeek.values()].reduce((a, n) => a + n, 0)
      const setsPerWeek = weeksTrained > 0 ? round1(setsDone / weeksTrained) : 0

      const plannedPerWeek = WORKOUT_DAYS.reduce(
        (acc, d) =>
          acc +
          d.exercises
            .filter((e) => !e.alternativeOf && e.muscle === muscle)
            .reduce((b, e) => b + plannedSets(e, week, phase).sets, 0),
        0,
      )

      const adherence = plannedPerWeek > 0 ? setsPerWeek / plannedPerWeek : 0
      const slotsOfMuscle = slots.filter((s) => s.muscle === muscle)

      muscles.push({
        muscle,
        priority: PRIORITY_MUSCLES.includes(muscle),
        setsDone,
        weeksTrained,
        setsPerWeek,
        plannedPerWeek,
        adherencePct: pct(adherence),
        target: VOLUME_TARGETS[muscle] ?? [4, 16],
        status:
          weeksTrained === 0
            ? 'descuidado'
            : adherence < NEGLECT_THRESHOLD
              ? 'descuidado'
              : adherence < 0.95
                ? 'justo'
                : 'ok',
        slots: slotsOfMuscle.length,
        progressingSlots: slotsOfMuscle.filter((s) => s.status === 'progresa').length,
        stalledSlots: slotsOfMuscle.filter(
          (s) => s.status === 'plano' || s.status === 'retrocede',
        ).length,
      })
    }
  }

  muscles.sort((a, b) => a.adherencePct - b.adherencePct)

  // ---- Días ----
  const days: DayAudit[] = WORKOUT_DAYS.map((d) => {
    const own = real.filter((s) => s.dayId === d.id)
    const plannedForDay = d.exercises
      .filter((e) => !e.alternativeOf)
      .reduce((a, e) => a + plannedSets(e, week, phase).sets, 0)
    const setsDone = own.reduce(
      (a, s) =>
        a + s.exercises.reduce((b, e) => b + e.sets.filter((st) => st.done).length, 0),
      0,
    )
    const avg = own.length > 0 ? round1(setsDone / own.length) : 0
    return {
      dayId: d.id,
      name: d.name,
      sessions: own.length,
      avgSetsDone: avg,
      plannedSets: plannedForDay,
      adherencePct: plannedForDay > 0 ? pct(avg / plannedForDay) : 0,
      unfinished: own.filter((s) => !s.completed).length,
    }
  })

  const stalled = slots
    .filter((s) => s.status === 'plano' || s.status === 'retrocede')
    .sort((a, b) => b.sessionsAtSameLoad - a.sessionsAtSameLoad || a.trendPct - b.trendPct)

  const neglected = muscles.filter((m) => m.status === 'descuidado')

  const bestProgress = slots
    .filter((s) => s.status === 'progresa')
    .sort((a, b) => b.e1rmDeltaPct - a.e1rmDeltaPct)

  const weeksCovered = [...new Set(real.map((s) => s.week))].sort((a, b) => a - b)
  const unfinishedWithData = real.filter((s) => !s.completed).length

  let headline: string
  if (real.length === 0) {
    headline = 'Todavía no hay entrenos registrados que analizar.'
  } else if (stalled.length === 0) {
    headline = `${slots.length} ejercicios analizados en ${real.length} entrenos: ninguno en meseta.`
  } else {
    headline = `${stalled.length} de ${slots.length} ejercicios llevan sesiones sin mover la carga${
      neglected.length > 0
        ? `, y ${neglected.length} músculos reciben menos series de las planificadas`
        : ''
    }.`
  }

  return {
    totalSessions: state.sessions.length,
    sessionsWithEvidence: real.length,
    unfinishedWithData,
    weeksCovered,
    firstDate: sorted[0]?.date,
    lastDate: sorted[sorted.length - 1]?.date,
    days,
    slots,
    muscles,
    stalled,
    neglected,
    bestProgress,
    headline,
  }
}

/** Nombre legible de un día, para las tarjetas del informe */
export function dayLabel(dayId: string): string {
  return findDay(dayId)?.name.split('·')[0].trim() ?? dayId
}


/**
 * Semana del bloque según el calendario, contando desde tu primer entreno
 * registrado.
 *
 * Existe porque la semana se avanzaba SOLO a mano con las flechas de la
 * pestaña Entreno. Si te olvidabas —y es facilísimo olvidarse— todos los
 * entrenos se apilaban en la misma semana: el volumen semanal salía
 * disparatado, las gráficas se aplastaban en un punto y el motor de progresión,
 * que entonces filtraba por número de semana, se quedaba ciego.
 *
 * El motor ya no depende de esto (lee el historial por fecha), así que esto es
 * una comodidad y no un parche: sirve para que la fase y el RIR objetivo se
 * correspondan con el tiempo que llevas de verdad en el bloque.
 */
export function suggestedWeek(
  sessions: SessionLog[],
  blockLengthWeeks: number,
  block = 1,
): number | undefined {
  // Se cuenta desde el primer entreno DEL BLOQUE EN CURSO: si contáramos desde
  // el primero de todos, al empezar el bloque 3 la app diría "vas por la
  // semana 21".
  const dates = sessions
    .filter((s) => hasEvidence(s) && blockOf(s) === block)
    .map((s) => s.date)
    .sort()
  if (dates.length === 0) return undefined

  const first = new Date(dates[0]).getTime()
  const days = (Date.now() - first) / (1000 * 60 * 60 * 24)
  if (days < 0) return undefined

  return Math.min(blockLengthWeeks, Math.max(1, Math.floor(days / 7) + 1))
}


// ============================================================
// RESUMEN COMPACTO EN TEXTO
// ------------------------------------------------------------
// El respaldo JSON es la copia fiel, pero es enorme y hay sitios (chats,
// mensajes) donde no se puede adjuntar un archivo. Esto genera el mismo
// historial en texto plano, ordenado por día y ejercicio, con una línea por
// sesión: peso top, mejor y peor serie, RIR y número de series.
//
// Cabe en un mensaje y contiene todo lo que hace falta para juzgar si un
// ejercicio progresa: los kilos, las reps y el esfuerzo.
// ============================================================

function isoDay(iso: string): string {
  return iso.slice(0, 10)
}

/** Historial completo en texto plano, listo para copiar y pegar. */
export function compactReport(state: AppState): string {
  const audit = buildAudit(state)
  const lines: string[] = []
  const p = state.profile

  lines.push(`ENTRENO · ${p.name} · exportado ${isoDay(new Date().toISOString())}`)
  lines.push(
    `Perfil: ${p.age} años, ${p.heightCm} cm, ${p.weightKg} kg, ${p.bodyFatPct}% grasa, nivel ${p.level}, meta ${p.goalWeightKg} kg`,
  )
  lines.push(
    `Bloque: semana ${state.currentWeek}/${state.blockLengthWeeks} (fase ${phaseForWeek(state.currentWeek).name}, RIR objetivo ${phaseForWeek(state.currentWeek).targetRIR})`,
  )
  lines.push(
    `Registrado: ${audit.sessionsWithEvidence} entrenos, semanas ${audit.weeksCovered.join(',')}, ${audit.unfinishedWithData} sin finalizar`,
  )

  // ---- Peso corporal ----
  const bw = [...state.bodyweightLog]
    .filter((b) => b.weightKg > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (bw.length > 0) {
    lines.push('')
    lines.push('== PESO CORPORAL ==')
    lines.push(bw.map((b) => `${isoDay(b.date)}:${b.weightKg}`).join(' '))
  }

  // ---- Historial por día y ejercicio ----
  lines.push('')
  lines.push('== HISTORIAL POR EJERCICIO ==')
  lines.push('formato: Sx fecha pesoKG x mejorReps-peorReps RIR n=series')

  const bySlot = historiesBySlot(state.sessions.filter(hasEvidence))

  for (const day of WORKOUT_DAYS) {
    const dayKeys = [...bySlot.keys()].filter((k) => {
      const exId = k.split('::')[0]
      return day.exercises.some((e) => e.id === exId)
    })
    if (dayKeys.length === 0) continue

    lines.push('')
    lines.push(`--- ${day.name} ---`)

    // Se respeta el orden del programa, no el alfabético: así se ve de un
    // vistazo qué ejercicios caen al final del entreno.
    const ordered = day.exercises.flatMap((ex) =>
      dayKeys.filter((k) => k.split('::')[0] === ex.id),
    )

    for (const key of ordered) {
      const history = [...(bySlot.get(key) ?? [])].reverse() // antiguo → nuevo
      if (history.length === 0) continue
      const ex = findExercise(key.split('::')[0])
      const label = history[history.length - 1].swap?.name ?? ex?.name ?? key
      const range = ex ? ` [${ex.repMin}-${ex.repMax}]` : ''
      lines.push(`${label}${range}:`)
      lines.push(
        '  ' +
          history
            .map(
              (h) =>
                `S${h.week} ${isoDay(h.date)} ${h.topWeight}x${
                  h.maxRepsAtTop === h.minRepsAtTop
                    ? h.maxRepsAtTop
                    : `${h.maxRepsAtTop}-${h.minRepsAtTop}`
                } RIR${Math.round(h.avgRirAtTop * 10) / 10} n=${h.setsDone}`,
            )
            .join(' | '),
      )
    }
  }

  // ---- Running ----
  if (state.runs.length > 0) {
    lines.push('')
    lines.push('== RUNNING ==')
    for (const r of [...state.runs].sort((a, b) => a.date.localeCompare(b.date))) {
      lines.push(
        `${isoDay(r.date)} ${r.type} ${r.distanceKm}km ${r.durationMin}min${r.rpe ? ` RPE${r.rpe}` : ''}${r.notes ? ` · ${r.notes}` : ''}`,
      )
    }
  }

  // ---- Diagnóstico ----
  lines.push('')
  lines.push('== DIAGNÓSTICO AUTOMÁTICO ==')
  lines.push(audit.headline)
  if (audit.stalled.length > 0) {
    lines.push('En meseta:')
    for (const s of audit.stalled) {
      lines.push(
        `  ${s.name} (${s.dayName}): ${s.sessionsAtSameLoad} sesiones a ${s.lastWeight} kg, 1RM est ${s.e1rmDeltaPct > 0 ? '+' : ''}${s.e1rmDeltaPct}%`,
      )
    }
  }
  if (audit.neglected.length > 0) {
    lines.push('Por debajo de lo planificado:')
    for (const m of audit.neglected) {
      lines.push(
        `  ${m.muscle}: ${m.setsPerWeek}/${m.plannedPerWeek} series por semana (${m.adherencePct}%)`,
      )
    }
  }

  return lines.join('\n')
}
