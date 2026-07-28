import type { MuscleGroup, SessionLog } from '../types'
import { WORKOUT_DAYS, findExercise, phaseForWeek } from '../data/program'
import { plannedSets } from './progression'

// ============================================================
// AUDITORÍA DE VOLUMEN
// ------------------------------------------------------------
// Este fichero existe por un motivo concreto: el programa anterior decía
// "pecho 2x, pierna 2x" en un comentario y en el README, pero al contar los
// ejercicios de verdad el pecho se entrenaba 1 vez y cada músculo de la
// pierna también. Un número escrito a mano en un comentario miente; una
// función que cuenta las series reales del programa, no.
//
// A partir de aquí, la frecuencia y el volumen se CALCULAN desde los datos
// del programa y se muestran en la app. Si algún día se toca un día de
// entreno y un músculo se queda corto, se ve al instante.
// ============================================================

/**
 * Rangos de series EFECTIVAS (directas + 0,5 × indirectas) por músculo y
 * semana, calibrados para un INTERMEDIO en superávit.
 *
 * OJO CON LA UNIDAD, que aquí estaba el error: la primera versión de estos
 * rangos se escribió pensando en series DIRECTAS y luego se empezó a comparar
 * contra el volumen efectivo, que es mayor. Al cambiar el numerador sin
 * recalibrar el denominador, todo derivaba hacia arriba y el programa parecía
 * más holgado de lo que era. Ahora ambos lados hablan de series efectivas.
 *
 * Referencias:
 *  · La banda útil está en 10-20 series semanales POR MÚSCULO, con
 *    hipertrofia detectable ya desde 4-10 y rendimientos decrecientes al
 *    subir. Nada de esto es un número mágico: es una relación dosis-respuesta.
 *  · Contar el trabajo indirecto como media serie ("fractional sets") es el
 *    método que validó Schoenfeld et al. 2019 y el que usan las
 *    meta-regresiones recientes de volumen.
 *
 * Por eso el techo aquí es 18-20 solo en los músculos PRIORITARIOS del
 * bloque, y 12-16 en el resto: un intermedio no necesita empujar todos los
 * músculos al máximo de la banda a la vez, porque la recuperación es
 * sistémica y él además juega al fútbol y corre dos días.
 */
export const VOLUME_TARGETS: Record<MuscleGroup, [number, number]> = {
  // --- Prioridades del bloque: parte alta de la banda ---
  Cuádriceps: [12, 20],
  Femoral: [10, 18],
  Glúteo: [8, 16],
  Espalda: [12, 20],
  'Hombro lateral': [10, 18],
  Antebrazo: [6, 12], // punto débil, pero es un músculo pequeño
  // --- Mantener y progresar: parte media ---
  Pecho: [10, 18],
  Bíceps: [8, 16],
  Tríceps: [8, 16],
  // Mínimo 8: con todo el volumen de press de pecho que hace, el deltoides
  // posterior necesita ese suelo para equilibrar el hombro (estética y salud
  // articular). Con el mínimo en 4, las 4 series que había salían "ok".
  'Hombro posterior': [8, 14],
  // Necesita poco trabajo DIRECTO porque se lleva media serie de cada press.
  'Hombro anterior': [6, 12],
  // --- Asistencia ---
  Gemelos: [6, 14],
  Core: [6, 12],
  Aductores: [4, 10],
}

/**
 * Techo de series fraccionadas de un mismo músculo en UNA sesión.
 *
 * La meta-regresión de volumen por sesión sitúa el punto de rendimientos
 * indetectables alrededor de 11 series fraccionadas por músculo y sesión:
 * pasado ese punto, añadir series al mismo entreno deja de aportar. Es un
 * segundo eje de calibración que el programa no estaba mirando, y que
 * detecta un problema que el total semanal esconde: 13 series de pecho
 * apelotonadas en un solo día no valen lo mismo que repartidas en dos.
 */
export const PER_SESSION_CEILING = 11

/**
 * Regiones que agrupan varios músculos. Existen porque "el hombro" no es un
 * músculo: son tres cabezas que conviene programar por separado, pero al mirar
 * la app uno quiere ver también el total. Sin esta agrupación la fila
 * "Hombro anterior · 3 series" se lee como "solo hago 3 series de hombro",
 * cuando entre las tres cabezas son 18.
 */
export const MUSCLE_REGIONS: { label: string; members: MuscleGroup[] }[] = [
  {
    label: 'Hombro (3 cabezas)',
    members: ['Hombro anterior', 'Hombro lateral', 'Hombro posterior'],
  },
  {
    label: 'Pierna',
    members: ['Cuádriceps', 'Femoral', 'Glúteo', 'Aductores', 'Gemelos'],
  },
  { label: 'Brazo', members: ['Bíceps', 'Tríceps', 'Antebrazo'] },
]

/** Músculos que este bloque prioriza (se marcan en la app) */
export const PRIORITY_MUSCLES: MuscleGroup[] = [
  'Cuádriceps',
  'Femoral',
  'Glúteo',
  'Espalda',
  'Hombro lateral',
  'Antebrazo',
]

export type VolumeStatus = 'bajo' | 'ok' | 'alto'

/**
 * Cómo va el músculo DENTRO de la semana en curso:
 *  · sin-empezar → aún no le toca, ningún día suyo entrenado
 *  · al-dia      → llevas lo que tocaba en los días ya hechos
 *  · corto       → los días ya hechos no cubrieron sus series
 *  · completo    → ya has cubierto el objetivo semanal
 */
export type TrackStatus = 'sin-empezar' | 'al-dia' | 'corto' | 'completo'

export interface MuscleVolumeRow {
  muscle: MuscleGroup
  /** Series DIRECTAS que el programa planifica esta semana */
  plannedSets: number
  /** Series indirectas (compuestos que lo trabajan de segundas), redondeado a 0,5 */
  indirectSets: number
  /** Volumen efectivo: directas + indirectas. Es lo que se compara con el rango */
  effectiveSets: number
  /** Días distintos de la semana en los que se entrena ese músculo */
  frequency: number
  /** Días concretos (ids de entreno), para poder agregar por región */
  dayIds: string[]
  /** Series directas efectivamente registradas esta semana */
  doneSets: number
  /**
   * Series que YA deberías llevar: las planificadas en los días que ya has
   * marcado como completados. Es la clave para distinguir "me falta porque
   * todavía no me toca" de "me quedé corto en el entreno que ya hice".
   */
  dueSets: number
  /** Series que quedan en días que aún no has entrenado */
  pendingSets: number
  trackStatus: TrackStatus
  target: [number, number]
  status: VolumeStatus
  priority: boolean
  /** La semana analizada es de descarga (el volumen bajo es intencionado) */
  deload: boolean
}

export interface RegionVolumeRow {
  label: string
  directSets: number
  indirectSets: number
  effectiveSets: number
  frequency: number
  /**
   * Suma de los rangos de sus músculos. Es imprescindible mostrarlo: sin una
   * referencia al lado, un total de región (p. ej. 28 de hombro) se compara
   * mentalmente con la regla de "10-20 series por músculo" y parece una
   * barbaridad, cuando en realidad son TRES músculos sumados. El mismo error
   * haría parecer excesivas las 44 de pierna, que son cinco músculos.
   */
  target: [number, number]
  members: MuscleVolumeRow[]
}

/** Un músculo que acumula demasiadas series en una sola sesión */
export interface SessionOverload {
  dayId: string
  dayName: string
  muscle: MuscleGroup
  fractionalSets: number
}

function statusFor(
  sets: number,
  [min, max]: [number, number],
  deload: boolean,
): VolumeStatus {
  // En descarga el volumen bajo es el objetivo, no un fallo del programa:
  // marcarlo en rojo sería ruido.
  if (deload) return 'ok'
  if (sets < min) return 'bajo'
  if (sets > max) return 'alto'
  return 'ok'
}

/**
 * Volumen y frecuencia por músculo para una semana del bloque.
 * Los ejercicios alternativos (péndulo / hack) no se suman dos veces:
 * solo se hace uno de los dos.
 */
export function weeklyVolume(
  week: number,
  sessions: SessionLog[] = [],
): MuscleVolumeRow[] {
  const phase = phaseForWeek(week)
  const planned = new Map<MuscleGroup, number>()
  const indirect = new Map<MuscleGroup, number>()
  const days = new Map<MuscleGroup, Set<string>>()

  const addDay = (m: MuscleGroup, dayId: string) => {
    if (!days.has(m)) days.set(m, new Set())
    days.get(m)!.add(dayId)
  }

  for (const day of WORKOUT_DAYS) {
    for (const ex of day.exercises) {
      if (ex.alternativeOf) continue // es la opción B, no suma
      const { sets } = plannedSets(ex, week, phase, sessions)

      planned.set(ex.muscle, (planned.get(ex.muscle) ?? 0) + sets)
      addDay(ex.muscle, day.id)

      // Trabajo indirecto de los compuestos
      for (const [m, factor] of Object.entries(ex.secondary ?? {})) {
        const muscle = m as MuscleGroup
        indirect.set(muscle, (indirect.get(muscle) ?? 0) + sets * (factor ?? 0))
        addDay(muscle, day.id)
      }
    }
  }

  // Series realmente registradas esta semana
  const done = new Map<MuscleGroup, number>()
  for (const s of sessions) {
    if (s.week !== week || !s.completed) continue
    for (const le of s.exercises) {
      const ex = findExercise(le.exerciseId)
      if (!ex) continue
      const n = le.sets.filter((st) => st.done && st.reps > 0).length
      if (n > 0) done.set(ex.muscle, (done.get(ex.muscle) ?? 0) + n)
    }
  }

  const half = (n: number) => Math.round(n * 2) / 2

  // Días de esta semana que ya has completado, para saber qué series YA tocaban
  const completedDays = new Set(
    sessions.filter((s) => s.week === week && s.completed).map((s) => s.dayId),
  )
  const due = new Map<MuscleGroup, number>()
  for (const day of WORKOUT_DAYS) {
    if (!completedDays.has(day.id)) continue
    for (const ex of day.exercises) {
      if (ex.alternativeOf) continue
      const { sets } = plannedSets(ex, week, phase, sessions)
      due.set(ex.muscle, (due.get(ex.muscle) ?? 0) + sets)
    }
  }

  // Se recorren todos los músculos que aparecen como directos O como indirectos
  const allMuscles = new Set<MuscleGroup>([...planned.keys(), ...indirect.keys()])

  return [...allMuscles]
    .map((muscle) => {
      const direct = planned.get(muscle) ?? 0
      const ind = half(indirect.get(muscle) ?? 0)
      const effective = half(direct + ind)
      const target = VOLUME_TARGETS[muscle] ?? [4, 16]
      const dayIds = [...(days.get(muscle) ?? [])]
      const doneSets = done.get(muscle) ?? 0
      const dueSets = due.get(muscle) ?? 0

      let trackStatus: TrackStatus
      if (direct > 0 && doneSets >= direct) trackStatus = 'completo'
      else if (dueSets === 0 && doneSets === 0) trackStatus = 'sin-empezar'
      else if (doneSets < dueSets) trackStatus = 'corto'
      else trackStatus = 'al-dia'

      return {
        muscle,
        plannedSets: direct,
        indirectSets: ind,
        effectiveSets: effective,
        frequency: dayIds.length,
        dayIds,
        doneSets,
        dueSets,
        pendingSets: Math.max(0, direct - dueSets),
        trackStatus,
        target,
        // El estado se juzga sobre el volumen EFECTIVO: si no, el deltoides
        // anterior saldría "bajo" con 3 series cuando en realidad se lleva
        // media serie de cada press del día de empuje.
        status: statusFor(effective, target, !!phase.deload),
        priority: PRIORITY_MUSCLES.includes(muscle),
        deload: !!phase.deload,
      }
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority ? -1 : 1
      return b.effectiveSets - a.effectiveSets
    })
}

/** Totales por región (hombro completo, pierna completa, brazo completo) */
export function regionVolume(rows: MuscleVolumeRow[]): RegionVolumeRow[] {
  return MUSCLE_REGIONS.map(({ label, members }) => {
    const found = members
      .map((m) => rows.find((r) => r.muscle === m))
      .filter((r): r is MuscleVolumeRow => !!r)
    const dayIds = new Set(found.flatMap((r) => r.dayIds))
    const sum = (pick: (r: MuscleVolumeRow) => number) =>
      Math.round(found.reduce((a, r) => a + pick(r), 0) * 2) / 2
    return {
      label,
      directSets: sum((r) => r.plannedSets),
      indirectSets: sum((r) => r.indirectSets),
      effectiveSets: sum((r) => r.effectiveSets),
      frequency: dayIds.size,
      target: [sum((r) => r.target[0]), sum((r) => r.target[1])] as [number, number],
      members: found,
    }
  }).filter((r) => r.members.length > 0)
}

/**
 * Músculos que superan el techo de series fraccionadas en una sola sesión.
 * Es el segundo eje de calibración: el total semanal puede estar perfecto y
 * aun así estar mal repartido dentro de la semana.
 */
export function perSessionOverload(week: number): SessionOverload[] {
  const phase = phaseForWeek(week)
  const out: SessionOverload[] = []

  for (const day of WORKOUT_DAYS) {
    const acc = new Map<MuscleGroup, number>()
    for (const ex of day.exercises) {
      if (ex.alternativeOf) continue
      const { sets } = plannedSets(ex, week, phase)
      acc.set(ex.muscle, (acc.get(ex.muscle) ?? 0) + sets)
      for (const [m, factor] of Object.entries(ex.secondary ?? {})) {
        const muscle = m as MuscleGroup
        acc.set(muscle, (acc.get(muscle) ?? 0) + sets * (factor ?? 0))
      }
    }
    for (const [muscle, sets] of acc) {
      if (sets > PER_SESSION_CEILING) {
        out.push({
          dayId: day.id,
          dayName: day.name,
          muscle,
          fractionalSets: Math.round(sets * 2) / 2,
        })
      }
    }
  }

  return out.sort((a, b) => b.fractionalSets - a.fractionalSets)
}

/** Músculos que se quedan por debajo del mínimo recomendado esta semana */
export function underdosedMuscles(
  week: number,
  sessions: SessionLog[] = [],
): MuscleVolumeRow[] {
  return weeklyVolume(week, sessions).filter((r) => r.status === 'bajo')
}
