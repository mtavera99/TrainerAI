import type {
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
//   Espalda 2x · Deltoide lateral 3x · Antebrazo 3x · Core 2x
//   Pecho 1x y hombro/brazos 1x → POR DECISIÓN DE SANTIAGO: dice que el
//   entreno de pecho le gustó y que hombro/brazos los siente perfectos,
//   así que el tren superior NO se toca en este bloque. Está documentado
//   como 1x a propósito, no por error.
//
// DECISIONES DE PIERNA Y POR QUÉ (evidencia, no intuición):
//  · Cada músculo de pierna pasa de 1x a 2x/semana. Antes había 2 SESIONES
//    de pierna pero cada músculo se entrenaba una sola vez (cuádriceps lunes,
//    isquios miércoles). Repartir el mismo volumen en 2 sesiones permite
//    subir series totales sin que la sesión se haga interminable.
//  · El volumen ESCALA dentro del bloque (campo `maxSets`): desde la semana 4
//    se añade una serie a DOS ejercicios de cada día de pierna, no a todos, para
//    que la sesión no se vaya de las manos. Cada día de pierna se queda en
//    19 series (semanas 1-3) y 21 series (semanas 4-10), unos 70-85 min.
//    Antes las series eran fijas las 10 semanas y solo bajaba el RIR.
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
//    recuperaban. Ahora las salidas van en días de tren superior (martes y
//    sábado) y el domingo se descansa antes del lunes de pierna.
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
    activity: 'Empuje · Pecho/Hombro/Tríceps + running',
    workoutId: 'd2',
    kind: 'fuerza',
    note: 'La salida de running va aquí, en día de tren superior: no compite con las piernas.',
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
    activity: 'Espalda + Bíceps',
    workoutId: 'd3',
    kind: 'fuerza',
    note: 'Sin correr: las piernas descansan la víspera del fútbol.',
  },
  {
    day: 'Viernes',
    activity: 'Fútbol ⚽',
    kind: 'futbol',
    note: 'Hace de sesión de alta intensidad de la semana (sprints repetidos).',
  },
  {
    day: 'Sábado',
    activity: 'Hombro + Brazos + running largo',
    workoutId: 'd5',
    kind: 'fuerza',
    note: 'La tirada que construye los 5 km, otra vez en día de tren superior.',
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
        note: 'Alternativa al péndulo si ese día la máquina está ocupada o notas el glúteo derecho. Pies algo altos y torso pegado al respaldo. Registra solo UNA de las dos opciones: la app lleva el historial de cada máquina por separado porque los kilos no son comparables entre ellas.',
      },
      {
        id: 'prensa-unilateral',
        name: 'Prensa unilateral',
        muscle: 'Cuádriceps',
        equipment: 'Máquina',
        sets: 3,
        repMin: 10,
        repMax: 15,
        restSec: 120,
        loadStep: 5,
        unilateral: true,
        emphasis: 'estirado',
        note: 'Unilateral a propósito: corrige la asimetría que arrastras del lado derecho y carga la pierna sin comprimir la columna. Acerca la rodilla al pecho todo lo que te permita la cadera derecha sin dolor; si molesta, recorta el rango antes que el peso.',
      },
      {
        id: 'extensiones',
        name: 'Extensiones de cuádriceps',
        muscle: 'Cuádriceps',
        equipment: 'Máquina',
        sets: 3,
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
        repMax: 15,
        restSec: 90,
        loadStep: 5,
        emphasis: 'medio',
        note: '1ª dosis semanal de isquios (la principal es el curl sentado de Pierna B). Con la cadera extendida trabajas más la cabeza corta del bíceps femoral, que el curl sentado deja algo de lado. Excéntrica de 3 s.',
      },
      {
        id: 'gemelos-pie',
        name: 'Gemelos de pie (pantorrillas)',
        muscle: 'Gemelos',
        equipment: 'Máquina',
        sets: 4,
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
        sets: 2,
        repMin: 8,
        repMax: 15,
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
        note: 'Estable, como te gusta. Retrae escápulas y baja controlando.',
      },
      {
        id: 'press-inclinado-smith',
        name: 'Press inclinado en Smith',
        muscle: 'Pecho',
        equipment: 'Smith',
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSec: 120,
        loadStep: 2.5,
        primary: true,
        note: 'Banco a ~30° para pecho superior (tu prioridad). Estira abajo, no choques arriba.',
      },
      {
        id: 'aperturas-maquina-inclinada',
        name: 'Aperturas en máquina inclinada',
        muscle: 'Pecho',
        equipment: 'Máquina',
        sets: 3,
        repMin: 12,
        repMax: 15,
        restSec: 75,
        loadStep: 2.5,
        note: 'Estiramiento máximo del pectoral. Aprieta 1s en el centro.',
      },
      {
        id: 'cruce-cables',
        name: 'Cruce de cables (de abajo hacia arriba)',
        muscle: 'Pecho',
        equipment: 'Polea',
        sets: 3,
        repMin: 12,
        repMax: 20,
        restSec: 60,
        loadStep: 1.25,
        note: 'Poleas bajas cruzando hacia arriba para enfatizar fibras claviculares.',
      },
      {
        id: 'lateral-maquina-d2',
        movementId: 'lateral-maquina',
        name: 'Elevaciones laterales en máquina (de pie)',
        muscle: 'Hombro lateral',
        equipment: 'Máquina',
        sets: 4,
        repMin: 12,
        repMax: 20,
        restSec: 60,
        loadStep: 2.5,
        primary: true,
        note: 'Punto débil prioritario. Sin impulso, lidera con el codo, tensión constante.',
      },
      {
        id: 'triceps-45-cbum',
        name: 'Extensión de tríceps 45° (polea, estilo CBUM)',
        muscle: 'Tríceps',
        equipment: 'Polea',
        sets: 3,
        repMin: 10,
        repMax: 15,
        restSec: 75,
        loadStep: 2.5,
        note: 'Inclinado hacia delante para estirar la cabeza larga. Estira bien arriba.',
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
        note: 'Tríceps en patrón compuesto. Codos cerca del cuerpo.',
      },
      {
        id: 'antebrazo-polea-d2',
        movementId: 'antebrazo-polea',
        name: 'Curl de antebrazo en polea',
        muscle: 'Antebrazo',
        equipment: 'Polea',
        sets: 3,
        repMin: 12,
        repMax: 20,
        restSec: 45,
        loadStep: 1.25,
        note: 'Dosis 1/3 de la semana. Rango completo de muñeca, sin prisa.',
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
        name: 'Jalón al pecho (agarre MAG)',
        muscle: 'Espalda',
        equipment: 'Polea',
        sets: 4,
        repMin: 8,
        repMax: 12,
        restSec: 120,
        loadStep: 5,
        primary: true,
        note: 'Foco en amplitud: codos abajo y afuera, siente el dorsal. Pecho arriba, sin balanceo.',
      },
      {
        id: 'remo-maquina',
        name: 'Máquina de remo',
        muscle: 'Espalda',
        equipment: 'Máquina',
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSec: 120,
        loadStep: 5,
        primary: true,
        note: 'Apoyo en pecho = cero estrés lumbar. Retrae escápula, grosor de espalda media.',
      },
      {
        id: 'pullover-maquina-d3',
        movementId: 'pullover-maquina',
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
      {
        id: 'posterior-delt-pec',
        name: 'Deltoide posterior en pec-deck (invertido)',
        muscle: 'Hombro posterior',
        equipment: 'Máquina',
        sets: 4,
        repMin: 15,
        repMax: 20,
        restSec: 60,
        loadStep: 2.5,
        note: 'Salud de hombro y densidad posterior. Aprieta atrás sin encoger el cuello.',
      },
      {
        id: 'lateral-maquina-d3',
        movementId: 'lateral-maquina',
        name: 'Elevaciones laterales en máquina (de pie)',
        muscle: 'Hombro lateral',
        equipment: 'Máquina',
        sets: 3,
        repMin: 12,
        repMax: 20,
        restSec: 60,
        loadStep: 2.5,
        primary: true,
        note: 'Dosis intermedia de la semana. Con esto trabajas el lateral 3x (mar/jue/sáb): alta frecuencia = hombros más anchos, tu prioridad.',
      },
      {
        id: 'curl-bicep-sentado',
        name: 'Curl de bíceps sentado en máquina',
        muscle: 'Bíceps',
        equipment: 'Máquina',
        sets: 3,
        repMin: 10,
        repMax: 15,
        restSec: 60,
        loadStep: 2.5,
      },
      {
        id: 'curl-bayesian',
        name: 'Curl bayesian (polea)',
        muscle: 'Bíceps',
        equipment: 'Polea',
        sets: 3,
        repMin: 10,
        repMax: 15,
        restSec: 60,
        loadStep: 1.25,
        note: 'Brazo detrás del cuerpo = máximo estiramiento del bíceps.',
      },
      {
        id: 'antebrazo-polea-d3',
        movementId: 'antebrazo-polea',
        name: 'Curl de antebrazo en polea',
        muscle: 'Antebrazo',
        equipment: 'Polea',
        sets: 3,
        repMin: 12,
        repMax: 20,
        restSec: 45,
        loadStep: 1.25,
        note: 'Dosis 2/3 de la semana.',
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
        maxSets: 6,
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
        repMin: 8,
        repMax: 12,
        restSec: 120,
        loadStep: 5,
        primary: true,
        emphasis: 'acortado',
        note: 'Doble función: masa de glúteo y blindaje de la lumbar. Barbilla metida, costillas hacia abajo, empuje con talones y PARA cuando la cadera esté alineada: no hiperextiendas, que es justo lo que te irrita el lado derecho.',
      },
      {
        id: 'prensa-bilateral',
        name: 'Prensa a dos piernas (rango profundo)',
        muscle: 'Cuádriceps',
        equipment: 'Máquina',
        sets: 3,
        maxSets: 4,
        repMin: 10,
        repMax: 15,
        restSec: 120,
        loadStep: 5,
        emphasis: 'estirado',
        note: '2ª dosis semanal de cuádriceps: esto es lo que faltaba en el programa anterior, donde el cuádriceps solo se entrenaba los lunes. Pies a media altura y baja lo más profundo que puedas manteniendo la lumbar pegada al respaldo. Aquí no buscamos el récord de discos, buscamos rango.',
      },
      {
        id: 'aductores-d4',
        name: 'Aductores en máquina',
        muscle: 'Aductores',
        equipment: 'Máquina',
        sets: 2,
        repMin: 12,
        repMax: 20,
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
        repMin: 12,
        repMax: 20,
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
        sets: 2,
        repMin: 12,
        repMax: 20,
        restSec: 45,
        loadStep: 2.5,
        note: 'Flexiona la columna con control y exhala al subir. 2ª dosis de core de la semana.',
      },
    ],
  },

  // ---------------- DÍA 5 · HOMBRO + AMPLITUD + BRAZOS ----------------
  {
    id: 'd5',
    name: 'Día 5 · Hombro + Brazos',
    focus: 'Hombro, 2ª dosis de amplitud de espalda y brazos',
    color: '#8b5cf6',
    exercises: [
      {
        id: 'press-militar-smith',
        name: 'Press militar en Smith (barra)',
        muscle: 'Hombro',
        equipment: 'Smith',
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSec: 120,
        loadStep: 2.5,
        primary: true,
        note: 'Estable, como te gusta. Baja a la clavícula sin forzar el hombro.',
      },
      {
        id: 'lateral-maquina-d5',
        movementId: 'lateral-maquina',
        name: 'Elevaciones laterales en máquina (de pie)',
        muscle: 'Hombro lateral',
        equipment: 'Máquina',
        sets: 4,
        repMin: 12,
        repMax: 20,
        restSec: 60,
        loadStep: 2.5,
        primary: true,
        note: 'Tercera dosis semanal de laterales. Alta frecuencia = hombros más anchos.',
      },
      {
        id: 'pullover-maquina-d5',
        movementId: 'pullover-maquina',
        name: 'Máquina de pull over (2ª dosis amplitud)',
        muscle: 'Espalda',
        equipment: 'Máquina',
        sets: 3,
        repMin: 12,
        repMax: 15,
        restSec: 75,
        loadStep: 2.5,
        note: 'Segunda dosis de dorsal en la semana para forzar la amplitud.',
      },
      {
        id: 'curl-predicador',
        name: 'Curl predicador',
        muscle: 'Bíceps',
        equipment: 'Máquina',
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSec: 75,
        loadStep: 2.5,
        note: 'Pico del bíceps con el brazo fijo. No rebotes abajo.',
      },
      {
        id: 'triceps-copa',
        name: 'Extensión de tríceps sobre la cabeza ("copa")',
        muscle: 'Tríceps',
        equipment: 'Mancuerna',
        sets: 3,
        repMin: 10,
        repMax: 15,
        restSec: 75,
        loadStep: 2,
        note: 'Estira la cabeza larga del tríceps. Codos apuntando al frente.',
      },
      {
        id: 'triceps-catana',
        name: 'Extensiones catana (polea)',
        muscle: 'Tríceps',
        equipment: 'Polea',
        sets: 3,
        repMin: 12,
        repMax: 15,
        restSec: 60,
        loadStep: 1.25,
        note: 'Cuerda por detrás de la nuca, énfasis en estiramiento.',
      },
      {
        id: 'antebrazo-polea-d5',
        movementId: 'antebrazo-polea',
        name: 'Curl de antebrazo en polea',
        muscle: 'Antebrazo',
        equipment: 'Polea',
        sets: 3,
        repMin: 12,
        repMax: 20,
        restSec: 45,
        loadStep: 1.25,
        note: 'Dosis 3/3 de la semana. Trabajamos el antebrazo por ser punto débil.',
      },
    ],
  },
]

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
