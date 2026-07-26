import type { BodyWeightEntry, Profile } from '../types'

// ============================================================
// RITMO DE GANANCIA
// ------------------------------------------------------------
// Un programa de hipertrofia sin superávit calórico es un programa de
// mantenimiento con más agujetas. La app ya registraba el peso corporal y
// pintaba una gráfica, pero no sacaba ninguna conclusión de ella.
//
// Aquí se calcula la TENDENCIA real (regresión lineal sobre las últimas 4
// semanas, no "lo que marca la báscula hoy") y se compara con el ritmo que
// interesa a un intermedio que no quiere engordar de más: +0,2 a +0,5 % del
// peso corporal por semana. Si el peso lleva semanas plano, el problema no
// es la rutina: es la comida.
// ============================================================

/** Ventana de análisis en días */
const WINDOW_DAYS = 28
/** Banda objetivo de ganancia semanal, en % del peso corporal */
export const TARGET_GAIN_PCT: [number, number] = [0.2, 0.5]
/** Proteína recomendada en g por kg de peso corporal */
export const PROTEIN_PER_KG: [number, number] = [1.8, 2.2]

export type GainStatus =
  | 'sin-datos'
  | 'perdiendo'
  | 'plano'
  | 'lento'
  | 'optimo'
  | 'rapido'

export interface GainRateReport {
  status: GainStatus
  /** Kg por semana según la tendencia */
  weeklyKg: number
  /** % del peso corporal por semana */
  weeklyPct: number
  /** Peso suavizado actual (última media móvil) */
  smoothedKg: number
  /** Días de datos usados */
  daysAnalysed: number
  /** Semanas estimadas para llegar a la meta al ritmo actual */
  weeksToGoal?: number
  headline: string
  advice: string
}

export interface NutritionTargets {
  /** Gasto energético estimado (kcal) */
  tdee: number
  /** Calorías objetivo para ganar músculo */
  kcal: number
  proteinG: [number, number]
}

function daysBetween(a: string, b: string): number {
  return (
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  )
}

/**
 * Pendiente por mínimos cuadrados en kg/día. Usar la tendencia y no la
 * diferencia entre dos pesadas evita que un día de sal o de mala digestión
 * cambie la conclusión.
 */
function slopePerDay(points: { x: number; y: number }[]): number {
  const n = points.length
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

/** Media móvil de los últimos `days` días con datos */
export function smoothedWeight(
  log: BodyWeightEntry[],
  days = 7,
): number | undefined {
  if (log.length === 0) return undefined
  const sorted = [...log].sort((a, b) => a.date.localeCompare(b.date))
  const lastDate = sorted[sorted.length - 1].date
  const window = sorted.filter(
    (e) => daysBetween(e.date, lastDate) <= days - 1,
  )
  const use = window.length > 0 ? window : [sorted[sorted.length - 1]]
  return use.reduce((a, e) => a + e.weightKg, 0) / use.length
}

export function gainRateReport(
  profile: Profile,
  log: BodyWeightEntry[],
): GainRateReport {
  const sorted = [...log]
    .filter((e) => e.weightKg > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  const smoothed = smoothedWeight(sorted) ?? profile.weightKg

  if (sorted.length < 4) {
    return {
      status: 'sin-datos',
      weeklyKg: 0,
      weeklyPct: 0,
      smoothedKg: Math.round(smoothed * 10) / 10,
      daysAnalysed: 0,
      headline: 'Faltan pesadas para leer la tendencia',
      advice:
        'Pésate al menos 3 veces por semana, siempre al levantarte y en ayunas. Con 4 pesadas la app ya puede decirte si de verdad estás ganando peso o llevas semanas igual sin darte cuenta.',
    }
  }

  const lastDate = sorted[sorted.length - 1].date
  const window = sorted.filter(
    (e) => daysBetween(e.date, lastDate) <= WINDOW_DAYS,
  )
  const span = daysBetween(window[0].date, lastDate)

  if (window.length < 4 || span < 10) {
    return {
      status: 'sin-datos',
      weeklyKg: 0,
      weeklyPct: 0,
      smoothedKg: Math.round(smoothed * 10) / 10,
      daysAnalysed: Math.round(span),
      headline: 'Tendencia todavía no fiable',
      advice:
        'Necesito unos 10-14 días de pesadas seguidas para distinguir una ganancia real de la variación normal del día a día (agua, sal, digestión).',
    }
  }

  const points = window.map((e) => ({
    x: daysBetween(window[0].date, e.date),
    y: e.weightKg,
  }))
  const weeklyKg = Math.round(slopePerDay(points) * 7 * 100) / 100
  const weeklyPct = Math.round((weeklyKg / smoothed) * 1000) / 10
  const [lo, hi] = TARGET_GAIN_PCT
  const targetLoKg = Math.round(smoothed * lo) / 100
  const targetHiKg = Math.round(smoothed * hi) / 100

  let status: GainStatus
  if (weeklyPct < -0.1) status = 'perdiendo'
  else if (weeklyPct < 0.1) status = 'plano'
  else if (weeklyPct < lo) status = 'lento'
  else if (weeklyPct <= hi) status = 'optimo'
  else status = 'rapido'

  const remaining = profile.goalWeightKg - smoothed
  const weeksToGoal =
    weeklyKg > 0.02 && remaining > 0
      ? Math.ceil(remaining / weeklyKg)
      : undefined

  const HEADLINES: Record<GainStatus, string> = {
    'sin-datos': 'Sin datos suficientes',
    perdiendo: 'Estás perdiendo peso',
    plano: 'Tu peso está plano',
    lento: 'Ganas, pero demasiado despacio',
    optimo: 'Ritmo de ganancia correcto',
    rapido: 'Estás ganando demasiado rápido',
  }

  const ADVICE: Record<GainStatus, string> = {
    'sin-datos': '',
    perdiendo: `Estás bajando ${Math.abs(
      weeklyKg,
    )} kg/semana. Con 5 sesiones de fuerza, fútbol y las salidas de running estás gastando más de lo que crees: no vas a ganar músculo así. Sube ~400 kcal al día (arroz, pasta, avena, aceite de oliva) y revisa en 2 semanas.`,
    plano: `Llevas semanas clavado en ~${
      Math.round(smoothed * 10) / 10
    } kg. Estás en mantenimiento, no en superávit: por buena que sea la rutina, el músculo nuevo necesita material. Añade ~300 kcal al día y busca subir entre ${targetLoKg} y ${targetHiKg} kg por semana.`,
    lento: `Vas en la dirección correcta pero por debajo del objetivo (${weeklyKg} kg/sem). Suma ~150-200 kcal al día para entrar en la banda de ${targetLoKg}-${targetHiKg} kg/semana.`,
    optimo: `${weeklyKg} kg/semana (${weeklyPct}% del peso corporal) es exactamente donde quieres estar: suficiente para construir músculo sin acumular grasa de más. No cambies nada y sigue pesándote.`,
    rapido: `${weeklyKg} kg/semana es más de lo que puedes convertir en músculo; el resto se va en grasa. Recorta ~250 kcal al día para volver a la banda de ${targetLoKg}-${targetHiKg} kg/semana.`,
  }

  return {
    status,
    weeklyKg,
    weeklyPct,
    smoothedKg: Math.round(smoothed * 10) / 10,
    daysAnalysed: Math.round(span),
    weeksToGoal,
    headline: HEADLINES[status],
    advice: ADVICE[status],
  }
}

/**
 * Estimación de calorías y proteína. Mifflin-St Jeor con un factor de
 * actividad alto (5 sesiones de fuerza + fútbol + running) y un superávit
 * moderado del 10%, que es lo que sostiene la banda de ganancia objetivo.
 */
export function nutritionTargets(
  profile: Profile,
  smoothedKg?: number,
): NutritionTargets {
  const kg = smoothedKg && smoothedKg > 0 ? smoothedKg : profile.weightKg
  const bmr = 10 * kg + 6.25 * profile.heightCm - 5 * profile.age + 5
  const tdee = bmr * 1.75
  return {
    tdee: Math.round(tdee / 10) * 10,
    kcal: Math.round((tdee * 1.1) / 10) * 10,
    proteinG: [
      Math.round(kg * PROTEIN_PER_KG[0]),
      Math.round(kg * PROTEIN_PER_KG[1]),
    ],
  }
}
