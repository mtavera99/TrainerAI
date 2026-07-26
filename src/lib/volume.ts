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
 * Rangos de series DIRECTAS por músculo y semana para un intermedio en
 * superávit. Son rangos amplios a propósito: la evidencia muestra una
 * relación dosis-respuesta con rendimientos decrecientes, no un número
 * mágico. El extremo alto se reserva para músculos prioritarios.
 */
export const VOLUME_TARGETS: Record<MuscleGroup, [number, number]> = {
  Cuádriceps: [12, 20],
  Femoral: [8, 16],
  Glúteo: [4, 12],
  Aductores: [2, 8],
  Gemelos: [6, 14],
  Pecho: [8, 18],
  Espalda: [10, 20],
  'Hombro lateral': [8, 20],
  // Mínimo 6, no 4: con 13 series de press de pecho más el press militar, el
  // deltoides posterior necesita ese suelo para equilibrar el hombro (estética
  // y salud articular). Con el mínimo en 4, las 4 series que había salían "ok"
  // y escondían que era la cabeza peor atendida del programa.
  'Hombro posterior': [6, 14],
  // Necesita poco trabajo directo: se lleva media serie de cada press del día
  // de empuje. Ese trabajo indirecto se cuenta, así que el rango es sobre el
  // volumen EFECTIVO (directo + indirecto), no solo sobre las series directas.
  'Hombro anterior': [4, 12],
  Bíceps: [6, 16],
  Tríceps: [6, 16],
  Antebrazo: [4, 12],
  Core: [4, 12],
}

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
  /** Series efectivamente registradas esta semana */
  doneSets: number
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
  members: MuscleVolumeRow[]
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

  // Se recorren todos los músculos que aparecen como directos O como indirectos
  const allMuscles = new Set<MuscleGroup>([...planned.keys(), ...indirect.keys()])

  return [...allMuscles]
    .map((muscle) => {
      const direct = planned.get(muscle) ?? 0
      const ind = half(indirect.get(muscle) ?? 0)
      const effective = half(direct + ind)
      const target = VOLUME_TARGETS[muscle] ?? [4, 16]
      const dayIds = [...(days.get(muscle) ?? [])]
      return {
        muscle,
        plannedSets: direct,
        indirectSets: ind,
        effectiveSets: effective,
        frequency: dayIds.length,
        dayIds,
        doneSets: done.get(muscle) ?? 0,
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
      members: found,
    }
  }).filter((r) => r.members.length > 0)
}

/** Músculos que se quedan por debajo del mínimo recomendado esta semana */
export function underdosedMuscles(
  week: number,
  sessions: SessionLog[] = [],
): MuscleVolumeRow[] {
  return weeklyVolume(week, sessions).filter((r) => r.status === 'bajo')
}
