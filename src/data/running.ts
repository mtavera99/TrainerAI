import type { RunSessionTemplate } from '../types'

// ============================================================
// PLAN DE RUNNING — de 20 min run/walk a 5 KM continuos (10 semanas)
// Basado en el punto de partida de Santiago (~20 min, aprendiendo
// cadencia, apoyo de mediopié y respiración). Progresión conservadora
// para NO irritar el tibial anterior ni la lesión de cadera.
//
// CÓMO ENCAJARLO CON LAS PIERNAS (prioridad nº1 del bloque):
// El plan lista 3 salidas por semana, pero correr es la modalidad de cardio
// que más interfiere con la hipertrofia de pierna. Con el calendario actual:
//   · Salida CONTINUA  → martes (día de empuje)
//   · Salida LARGA     → sábado (día de hombro/brazos)
//   · Salida de INTERVALOS → opcional: el fútbol del viernes ya te da el
//     estímulo de alta intensidad y sprints repetidos. Si la haces, que sea
//     el sábado, nunca el día antes ni el mismo día de una sesión de pierna.
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

function s(
  id: string,
  label: string,
  type: RunSessionTemplate['type'],
  description: string,
  durationMin: number,
): RunSessionTemplate {
  return { id, label, type, description, durationMin }
}

// Progresión semanal: 3 salidas por semana
export const RUNNING_PLAN: RunningWeek[] = [
  {
    week: 1,
    focus: 'Adaptación · aprender a correr suave',
    sessions: [
      s('w1a', 'Intervalos', 'Intervalos', '5 min caminar + 6 x (1 min trote suave / 1,5 min caminar). Foco en cadencia.', 24),
      s('w1b', 'Suave', 'Suave', '5 x (1,5 min trote / 1,5 min caminar). Practica apoyo de mediopié.', 20),
      s('w1c', 'Continuo', 'Continuo', '5 x (2 min trote / 1 min caminar). Respiración relajada.', 20),
    ],
  },
  {
    week: 2,
    focus: 'Aumentar tiempo en trote',
    sessions: [
      s('w2a', 'Intervalos', 'Intervalos', '6 x (2 min trote / 1 min caminar). Pasos cortos.', 22),
      s('w2b', 'Suave', 'Suave', '5 x (3 min trote / 1 min caminar). Hombros sueltos.', 22),
      s('w2c', 'Continuo', 'Continuo', '4 x (4 min trote / 1 min caminar).', 24),
    ],
  },
  {
    week: 3,
    focus: 'Bloques más largos',
    sessions: [
      s('w3a', 'Intervalos', 'Intervalos', '5 x (5 min trote / 1 min caminar).', 30),
      s('w3b', 'Suave', 'Suave', '3 x (6 min trote / 1,5 min caminar).', 24),
      s('w3c', 'Continuo', 'Continuo', '2 x (10 min trote / 2 min caminar).', 24),
    ],
  },
  {
    week: 4,
    focus: 'Reducir pausas',
    sessions: [
      s('w4a', 'Intervalos', 'Intervalos', '4 x (7 min trote / 1 min caminar).', 32),
      s('w4b', 'Suave', 'Suave', '20 min trote continuo muy suave (camina si lo necesitas).', 22),
      s('w4c', 'Continuo', 'Continuo', '2 x (12 min trote / 2 min caminar).', 28),
    ],
  },
  {
    week: 5,
    focus: 'Primer continuo largo',
    sessions: [
      s('w5a', 'Intervalos', 'Intervalos', '3 x (10 min trote / 1,5 min caminar).', 34),
      s('w5b', 'Suave', 'Suave', '25 min trote continuo suave.', 27),
      s('w5c', 'Continuo', 'Continuo', '20 min continuo + 5 min a ritmo algo más vivo.', 28),
    ],
  },
  {
    week: 6,
    focus: 'Construir 30 min',
    sessions: [
      s('w6a', 'Intervalos', 'Intervalos', '25 min continuo + 4 x 30 s más rápidos (recupera trotando).', 34),
      s('w6b', 'Suave', 'Suave', '30 min trote continuo suave. ~3-3,5 km.', 32),
      s('w6c', 'Continuo', 'Continuo', '2 x 15 min continuo con 2 min caminar entre medias.', 34),
    ],
  },
  {
    week: 7,
    focus: 'Acercarse a 4 km',
    sessions: [
      s('w7a', 'Intervalos', 'Intervalos', '28 min continuo + 5 x 40 s vivos.', 36),
      s('w7b', 'Suave', 'Suave', '35 min continuo suave (~4 km).', 37),
      s('w7c', 'Continuo', 'Continuo', '32 min continuo a ritmo cómodo.', 34),
    ],
  },
  {
    week: 8,
    focus: 'Ritmo objetivo 5K',
    sessions: [
      s('w8a', 'Intervalos', 'Intervalos', '4 x 5 min a ritmo objetivo 5K / 90 s trote suave.', 38),
      s('w8b', 'Suave', 'Suave', '38 min continuo suave.', 40),
      s('w8c', 'Continuo', 'Continuo', '4 km continuos a ritmo cómodo.', 32),
    ],
  },
  {
    week: 9,
    focus: 'Casi listo · 4,5 km',
    sessions: [
      s('w9a', 'Intervalos', 'Intervalos', '3 x 8 min a ritmo 5K / 2 min trote.', 38),
      s('w9b', 'Suave', 'Suave', '30 min muy suave (regenerativo).', 32),
      s('w9c', 'Continuo', 'Continuo', '4,5 km continuos, controla la cadencia.', 34),
    ],
  },
  {
    week: 10,
    focus: 'Semana test · ¡5 KM continuos!',
    sessions: [
      s('w10a', 'Suave', 'Suave', '20 min muy suave para activar (2 días antes del test).', 22),
      s('w10b', 'Suave', 'Suave', '15 min trote flojo + 3 aceleraciones cortas. Descansa después.', 18),
      s('w10c', 'Test 5K', 'Test 5K', '🏁 5 KM CONTINUOS. Empieza conservador, disfruta y termina fuerte.', 32),
    ],
  },
]

export function runningWeek(week: number): RunningWeek {
  return (
    RUNNING_PLAN.find((w) => w.week === week) ??
    RUNNING_PLAN[RUNNING_PLAN.length - 1]
  )
}
