import type { RunSessionTemplate } from '../types'

// ============================================================
// PLAN DE RUNNING — de 20 min run/walk a 5 KM continuos (10 semanas)
// Basado en el punto de partida de Santiago (~20 min, aprendiendo
// cadencia, apoyo de mediopié y respiración). Progresión conservadora
// para NO irritar el tibial anterior ni la lesión de cadera.
// ------------------------------------------------------------
// QUÉ DÍA SE CORRE Y POR QUÉ
// Cada salida lleva su día asignado en los datos (campo `day`), no en un
// comentario: si el calendario y el plan de running no coinciden, se ve.
//
//   · MARTES  → salida principal de mitad de semana (día de Empuje)
//   · JUEVES  → OPCIONAL, muy suave (día de Espalda)
//   · SÁBADO  → la salida larga, la que construye los 5 km (día de Hombro)
//
// Las tres caen en días de TREN SUPERIOR y NINGUNA el mismo día que Pierna A
// (lunes) o Pierna B (miércoles). Correr es la modalidad de cardio que más
// interfiere con la hipertrofia de pierna, y el domingo se descansa del todo
// para llegar fresco al lunes.
//
// AVISO HONESTO SOBRE EL MARTES: con 5 días de pesas + fútbol el viernes NO
// existe un calendario sin ningún compromiso. El martes es la víspera de
// Pierna B, así que es el compromiso que asumimos, y por eso el martes es
// SIEMPRE trote continuo conversacional: nunca series ni ritmo 5K. Un rodaje
// suave 24 h antes apenas afecta a la fuerza; una sesión de calidad sí.
//
// Toda la intensidad va el SÁBADO, que es el único día con 48 h sin pierna
// detrás (domingo de descanso). La del jueves es opcional y siempre
// regenerativa: el viernes juegas al fútbol y no interesa llegar con las
// piernas cargadas. Si dudas, sáltatela — el fútbol ya te aporta el estímulo
// de alta intensidad y sprints repetidos de la semana.
// ============================================================

export interface RunningWeek {
  week: number
  focus: string
  sessions: RunSessionTemplate[]
}

// Recordatorios técnicos permanentes (se muestran en la app)
export const RUNNING_CUES: string[] = [
  'Cadencia ligera: pasos cortos y frecuentes (apunta a ~170-180 ppm).',
  'No sobreextiendas la zancada: el pie aterriza bajo tu cuerpo, no por delante.',
  'Apoya el mediopié, no el talón clavado.',
  'Hombros relajados y bajos; brazos cerca del cuerpo.',
  'Mirada al frente, tronco ligeramente inclinado desde el tobillo.',
  'Respiración rítmica; si no puedes hablar, baja el ritmo.',
]

/** Salida del martes: la principal de mitad de semana */
function mar(
  id: string,
  type: RunSessionTemplate['type'],
  description: string,
  durationMin: number,
): RunSessionTemplate {
  return { id, label: 'Martes', day: 'Martes', type, description, durationMin }
}

/** Salida del jueves: opcional y regenerativa */
function jue(
  id: string,
  description: string,
  durationMin: number,
): RunSessionTemplate {
  return {
    id,
    label: 'Jueves',
    day: 'Jueves',
    type: 'Suave',
    description,
    durationMin,
    optional: true,
  }
}

/** Salida del sábado: la larga, la que construye los 5 km */
function sab(
  id: string,
  type: RunSessionTemplate['type'],
  description: string,
  durationMin: number,
): RunSessionTemplate {
  return { id, label: 'Sábado', day: 'Sábado', type, description, durationMin }
}

export const RUNNING_PLAN: RunningWeek[] = [
  {
    week: 1,
    focus: 'Adaptación · aprender a correr suave',
    sessions: [
      mar('w1-mar', 'Continuo', '5 x (2 min trote / 1 min caminar). Respiración relajada, sin prisa.', 20),
      jue('w1-jue', '5 x (1,5 min trote / 1,5 min caminar). Practica el apoyo de mediopié.', 20),
      sab('w1-sab', 'Continuo', '6 x (2 min trote / 1,5 min caminar). Foco en cadencia: pasos cortos.', 24),
    ],
  },
  {
    week: 2,
    focus: 'Aumentar tiempo en trote',
    sessions: [
      mar('w2-mar', 'Continuo', '6 x (2 min trote / 1 min caminar). Pasos cortos y frecuentes.', 22),
      jue('w2-jue', '5 x (2 min trote / 1,5 min caminar). Hombros sueltos.', 20),
      sab('w2-sab', 'Continuo', '4 x (4 min trote / 1 min caminar). Bloques más largos.', 24),
    ],
  },
  {
    week: 3,
    focus: 'Bloques más largos',
    sessions: [
      mar('w3-mar', 'Continuo', '5 x (3 min trote / 1 min caminar).', 24),
      jue('w3-jue', '4 x (3 min trote / 1,5 min caminar). Regenerativo, muy cómodo.', 20),
      sab('w3-sab', 'Continuo', '2 x (10 min trote / 2 min caminar). Primer bloque de 10 min.', 26),
    ],
  },
  {
    week: 4,
    focus: 'Reducir pausas',
    sessions: [
      mar('w4-mar', 'Continuo', '4 x (5 min trote / 1 min caminar).', 26),
      jue('w4-jue', '20 min de trote continuo muy suave (camina si lo necesitas).', 22),
      sab('w4-sab', 'Continuo', '2 x (12 min trote / 2 min caminar).', 28),
    ],
  },
  {
    week: 5,
    focus: 'Primer continuo largo',
    sessions: [
      mar('w5-mar', 'Continuo', '3 x (6 min trote / 1,5 min caminar).', 24),
      jue('w5-jue', '20 min de trote suave. Solo si las piernas están frescas.', 22),
      sab('w5-sab', 'Continuo', '25 min de trote continuo suave, sin pausas.', 27),
    ],
  },
  {
    week: 6,
    focus: 'Construir 30 min',
    sessions: [
      mar('w6-mar', 'Continuo', '2 x (12 min trote / 2 min caminar).', 28),
      jue('w6-jue', '20 min muy suave (regenerativo).', 22),
      sab('w6-sab', 'Continuo', '30 min de trote continuo suave. Unos 3-3,5 km.', 32),
    ],
  },
  {
    week: 7,
    focus: 'Acercarse a 4 km',
    sessions: [
      mar('w7-mar', 'Continuo', '25 min continuos a ritmo conversacional. Suave: mañana toca Pierna B.', 27),
      jue('w7-jue', '20 min muy suave.', 22),
      sab('w7-sab', 'Intervalos', '30 min continuos + 4 x 30 s más vivos al final (recupera trotando).', 36),
    ],
  },
  {
    week: 8,
    focus: 'Ritmo objetivo 5K',
    sessions: [
      mar('w8-mar', 'Continuo', '28 min continuos a ritmo conversacional. Sin apretar.', 30),
      jue('w8-jue', '20 min muy suave.', 22),
      sab('w8-sab', 'Intervalos', '4 km: los 3 primeros cómodos y el último a ritmo objetivo 5K.', 34),
    ],
  },
  {
    week: 9,
    focus: 'Casi listo · 4,5 km',
    sessions: [
      mar('w9-mar', 'Continuo', '30 min continuos suaves. Guarda las piernas para el miércoles.', 32),
      jue('w9-jue', '20 min muy suave (regenerativo).', 22),
      sab('w9-sab', 'Intervalos', '4,5 km continuos con 2 x 8 min a ritmo 5K dentro. Controla la cadencia.', 36),
    ],
  },
  {
    week: 10,
    focus: 'Semana test · ¡5 KM continuos!',
    sessions: [
      mar('w10-mar', 'Suave', '20 min muy suave para activar. Nada más.', 22),
      jue('w10-jue', '15 min de trote flojo + 3 aceleraciones cortas. Descansa el viernes.', 18),
      sab('w10-sab', 'Test 5K', '🏁 5 KM CONTINUOS. Empieza conservador, disfruta y termina fuerte.', 32),
    ],
  },
]

export function runningWeek(week: number): RunningWeek {
  return (
    RUNNING_PLAN.find((w) => w.week === week) ??
    RUNNING_PLAN[RUNNING_PLAN.length - 1]
  )
}

/** Salidas obligatorias de la semana (martes y sábado) */
export function requiredRuns(week: number): RunSessionTemplate[] {
  return runningWeek(week).sessions.filter((s) => !s.optional)
}
