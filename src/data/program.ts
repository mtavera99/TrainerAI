import type {
  ExerciseSwap,
  ExerciseTemplate,
  WorkoutDayTemplate,
  PhaseConfig,
  Profile,
} from '../types'

// ============================================================
// PROGRAMA BASE — Santiago Tavera · BLOQUE 2 (pierna rediseñada)
// ------------------------------------------------------------
// Bloque de 10 semanas. Prioridades (contexto maestro):
//   1) PIERNA (punto débil declarado) sin irritar glúteo/lumbar derecho
//   2) Amplitud de espalda   3) Deltoide lateral
//   4) Mantener/progresar pecho superior   5) Integrar running (5 km)
//
// Construido con las MÁQUINAS Y EJERCICIOS que Santiago usa ahora
// mismo en su gimnasio. Juega fútbol los VIERNES.
//
// Split de 5 días + fútbol (vie) + 2-3 salidas de running:
//   D1 Pierna A (cuádriceps + 1ª dosis isquios)
//   D2 Empuje (pecho/hombro/tríceps)   ·  D3 Espalda + post. + bíceps
//   D4 Pierna B (posterior + 2ª dosis cuádriceps)
//   D5 Hombro + amplitud + brazos
//
// FRECUENCIA REAL POR MÚSCULO (auditada en lib/volume.ts, no "de palabra"):
//   Cuádriceps 2x · Femoral 2x · Glúteo 1x (+fútbol) · Gemelos 2x
//   Espalda 2x · Deltoide lateral 3x · Bíceps 2x · Tríceps 2x · Antebrazo 3x
//   Core 2x · Pecho 1x (decisión suya: el día de pecho le gusta como está)
//
// ------------------------------------------------------------
// BLOQUE 3 · POR QUÉ SE TOCA EL BRAZO Y LA ESPALDA
// ------------------------------------------------------------
// Santiago reporta al cerrar el bloque: la pierna responde muy bien, el hombro
// también, y el brazo lo siente descuidado. Al auditar el programa con datos,
// la sensación tenía tres causas medibles y ninguna era "faltan ejercicios":
//
//  1) EL BRAZO NO ESCALABA NADA. El campo `maxSets` solo lo tenían los
//     ejercicios de pierna, así que en 10 semanas la pierna sumaba 14 series
//     y el brazo exactamente 0. Bíceps se quedaba en 9 series directas las 10
//     semanas y el antebrazo en 9. Ahora bíceps escala 9 → 12, tríceps 11 → 13,
//     antebrazo 9 → 10, espalda 13 → 15, posterior 7 → 8 y core 6 → 8.
//
//  2) EL BRAZO IBA SIEMPRE ÚLTIMO. En el día de espalda el bíceps ocupaba las
//     posiciones 6ª y 7ª de 8; en el día llamado "Hombro + Brazos" el bíceps
//     era el 5º y el tríceps el 6º y 7º. El orden decide qué recibe tu mejor
//     esfuerzo y qué se cae cuando el entreno se alarga. Ahora el brazo va en
//     5ª-6ª posición el jueves y en 3ª-4ª el sábado.
//
//  3) LOS RANGOS DE REPS ERAN TAN ANCHOS QUE LA CARGA NO SUBÍA NUNCA. Once
//     ejercicios tenían rangos de 6-8 reps de amplitud (12-20 en laterales,
//     antebrazo, aductores, gemelos sentado, crunch, cruce). La regla de subir
//     peso exigía tocar el techo del rango, y 20 reps limpias a RIR bajo no
//     pasan casi nunca: el ejercicio quedaba condenado a "mantén el peso".
//     Todos los rangos están ahora en 3-4 reps de amplitud, que es lo que
//     hace que la doble progresión se pueda cerrar de verdad.
//
// La pierna se deja casi intacta porque funciona. El único recorte es una serie
// de extensiones (techo 5 → 4): en S7 el cuádriceps acumulaba 14 series en la
// sesión del lunes y la meta-regresión de volumen por sesión sitúa el punto de
// rendimientos indetectables en torno a 11.
//
// DECISIONES DE PIERNA Y POR QUÉ (evidencia, no intuición):
//  · Cada músculo de pierna pasa de 1x a 2x/semana. Antes había 2 SESIONES
//    de pierna pero cada músculo se entrenaba una sola vez (cuádriceps lunes,
//    isquios miércoles). Repartir el mismo volumen en 2 sesiones permite
//    subir series totales sin que la sesión se haga interminable.
//  · El volumen ESCALA dentro del bloque (campo `maxSets`) en vez de ser fijo
//    las 10 semanas con solo el RIR bajando. Santiago confirma que el tiempo
//    por sesión no es limitante, así que la pierna sube fuerte: los días de
//    pierna van de 20-21 series (S1-3) a 25-27 (S7-9), unos 100-110 min.
//    IMPORTANTE: ese escalado es AUTORREGULADO (ver lib/progression.ts). Las
//    series extra solo se aplican si el ejercicio sigue progresando; si se
//    estanca, el volumen se retiene. Tener tiempo de sobra no significa que
//    el músculo pueda recuperar volumen infinito, sobre todo con fútbol el
//    viernes y dos salidas de running: el techo lo marcan sus datos.
//  · El curl femoral SENTADO pasa a ser el principal de isquios (más series
//    que el tumbado) porque con la cadera flexionada los isquios biarticulares
//    trabajan a mayor longitud, y eso produjo más hipertrofia que el tumbado
//    en el estudio de Maeo et al. 2021 (+14% vs +9% de volumen muscular).
//  · Prensa y péndulo/hack a rango profundo: mayor longitud muscular = más
//    crecimiento, y en su caso además evita cargar la columna.
//  · Nada de peso axial sobre la espalda (sentadilla libre / peso muerto):
//    todo el estímulo viene de máquinas por la lesión de glúteo/lumbar derecho.
//
// RUNNING Y FÚTBOL (efecto de interferencia):
//  · Correr —más que ir en bici— es la modalidad que más interfiere con la
//    hipertrofia de pierna. Antes había una salida el MISMO día que Pierna B
//    y otra el día siguiente, con el fútbol justo después: las piernas nunca
//    recuperaban. Ahora las salidas van en días de tren superior:
//      MARTES (fija, siempre conversacional) · JUEVES (opcional, muy suave)
//      SÁBADO (la larga y toda la intensidad de la semana)
//    y el domingo se descansa antes del lunes de pierna. El día concreto de
//    cada salida está en los datos del plan (data/running.ts, campo `day`),
//    no solo en este comentario, para que app y calendario no se contradigan.
//    El martes cae la víspera de Pierna B: con 5 días de pesas + fútbol no hay
//    hueco libre de compromisos, así que ese día NUNCA lleva series.
//  · El fútbol del viernes hace de sesión de alta intensidad de la semana.
// ============================================================

export const PROFILE_SEED: Profile = {
  name: 'Santiago Tavera',
  age: 26,
  heightCm: 174,
  weightKg: 78,
  bodyFatPct: 15,
  level: 'Intermedio',
  goalWeightKg: 80.5,
}

export const BLOCK_LENGTH_WEEKS = 10

// Calendario semanal: las salidas de running caen en días de TREN SUPERIOR
// para no robarle recuperación a las piernas, y el domingo se descansa para
// llegar fresco al lunes de pierna.
export interface ScheduleSlot {
  day: string
  activity: string
  workoutId?: string
  kind: 'fuerza' | 'running' | 'futbol' | 'descanso'
  /** Por qué está ahí (se muestra en Perfil) */
  note?: string
}

export const WEEK_SCHEDULE: ScheduleSlot[] = [
  {
    day: 'Lunes',
    activity: 'Pierna A · Cuádriceps + isquios',
    workoutId: 'd1',
    kind: 'fuerza',
    note: 'Tu prioridad nº1 va el día que llegas más fresco (domingo de descanso detrás).',
  },
  {
    day: 'Martes',
    activity: 'Empuje · Pecho/Hombro/Tríceps + running (fijo)',
    workoutId: 'd2',
    kind: 'fuerza',
    note: 'Salida de running principal de mitad de semana, en día de tren superior: no compite con las piernas.',
  },
  {
    day: 'Miércoles',
    activity: 'Pierna B · Posterior + cuádriceps',
    workoutId: 'd4',
    kind: 'fuerza',
    note: '48 h después de Pierna A y 48 h antes del fútbol. Sin correr este día.',
  },
  {
    day: 'Jueves',
    activity: 'Espalda + Bíceps + running (opcional)',
    workoutId: 'd3',
    kind: 'fuerza',
    note: 'La salida del jueves es opcional y siempre muy suave: mañana juegas al fútbol y no interesa llegar con las piernas cargadas. Si dudas, sáltatela.',
  },
  {
    day: 'Viernes',
    activity: 'Fútbol ⚽',
    kind: 'futbol',
    note: 'Hace de sesión de alta intensidad de la semana (sprints repetidos).',
  },
  {
    day: 'Sábado',
    activity: 'Hombro + Brazos + running largo (fijo)',
    workoutId: 'd5',
    kind: 'fuerza',
    note: 'La tirada larga que construye los 5 km. Va aquí porque es el único día con 48 h sin pierna detrás (domingo de descanso).',
  },
  {
    day: 'Domingo',
    activity: 'Descanso total (caminar / movilidad)',
    kind: 'descanso',
    note: 'Descanso real para que el lunes las piernas rindan al 100%.',
  },
]

// Periodización del bloque: el RIR baja Y el volumen sube (las series extra
// se aplican solo a los ejercicios con `maxSets`, o sea a las piernas).
export const PHASES: PhaseConfig[] = [
  {
    fromWeek: 1,
    toWeek: 3,
    name: 'Acumulación',
    targetRIR: 3,
    description:
      'Series base y técnica. Deja 2-3 reps en recámara (RIR 2-3). Rango completo y control de la bajada: aquí se fija el patrón, no se buscan récords.',
  },
  {
    fromWeek: 4,
    toWeek: 6,
    name: 'Intensificación',
    targetRIR: 2,
    description:
      'RIR 1-2 en las series principales y +1 serie en los ejercicios de pierna. Es la fase donde más carga deberías añadir.',
  },
  {
    fromWeek: 7,
    toWeek: 9,
    name: 'Pico',
    targetRIR: 1,
    description:
      'Máxima tensión: RIR 0-1 en la última serie y +2 series en pierna respecto al inicio. La fatiga será alta, cuida sueño y comida.',
  },
  {
    fromWeek: 10,
    toWeek: 10,
    name: 'Descarga',
    targetRIR: 4,
    deload: true,
    description:
      'Descarga: ~40% menos series, cargas al 90% y RIR 4. Aquí se materializa el crecimiento del bloque; no la saltes.',
  },
]

export function phaseForWeek(week: number): PhaseConfig {
  return (
    PHASES.find((p) => week >= p.fromWeek && week <= p.toWeek) ??
    PHASES[PHASES.length - 1]
  )
}

// ============================================================
// VARIANTES (sustituciones)
// ------------------------------------------------------------
// Un programa escrito con máquinas concretas choca con la realidad: la máquina
// está ocupada, o simplemente hay una versión del ejercicio que se siente
// mejor. Antes no había forma de registrarlo y había que anotarlo como si se
// hubiera hecho el de la plantilla, lo que metía kilos no comparables en el
// mismo historial (20 kg de barra recta no son 20 kg de polea).
//
// Cada variante entrena el MISMO músculo con el MISMO número de series, así
// que el volumen semanal no cambia. Lo que cambia es el historial de cargas:
// cada variante progresa con sus propios kilos y su propio escalón de carga.
//
// Además de estas, la app siempre deja escribir una variante libre, así que
// nunca te quedas sin forma de registrar lo que hiciste de verdad.
// ============================================================

/** Antebrazo: la barra recta es la que Santiago usa la mayoría de las veces */
const SWAPS_ANTEBRAZO: ExerciseSwap[] = [
  {
    id: 'barra-recta',
    name: 'Curl de muñeca con barra recta',
    equipment: 'Barra',
    loadStep: 2.5,
    note: 'Antebrazos apoyados en el banco o en los muslos, muñecas por fuera del borde. Baja hasta abrir la mano y cierra fuerte al subir. Estimula lo mismo que la polea; si la sientes mejor, es mejor ejercicio para ti.',
  },
  {
    id: 'mancuernas',
    name: 'Curl de muñeca con mancuernas',
    equipment: 'Mancuerna',
    loadStep: 2,
    note: 'Una mano cada vez o las dos a la vez. Permite corregir si un antebrazo va por detrás del otro.',
  },
  {
    id: 'inverso',
    name: 'Curl inverso / extensión de muñeca',
    equipment: 'Barra',
    loadStep: 1.25,
    note: 'Palmas hacia abajo: trabaja los EXTENSORES, no los flexores. Úsalo si notas desequilibrio o molestias de codo. Pesos muy bajos, el rango manda.',
  },
]

/** Elevaciones laterales: las tres dosis semanales admiten cambio de material */
const SWAPS_LATERAL: ExerciseSwap[] = [
  {
    id: 'mancuernas',
    name: 'Elevaciones laterales con mancuernas',
    equipment: 'Mancuerna',
    loadStep: 2,
    note: 'Más libertad de recorrido y más exigencia de técnica: sin impulso de cadera, lidera con el codo y para justo a la altura del hombro.',
  },
  {
    id: 'polea-unilateral',
    name: 'Elevación lateral en polea (a un brazo)',
    equipment: 'Polea',
    loadStep: 1.25,
    note: 'La polea mantiene tensión también abajo, donde la mancuerna la pierde. Un brazo cada vez, agarrando por delante del cuerpo.',
  },
]

const SWAPS_CURL_BICEPS: ExerciseSwap[] = [
  {
    id: 'mancuernas',
    name: 'Curl de bíceps con mancuernas',
    equipment: 'Mancuerna',
    loadStep: 2,
    note: 'Sentado en banco, sin balanceo. Puedes alternar brazos.',
  },
  {
    id: 'barra-z',
    name: 'Curl con barra Z',
    equipment: 'Barra',
    loadStep: 2.5,
    note: 'Agarre semisupino: más cómodo de muñeca que la barra recta.',
  },
]

const SWAPS_TRICEPS_POLEA: ExerciseSwap[] = [
  {
    id: 'barra-z-tumbado',
    name: 'Extensión con barra Z tumbado',
    equipment: 'Barra',
    loadStep: 2.5,
    note: 'Baja hacia la frente con los codos quietos. Estira bien la cabeza larga arriba.',
  },
  {
    id: 'mancuerna-una-mano',
    name: 'Extensión con mancuerna a una mano',
    equipment: 'Mancuerna',
    loadStep: 2,
    note: 'Sobre la cabeza, un brazo cada vez. Útil si la polea está ocupada.',
  },
]

const SWAPS_COPA: ExerciseSwap[] = [
  {
    id: 'polea-cuerda',
    name: 'Extensión sobre la cabeza en polea (cuerda)',
    equipment: 'Polea',
    loadStep: 1.25,
    note: 'De espaldas a la polea, cuerda por detrás de la nuca. Mantiene tensión en el estiramiento mejor que la mancuerna.',
  },
  {
    id: 'barra-z-copa',
    name: 'Extensión sobre la cabeza con barra Z',
    equipment: 'Barra',
    loadStep: 2.5,
    note: 'Sentado con respaldo. Codos apuntando al frente y quietos.',
  },
]

const SWAPS_PRESS_INCLINADO: ExerciseSwap[] = [
  {
    id: 'mancuernas',
    name: 'Press inclinado con mancuernas',
    equipment: 'Mancuerna',
    loadStep: 2,
    note: 'Más rango y más estiramiento abajo que el Smith, pero menos estable: baja el peso respecto a la barra y no compares los kilos.',
  },
]

const SWAPS_APERTURAS: ExerciseSwap[] = [
  {
    id: 'mancuernas-inclinado',
    name: 'Aperturas con mancuernas en banco inclinado',
    equipment: 'Mancuerna',
    loadStep: 2,
    note: 'Codos ligeramente flexionados y fijos. Abre hasta sentir el estiramiento del pectoral, sin forzar el hombro.',
  },
]

const SWAPS_JALON: ExerciseSwap[] = [
  {
    id: 'prono-ancho',
    name: 'Jalón al pecho con agarre prono ancho',
    equipment: 'Polea',
    loadStep: 5,
    note: 'Mismo movimiento, más énfasis en amplitud. Los kilos no coinciden con el MAG, así que lleva su propio historial.',
  },
  {
    id: 'neutro',
    name: 'Jalón con agarre neutro (paralelo)',
    equipment: 'Polea',
    loadStep: 5,
    note: 'Más recorrido y menos tensión de hombro. Buen recambio si el MAG está ocupado.',
  },
]

const SWAPS_REMO: ExerciseSwap[] = [
  {
    id: 'polea-sentado',
    name: 'Remo en polea sentado',
    equipment: 'Polea',
    loadStep: 5,
    note: 'Sin apoyo de pecho: mantén el torso quieto y no tires con la lumbar. Si notas el lado derecho, vuelve a la máquina.',
  },
]

const SWAPS_PULLOVER: ExerciseSwap[] = [
  {
    id: 'polea-cuerda',
    name: 'Pull over en polea alta (cuerda)',
    equipment: 'Polea',
    loadStep: 2.5,
    note: 'De pie, brazos casi rectos, empuja hacia las caderas sintiendo el dorsal. Mismo trabajo que la máquina.',
  },
]

const SWAPS_GEMELOS_PIE: ExerciseSwap[] = [
  {
    id: 'en-prensa',
    name: 'Gemelos en prensa',
    equipment: 'Máquina',
    loadStep: 5,
    note: 'Rodilla casi extendida, así que sigue siendo gastrocnemio. Estira 2 s abajo.',
  },
]

const SWAPS_EXTENSIONES: ExerciseSwap[] = [
  {
    id: 'unilateral',
    name: 'Extensiones de cuádriceps a una pierna',
    equipment: 'Máquina',
    loadStep: 2.5,
    note: 'Una pierna cada vez para corregir la asimetría del lado derecho. Registra el peso por pierna.',
  },
]

// ------------------------------------------------------------
// Días de entrenamiento
// ------------------------------------------------------------

export const WORKOUT_DAYS: WorkoutDayTemplate[] = [
  // ---------------- DÍA 1 · PIERNA A (CUÁDRICEPS + ISQUIOS) ----------------
  // 1ª de las 2 sesiones de pierna. Empieza con el movimiento más exigente
  // mientras estás fresco y termina con lo aislado y el core.
  {
    id: 'd1',
    name: 'Día 1 · Pierna A (Cuádriceps)',
    focus: 'Cuádriceps pesado + 1ª dosis de isquios y gemelos',
    color: '#22c55e',
    exercises: [
      {
        id: 'pendulo',
        name: 'Sentadilla péndulo',
        optionLabel: 'Opción A',
        muscle: 'Cuádriceps',
        equipment: 'Máquina',
        sets: 4,
        maxSets: 5,
        repMin: 6,
        repMax: 10,
        restSec: 180,
        loadStep: 5,
        primary: true,
        emphasis: 'estirado',
        secondary: { Glúteo: 0.5, Aductores: 0.3 },
        note: 'ELIGE A O B, nunca las dos. El péndulo es la opción preferente: la carga va sobre los hombros con la cadera guiada, así que respeta tu glúteo/lumbar derecho mejor que el hack. Baja hasta donde el rango sea profundo pero SIN que la pelvis se meta hacia dentro: el cuádriceps crece más cuando trabaja estirado, pero no a costa de la lumbar. 3 min de descanso: es la serie que más importa de la semana para tus piernas.',
      },
      {
        id: 'hack',
        name: 'Sentadilla hack',
        optionLabel: 'Opción B',
        alternativeOf: 'pendulo',
        muscle: 'Cuádriceps',
        equipment: 'Máquina',
        sets: 4,
        maxSets: 5,
        repMin: 6,
        repMax: 10,
        restSec: 180,
        loadStep: 5,
        primary: true,
        emphasis: 'estirado',
        secondary: { Glúteo: 0.5, Aductores: 0.3 },
        note: 'Alternativa al péndulo si ese día la máquina está ocupada o notas el glúteo derecho. Pies algo altos y torso pegado al respaldo. Registra solo UNA de las dos opciones: la app lleva el historial de cada máquina por separado porque los kilos no son comparables entre ellas.',
      },
      {
        id: 'prensa-unilateral',
        name: 'Prensa unilateral',
        muscle: 'Cuádriceps',
        equipment: 'Máquina',
        sets: 3,
        maxSets: 4,
        repMin: 10,
        repMax: 14,
        restSec: 120,
        loadStep: 5,
        unilateral: true,
        emphasis: 'estirado',
        secondary: { Glúteo: 0.5 },
        note: 'Unilateral a propósito: corrige la asimetría que arrastras del lado derecho y carga la pierna sin comprimir la columna. Acerca la rodilla al pecho todo lo que te permita la cadera derecha sin dolor; si molesta, recorta el rango antes que el peso.',
      },
      {
        id: 'extensiones',
        swaps: SWAPS_EXTENSIONES,
        name: 'Extensiones de cuádriceps',
        muscle: 'Cuádriceps',
        equipment: 'Máquina',
        sets: 3,
        maxSets: 4,
        repMin: 12,
        repMax: 15,
        restSec: 90,
        loadStep: 2.5,
        emphasis: 'acortado',
        note: 'Cierra el cuádriceps donde la prensa y el péndulo no llegan (contracción máxima) y con cero estrés lumbar. Pausa 1 s arriba y baja en 3 s. Aquí la técnica manda sobre el peso.',
      },
      {
        id: 'curl-femoral-tumbado',
        name: 'Curl femoral tumbado',
        muscle: 'Femoral',
        equipment: 'Máquina',
        sets: 3,
        maxSets: 4,
        repMin: 10,
        repMax: 14,
        restSec: 90,
        loadStep: 5,
        emphasis: 'medio',
        note: '1ª dosis semanal de isquios (la principal es el curl sentado de Pierna B). Con la cadera extendida trabajas más la cabeza corta del bíceps femoral, que el curl sentado deja algo de lado. Excéntrica de 3 s.',
      },
      {
        id: 'gemelos-pie',
        swaps: SWAPS_GEMELOS_PIE,
        name: 'Gemelos de pie (pantorrillas)',
        muscle: 'Gemelos',
        equipment: 'Máquina',
        sets: 4,
        maxSets: 5,
        repMin: 8,
        repMax: 12,
        restSec: 90,
        loadStep: 5,
        emphasis: 'estirado',
        note: 'De pie = rodilla extendida = gastrocnemio (el que da forma). Estira 2 s abajo y sube completo. Clave para correr sin molestias de tibial.',
      },
      {
        id: 'colgado-pies-barra',
        name: 'Colgado a la barra, pies a la barra',
        muscle: 'Core',
        equipment: 'Peso corporal',
        sets: 3,
        maxSets: 4,
        repMin: 8,
        repMax: 12,
        restSec: 60,
        loadStep: 0,
        note: 'Sube con control, sin balanceo. Un abdomen fuerte es parte del tratamiento de tu lumbar, no un extra estético. Si vas justo de tiempo, esto es lo único que puedes recortar de este día.',
      },
    ],
  },

  // ---------------- DÍA 2 · EMPUJE ----------------
  {
    id: 'd2',
    name: 'Día 2 · Empuje (Pecho/Hombro/Tríceps)',
    focus: 'Pecho superior, hombro y tríceps',
    color: '#f97316',
    exercises: [
      {
        id: 'press-agarre-ancho',
        name: 'Máquina de press (agarre ancho)',
        muscle: 'Pecho',
        equipment: 'Máquina',
        sets: 4,
        repMin: 8,
        repMax: 12,
        restSec: 120,
        loadStep: 2.5,
        primary: true,
        secondary: { 'Hombro anterior': 0.5, Tríceps: 0.5 },
        note: 'Estable, como te gusta. Retrae escápulas y baja controlando.',
      },
      {
        id: 'press-inclinado-smith',
        swaps: SWAPS_PRESS_INCLINADO,
        name: 'Press inclinado en Smith',
        muscle: 'Pecho',
        equipment: 'Smith',
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSec: 120,
        loadStep: 2.5,
        primary: true,
        secondary: { 'Hombro anterior': 0.5, Tríceps: 0.5 },
        note: 'Banco a ~30° para pecho superior (tu prioridad). Estira abajo, no choques arriba.',
      },
      // ---- EL TRÍCEPS Y EL ANTEBRAZO, ANTES DEL AISLAMIENTO DE PECHO ----
      // El día que se te acaba el tiempo, lo que se cae es lo último. En el
      // bloque 2 lo último de este día eran el press cerrado y el antebrazo: los
      // dos ejercicios de brazo. Pasó de verdad, el 15 de septiembre, y es
      // exactamente por eso que el brazo se siente apagado.
      {
        id: 'triceps-45-cbum',
        swaps: SWAPS_TRICEPS_POLEA,
        name: 'Extensión de tríceps 45° (polea, estilo CBUM)',
        muscle: 'Tríceps',
        equipment: 'Polea',
        sets: 3,
        maxSets: 4,
        repMin: 10,
        repMax: 14,
        restSec: 75,
        loadStep: 2.5,
        primary: true,
        emphasis: 'estirado',
        note: 'Inclinado hacia delante para estirar la cabeza larga. Estira bien arriba. Sube de la 6ª a la 3ª posición del día: el tríceps es prioridad de este bloque y tiene que recibir tu esfuerzo con fuerza de verdad, no los restos.',
      },
      {
        id: 'press-cerrado',
        name: 'Press cerrado',
        muscle: 'Tríceps',
        equipment: 'Smith',
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSec: 90,
        loadStep: 2.5,
        secondary: { Pecho: 0.5, 'Hombro anterior': 0.3 },
        note: 'Tríceps en patrón compuesto. Codos cerca del cuerpo. Ahora va 4º, con el tríceps todavía fresco.',
      },
      {
        id: 'antebrazo-polea-d2',
        movementId: 'antebrazo-polea',
        swaps: SWAPS_ANTEBRAZO,
        name: 'Curl de antebrazo en polea',
        muscle: 'Antebrazo',
        equipment: 'Polea',
        sets: 3,
        maxSets: 4,
        repMin: 12,
        repMax: 15,
        restSec: 45,
        loadStep: 1.25,
        note: 'Dosis 1/2 de la semana. Rango completo de muñeca, sin prisa. Rango 12-15 y no 12-20: con 8 reps de amplitud nunca llegabas al techo y la app te dejaba con el mismo peso mes tras mes.',
      },
      {
        id: 'aperturas-maquina-inclinada',
        swaps: SWAPS_APERTURAS,
        name: 'Aperturas en máquina inclinada',
        muscle: 'Pecho',
        equipment: 'Máquina',
        sets: 2,
        repMin: 12,
        repMax: 15,
        restSec: 75,
        loadStep: 2.5,
        emphasis: 'estirado',
        trimmable: true,
        note: 'Estiramiento máximo del pectoral, aprieta 1 s en el centro. Es el único aislamiento de pecho que queda: el cruce de cables se ha quitado para hacer sitio al brazo sin alargar el día. Ojo, aquí llevabas 9 sesiones seguidas en 10 kg porque el tope de subida de la app no dejaba ni poner un disco más; ya está arreglado, sube.',
      },
      {
        id: 'lateral-maquina-d2',
        movementId: 'lateral-maquina',
        swaps: SWAPS_LATERAL,
        name: 'Elevaciones laterales en máquina (de pie)',
        muscle: 'Hombro lateral',
        equipment: 'Máquina',
        sets: 4,
        repMin: 12,
        repMax: 16,
        restSec: 60,
        loadStep: 2.5,
        trimmable: true,
        note: 'Sin impulso, lidera con el codo, tensión constante. Va al final y marcada como recortable no porque no importe, sino porque el hombro es el grupo que mejor te está respondiendo y tiene tres dosis en la semana: si algún día hay que dejar algo, que sea una de las tres, no la única de bíceps.',
      },
    ],
  },

  // ---------------- DÍA 3 · ESPALDA + POSTERIOR + BÍCEPS ----------------
  {
    id: 'd3',
    name: 'Día 3 · Espalda + Bíceps',
    focus: 'Amplitud/grosor de espalda, deltoide posterior y bíceps',
    color: '#3b82f6',
    exercises: [
      {
        id: 'jalon-mag',
        swaps: SWAPS_JALON,
        name: 'Jalón al pecho (agarre MAG)',
        muscle: 'Espalda',
        equipment: 'Polea',
        sets: 4,
        repMin: 8,
        repMax: 12,
        restSec: 120,
        loadStep: 5,
        primary: true,
        secondary: { Bíceps: 0.5 },
        note: 'Foco en amplitud: codos abajo y afuera, siente el dorsal. Pecho arriba, sin balanceo. Se queda en 4 series fijas y el escalado de espalda se lo lleva el remo: con jalón y remo subiendo a la vez, la espalda pasaba de 11 a 12 series en una sola sesión, por encima del techo por sesión.',
      },
      {
        id: 'remo-maquina',
        swaps: SWAPS_REMO,
        name: 'Máquina de remo',
        muscle: 'Espalda',
        equipment: 'Máquina',
        sets: 3,
        maxSets: 4,
        repMin: 8,
        repMax: 12,
        restSec: 120,
        loadStep: 5,
        primary: true,
        secondary: { Bíceps: 0.5, 'Hombro posterior': 0.3 },
        note: 'Apoyo en pecho = cero estrés lumbar. Retrae escápula, grosor de espalda media.',
      },
      {
        id: 'pullover-maquina-d3',
        movementId: 'pullover-maquina',
        swaps: SWAPS_PULLOVER,
        name: 'Máquina de pull over',
        muscle: 'Espalda',
        equipment: 'Máquina',
        sets: 3,
        repMin: 12,
        repMax: 15,
        restSec: 75,
        loadStep: 2.5,
        note: 'Aísla el dorsal y trabaja la amplitud sin fatigar bíceps.',
      },
      // EL BÍCEPS SUBE A 4ª POSICIÓN, delante del posterior y de las laterales.
      // En el bloque 2 iba 6º y 7º de un día de 8, detrás de tres ejercicios de
      // espalda, el posterior y las laterales: llegabas fundido y con prisa.
      {
        id: 'curl-bicep-sentado',
        swaps: SWAPS_CURL_BICEPS,
        name: 'Curl de bíceps sentado en máquina',
        muscle: 'Bíceps',
        equipment: 'Máquina',
        sets: 4,
        maxSets: 5,
        repMin: 10,
        repMax: 14,
        restSec: 60,
        loadStep: 2.5,
        primary: true,
        note: 'Primera dosis de bíceps de la semana, en 4ª posición y con una serie más. Codo quieto y baja en 3 s. Aquí ya venías haciéndolo con el predicador: la app lo respeta y lleva su propio historial.',
      },
      {
        id: 'posterior-delt-pec',
        name: 'Deltoide posterior en pec-deck (invertido)',
        muscle: 'Hombro posterior',
        equipment: 'Máquina',
        sets: 4,
        maxSets: 5,
        repMin: 15,
        repMax: 18,
        restSec: 60,
        loadStep: 2.5,
        note: 'Salud de hombro y densidad posterior. Aprieta atrás sin encoger el cuello. Es aislamiento de baja fatiga: apura a RIR 0-1 en la última serie.',
      },
      {
        id: 'lateral-maquina-d3',
        movementId: 'lateral-maquina',
        swaps: SWAPS_LATERAL,
        name: 'Elevaciones laterales en máquina (de pie)',
        muscle: 'Hombro lateral',
        equipment: 'Máquina',
        sets: 3,
        repMin: 12,
        repMax: 16,
        restSec: 60,
        loadStep: 2.5,
        trimmable: true,
        note: 'Dosis 2ª de tres del deltoide lateral. Recortable: el lateral ya está cubierto martes y sábado, así que es lo primero que sobra si el tiempo aprieta.',
      },
    ],
  },

  // ---------------- DÍA 4 · PIERNA B (POSTERIOR + 2ª DOSIS CUÁDRICEPS) ----------------
  // El curl SENTADO es el principal de isquios de la semana: con la cadera
  // flexionada los isquios biarticulares trabajan a mayor longitud y eso
  // produjo más hipertrofia que el tumbado (Maeo et al. 2021: +14% vs +9%).
  {
    id: 'd4',
    name: 'Día 4 · Pierna B (Posterior)',
    focus: 'Isquios a máxima longitud, glúteo y 2ª dosis de cuádriceps',
    color: '#14b8a6',
    exercises: [
      {
        id: 'curl-femoral-sentado',
        name: 'Curl femoral sentado',
        muscle: 'Femoral',
        equipment: 'Máquina',
        sets: 5,
        maxSets: 7,
        repMin: 8,
        repMax: 12,
        restSec: 150,
        loadStep: 5,
        primary: true,
        emphasis: 'estirado',
        note: 'El ejercicio de isquios que más te va a hacer crecer, y por eso va primero y con más series que el tumbado. Sentado, con la cadera flexionada, los isquios parten ya estirados: en el estudio que comparó las dos máquinas el sentado ganó por bastante. Pega la espalda al respaldo, no dejes que la cadera se despegue y aguanta 3 s la vuelta.',
      },
      {
        id: 'hip-thrust',
        name: 'Hip thrust',
        muscle: 'Glúteo',
        equipment: 'Máquina',
        sets: 4,
        maxSets: 5,
        repMin: 8,
        repMax: 12,
        restSec: 120,
        loadStep: 5,
        primary: true,
        emphasis: 'acortado',
        secondary: { Femoral: 0.5 },
        note: 'Doble función: masa de glúteo y blindaje de la lumbar. Barbilla metida, costillas hacia abajo, empuje con talones y PARA cuando la cadera esté alineada: no hiperextiendas, que es justo lo que te irrita el lado derecho.',
      },
      {
        id: 'prensa-bilateral',
        name: 'Prensa a dos piernas (rango profundo)',
        muscle: 'Cuádriceps',
        equipment: 'Máquina',
        sets: 3,
        maxSets: 5,
        repMin: 10,
        repMax: 14,
        restSec: 120,
        loadStep: 5,
        emphasis: 'estirado',
        secondary: { Glúteo: 0.5, Aductores: 0.3 },
        note: '2ª dosis semanal de cuádriceps: esto es lo que faltaba en el programa anterior, donde el cuádriceps solo se entrenaba los lunes. Pies a media altura y baja lo más profundo que puedas manteniendo la lumbar pegada al respaldo. Aquí no buscamos el récord de discos, buscamos rango.',
      },
      {
        id: 'aductores-d4',
        name: 'Aductores en máquina',
        muscle: 'Aductores',
        equipment: 'Máquina',
        sets: 3,
        repMin: 12,
        repMax: 15,
        restSec: 60,
        loadStep: 5,
        note: 'Estabilidad de cadera: te protege el lado derecho y te ahorra tirones en el fútbol. El aductor mayor además aporta masa a la cara interna del muslo.',
      },
      {
        id: 'gemelos-sentado',
        name: 'Gemelos sentado (pantorrillas)',
        muscle: 'Gemelos',
        equipment: 'Máquina',
        sets: 3,
        maxSets: 4,
        repMin: 12,
        repMax: 16,
        restSec: 60,
        loadStep: 2.5,
        emphasis: 'estirado',
        note: 'Sentado = rodilla flexionada = sóleo, que es el que aguanta cuando corres. Complementa los gemelos de pie del lunes: entre los dos días tienes las pantorrillas cubiertas 2x/semana.',
      },
      {
        id: 'maquina-crunch',
        name: 'Máquina de crunch',
        muscle: 'Core',
        equipment: 'Máquina',
        sets: 3,
        maxSets: 4,
        repMin: 12,
        repMax: 16,
        restSec: 45,
        loadStep: 2.5,
        note: 'Flexiona la columna con control y exhala al subir. 2ª dosis de core de la semana.',
      },
    ],
  },

  // ---------------- DÍA 5 · HOMBRO + AMPLITUD + BRAZOS ----------------
  {
    id: 'd5',
    name: 'Día 5 · Brazos + Hombro',
    focus: 'Bíceps y tríceps en fresco, laterales y 2ª dosis de posterior y dorsal',
    color: '#8b5cf6',
    // ============================================================
    // ESTE DÍA SE HA DADO LA VUELTA
    // ------------------------------------------------------------
    // Se llamaba "Hombro + Brazos" y el brazo empezaba en la 5ª posición,
    // detrás de dos ejercicios de hombro y del pull over. Los números del
    // bloque 2 dicen el resto: es el día con peor adherencia junto con la
    // pierna B (80%, 7 sesiones de 9), y cuando se recortaba se recortaba por
    // el final, o sea el brazo.
    //
    // Ahora el brazo ocupa las cuatro primeras posiciones (16 series) y lo que
    // queda al final es todo trabajo con otra dosis en la semana: las laterales
    // son la 3ª de tres, el posterior la 2ª de dos y el pull over la 2ª de dos.
    // Si te quedas sin tiempo, pierdes redundancia en lugar de perder tu
    // prioridad. El orden del día ES la lista de prioridad de recorte.
    //
    // Han salido dos ejercicios para que esto quepa sin alargar el día:
    //  · PRESS MILITAR: el deltoides anterior se lleva 4,5 series fraccionadas
    //    de los tres press del martes y no es objetivo del bloque. Es lo
    //    primero que volvería a entrar si el hombro anterior se atasca.
    //  · CATANA: cuarto ejercicio de tríceps. La copa trabaja la misma cabeza
    //    larga en posición estirada y con más series.
    // ============================================================
    exercises: [
      {
        id: 'curl-predicador',
        swaps: SWAPS_CURL_BICEPS,
        name: 'Curl predicador',
        muscle: 'Bíceps',
        equipment: 'Máquina',
        sets: 4,
        maxSets: 5,
        repMin: 8,
        repMax: 12,
        restSec: 75,
        loadStep: 2.5,
        primary: true,
        note: 'Primer ejercicio del día, con el brazo entero por delante. Pico del bíceps con el brazo fijo, no rebotes abajo. Aquí llevabas 6 sesiones seguidas en 30 kg subiendo solo reps (8 → 12): la app no te dejaba subir porque esperaba el techo del rango. Ya está arreglado.',
      },
      {
        id: 'triceps-copa',
        swaps: SWAPS_COPA,
        name: 'Extensión de tríceps sobre la cabeza ("copa")',
        muscle: 'Tríceps',
        equipment: 'Mancuerna',
        sets: 4,
        maxSets: 5,
        repMin: 10,
        repMax: 14,
        restSec: 75,
        loadStep: 2,
        primary: true,
        emphasis: 'estirado',
        note: 'Estira la cabeza larga del tríceps, que es la que más masa aporta, y por eso es el ejercicio de tríceps que se queda y gana una serie. Codos apuntando al frente. Revisa el registro del 3 de septiembre: pusiste 30 reps y son casi seguro 13 mal tecleadas.',
      },
      {
        id: 'curl-bayesian',
        name: 'Curl bayesian (polea)',
        muscle: 'Bíceps',
        equipment: 'Polea',
        sets: 3,
        maxSets: 4,
        repMin: 10,
        repMax: 14,
        restSec: 60,
        loadStep: 1.25,
        emphasis: 'estirado',
        note: 'Brazo detrás del cuerpo = máximo estiramiento del bíceps, que es donde más crece. Complementa al predicador, que trabaja acortado: entre los dos cubres el bíceps en las dos longitudes.',
      },
      {
        id: 'antebrazo-polea-d5',
        movementId: 'antebrazo-polea',
        swaps: SWAPS_ANTEBRAZO,
        name: 'Curl de antebrazo en polea',
        muscle: 'Antebrazo',
        equipment: 'Polea',
        sets: 4,
        repMin: 12,
        repMax: 15,
        restSec: 45,
        loadStep: 1.25,
        note: 'Dosis 2/2 de la semana, con una serie más y en 4ª posición en lugar de la última. El antebrazo era el músculo con peor adherencia del programa junto con el femoral: no porque faltara en el plan, sino porque iba siempre al final y se caía.',
      },
      {
        id: 'lateral-maquina-d5',
        movementId: 'lateral-maquina',
        swaps: SWAPS_LATERAL,
        name: 'Elevaciones laterales en máquina (de pie)',
        muscle: 'Hombro lateral',
        equipment: 'Máquina',
        sets: 3,
        repMin: 12,
        repMax: 16,
        restSec: 60,
        loadStep: 2.5,
        trimmable: true,
        note: 'Tercera dosis semanal de laterales. En aislamiento como este puedes apretar más que en los básicos: llega a RIR 0-1 en la última serie sin miedo. Recortable: el hombro es lo que mejor te responde y ya lo trabajas martes y jueves.',
      },
      {
        id: 'posterior-delt-pec-d5',
        movementId: 'posterior-delt-pec',
        name: 'Deltoide posterior en pec-deck (invertido)',
        optionLabel: 'Opción A',
        muscle: 'Hombro posterior',
        equipment: 'Máquina',
        sets: 3,
        repMin: 15,
        repMax: 18,
        restSec: 60,
        loadStep: 2.5,
        note: '2ª dosis semanal de deltoides posterior. Es la misma máquina del jueves a propósito: estable, ya la dominas, y la app lleva un único historial de cargas entre los dos días. Aprieta atrás sin encoger el cuello y apura a RIR 0-1: es aislamiento de baja fatiga.',
      },
      {
        id: 'posterior-polea-d5',
        alternativeOf: 'posterior-delt-pec-d5',
        optionLabel: 'Opción B',
        name: 'Pájaros en polea (cruce inverso)',
        muscle: 'Hombro posterior',
        equipment: 'Polea',
        sets: 3,
        repMin: 15,
        repMax: 18,
        restSec: 60,
        loadStep: 1.25,
        emphasis: 'estirado',
        note: 'Alternativa a la máquina si está ocupada o te apetece variar. Poleas cruzadas a la altura de los hombros, coges el asa del lado contrario y abres. La polea mantiene tensión también en la parte estirada, que la máquina pierde. Elige una de las dos, no las dos.',
      },
      {
        id: 'pullover-maquina-d5',
        movementId: 'pullover-maquina',
        swaps: SWAPS_PULLOVER,
        name: 'Máquina de pull over (2ª dosis amplitud)',
        muscle: 'Espalda',
        equipment: 'Máquina',
        sets: 3,
        repMin: 12,
        repMax: 15,
        restSec: 75,
        loadStep: 2.5,
        trimmable: true,
        note: 'Segunda dosis de dorsal de la semana, para que la espalda no se quede a 1x. Recortable: si el día se alarga, esto es lo que sobra. La espalda tiene tres ejercicios el jueves.',
      },
    ],
  },
]

/** Variantes catalogadas de un ejercicio (además de la libre, siempre disponible) */
export function swapsFor(exerciseId: string): ExerciseSwap[] {
  return findExercise(exerciseId)?.swaps ?? []
}

export function findExercise(exerciseId: string) {
  for (const day of WORKOUT_DAYS) {
    const ex = day.exercises.find((e) => e.id === exerciseId)
    if (ex) return ex
  }
  return undefined
}

export function findDay(dayId: string) {
  return WORKOUT_DAYS.find((d) => d.id === dayId)
}

/** Todos los ejercicios del programa, sin filtrar */
export function allExercises(): ExerciseTemplate[] {
  return WORKOUT_DAYS.flatMap((d) => d.exercises)
}

/**
 * El movimiento al que pertenece un ejercicio. Es lo que permite que las
 * elevaciones laterales de martes, jueves y sábado progresen como UNA sola
 * cosa en lugar de llevar tres historiales independientes.
 */
export function movementIdOf(exerciseId: string): string {
  return findExercise(exerciseId)?.movementId ?? exerciseId
}

/** Todos los ids de ejercicio que comparten movimiento (para leer historial) */
export function exerciseIdsForMovement(movementId: string): string[] {
  const ids = allExercises()
    .filter((e) => (e.movementId ?? e.id) === movementId)
    .map((e) => e.id)
  return ids.length > 0 ? ids : [movementId]
}

/**
 * Ejercicios que cuentan para el volumen planificado: se excluyen las
 * alternativas (péndulo/hack) porque solo se hace una de las dos y si no
 * las descontáramos el cuádriceps aparecería con el doble de series.
 */
export function countedExercises(): ExerciseTemplate[] {
  return allExercises().filter((e) => !e.alternativeOf)
}

/** Pares de alternativas de un día: [principal, alternativa] */
export function alternativeFor(exerciseId: string): ExerciseTemplate | undefined {
  return allExercises().find((e) => e.alternativeOf === exerciseId)
}
