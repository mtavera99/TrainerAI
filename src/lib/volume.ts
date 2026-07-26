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
  'Hombro posterior': [4, 12],
  Hombro: [3, 10],
  Bíceps: [6, 16],
  Tríceps: [6, 16],
  Antebrazo: [4, 12],
  Core: [4, 12],
}

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
  /** Series que el programa planifica esta semana */
  plannedSets: number
  /** Días distintos de la semana en los que se entrena ese músculo */
  frequency: number
  /** Series efectivamente registradas esta semana */
  doneSets: number
  target: [number, number]
  status: VolumeStatus
  priority: boolean
  /** La semana analizada es de descarga (el volumen bajo es intencionado) */
  deload: boolean
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
  const days = new Map<MuscleGroup, Set<string>>()

  for (const day of WORKOUT_DAYS) {
    for (const ex of day.exercises) {
      if (ex.alternativeOf) continue // es la opción B, no suma
      const { sets } = plannedSets(ex, week, phase, sessions)
      planned.set(ex.muscle, (planned.get(ex.muscle) ?? 0) + sets)
      if (!days.has(ex.muscle)) days.set(ex.muscle, new Set())
      days.get(ex.muscle)!.add(day.id)
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

  return [...planned.entries()]
    .map(([muscle, sets]) => {
      const target = VOLUME_TARGETS[muscle] ?? [4, 16]
      return {
        muscle,
        plannedSets: sets,
        frequency: days.get(muscle)?.size ?? 0,
        doneSets: done.get(muscle) ?? 0,
        target,
        status: statusFor(sets, target, !!phase.deload),
        priority: PRIORITY_MUSCLES.includes(muscle),
        deload: !!phase.deload,
      }
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority ? -1 : 1
      return b.plannedSets - a.plannedSets
    })
}

/** Músculos que se quedan por debajo del mínimo recomendado esta semana */
export function underdosedMuscles(
  week: number,
  sessions: SessionLog[] = [],
): MuscleVolumeRow[] {
  return weeklyVolume(week, sessions).filter((r) => r.status === 'bajo')
}
