# Entreno · Santiago Tavera

App web personal (privada, sin cuentas) para llevar el registro de tus entrenamientos de
fuerza y running, con un programa hecho a tu medida y un **generador semanal automático**
basado en sobrecarga progresiva.

Tus datos se guardan **solo en tu navegador** (localStorage). Puedes exportar un respaldo
JSON desde la pestaña *Perfil*.

## Cómo ejecutarla

```bash
npm install
npm run dev      # desarrollo (http://localhost:5173)
npm run build    # compilar para producción
npm run preview  # previsualizar el build
```

## Qué hace

- **Inicio**: resumen de la semana, fase de periodización, objetivos y accesos rápidos.
- **Entreno**: los 5 días de fuerza. Al abrir cada día ves el **peso y las reps sugeridas**
  para la semana (calculadas a partir de lo que registraste antes) y registras cada serie
  (kg, reps, RIR) marcándolas como hechas. Si hiciste otra versión de un ejercicio, puedes
  **cambiarlo** y queda registrado el que hiciste de verdad.
- **Progreso**: gráficas de peso corporal, volumen semanal y fuerza por ejercicio (1RM
  estimado), más el historial de sesiones.
- **Running**: plan progresivo de 10 semanas hacia 5 km continuos, recordatorios de técnica
  y registro de tus salidas con gráfica de distancia.
- **Perfil**: tus datos, registro de peso y copia de seguridad (exportar/importar/reiniciar).

## El programa (Bloque 2 · 10 semanas)

Diseñado con **tus máquinas reales** y prioridades: **pierna (prioridad nº1)** sin cargar la
lumbar → espalda → hombros → mantener pecho → integrar running. Juegas **fútbol los viernes**.

| Día | Enfoque | Series |
|-----|---------|--------|
| Lunes | **Pierna A** · péndulo *o* hack, prensa unilateral, extensiones, curl femoral tumbado, gemelos de pie, colgado | 20 → 26 |
| Martes | Empuje · press ancho, inclinado Smith, aperturas, cruce, laterales, tríceps ×2, antebrazo | 24 |
| Miércoles | **Pierna B** · curl femoral sentado, hip thrust, prensa profunda, aductores, gemelos sentado, crunch | 21 → 27 |
| Jueves | Espalda + Bíceps · jalón MAG, remo máquina, pull over, deltoide posterior, laterales, curl sentado, bayesian, antebrazo | 26 |
| Viernes | Fútbol ⚽ | — |
| Sábado | Hombro + Brazos · press militar Smith, laterales, deltoide posterior, pull over, predicador, copa, catana, antebrazo | 24 |
| Domingo | Descanso total | — |

### Qué día se corre

| Día | Salida | Obligatoria |
|---|---|---|
| **Martes** (empuje) | Salida principal de mitad de semana | Sí |
| **Jueves** (espalda) | Muy suave, regenerativa | **No, opcional** |
| **Sábado** (hombro) | La tirada larga, la que construye los 5 km | Sí |

Cada salida lleva su día asignado en `src/data/running.ts` y se muestra en la pestaña *Running*,
así que el plan y el calendario no pueden contradecirse.

Las tres caen en **días de tren superior** y ninguna el mismo día que Pierna A o Pierna B:
correr es la modalidad de cardio que más interfiere con la hipertrofia de pierna. El domingo se
descansa del todo para llegar fresco al lunes.

**Toda la intensidad va el sábado**, que es el único día con 48 h sin pierna detrás. El martes,
en cambio, es la víspera de Pierna B: con 5 días de pesas y el fútbol del viernes no existe un
hueco sin ningún compromiso, así que el martes es **siempre trote conversacional, nunca series
ni ritmo 5K**. Un rodaje suave 24 h antes apenas afecta a la fuerza; una sesión de calidad sí.

La del **jueves es opcional y siempre suave** porque el viernes juegas al fútbol: **el fútbol ya
es tu sesión de alta intensidad** y de sprints repetidos de la semana. Si dudas, sáltatela.

### Frecuencia y volumen reales

No están escritos a mano en ningún sitio: los calcula `src/lib/volume.ts` a partir de los
ejercicios del programa y se muestran en la pestaña *Inicio*. Si algún día se toca un
entrenamiento y un músculo se queda corto, se ve al instante.

| Músculo | Frecuencia | Series (S1-3 → S4-6 → S7-9) |
|---|---|---|
| Cuádriceps ⭐ | 2x | 13 → 17 → 19 |
| Femoral ⭐ | 2x | 8 → 10 → 11 |
| Glúteo ⭐ | 1x (+ fútbol) | 4 → 5 |
| Gemelos | 2x | 7 → 9 |
| Espalda ⭐ | 2x | 13 |
| Deltoide lateral ⭐ | 3x | 11 |
| Antebrazo ⭐ | 3x | 9 |
| Tríceps | 2x | 11 |
| Bíceps | 2x | 9 |
| Core | 2x | 6 |
| Aductores | 1x | 3 |
| Pecho | 1x | 11 |
| Hombro anterior / posterior | 2x / 2x | 3 / 7 |

### Cómo se cuenta el volumen

Las cifras de arriba son **series directas**. La app compara el volumen
**efectivo** = directas + 0,5 × indirectas, que es el método de conteo
fraccionado validado en la literatura: un press de pecho sí estimula el
deltoides anterior y el tríceps, pero no como un ejercicio dedicado.

Dos referencias, no una:

- **Semanal y por músculo:** 10-20 series efectivas en los prioritarios,
  8-16 en los de mantenimiento. Los rangos son **por músculo, nunca por
  región**: sumar las tres cabezas del hombro y compararlo con "10-20" es
  el error que hace parecer excesivo un programa correcto.
- **Por sesión:** más de ~11 series fraccionadas del mismo músculo en un
  solo entreno deja de aportar. La app lo avisa cuando pasa.

Pecho, hombro y brazos se quedan **1x a propósito**: el entreno de pecho te gusta y hombro y
brazos los sientes bien, así que en este bloque solo se rediseñó la pierna. Está documentado
como decisión, no como descuido.

**Periodización**: el RIR baja *y* el volumen sube. Acumulación (S1-3, RIR 3) →
Intensificación (S4-6, RIR 2) → Pico (S7-9, RIR 1) → Descarga (S10, RIR 4, ~40% menos series).

### El volumen extra es autorregulado

La pierna escala fuerte (el cuádriceps pasa de 13 a 19 series semanales), pero **las series
extra solo se aplican si el ejercicio sigue progresando**. Si un movimiento lleva 2 sesiones
estancado, el escalado se retiene un escalón y la app te lo dice: añadir trabajo encima de un
ejercicio que no avanza no produce más músculo, produce más fatiga. Tener tiempo de sobra en el
gimnasio no significa que el músculo pueda recuperar volumen infinito, y menos con fútbol el
viernes. Así el techo de volumen lo marcan tus datos y no un número elegido a dedo.

### Cómo decide la app tu carga de la semana

No es "suma 2,5 kg y reza". Registras kg, reps y RIR; a partir de ahí estima tu fuerza real en
ese movimiento (1RM estimado con la fórmula de Epley **corregido por el RIR** que anotaste) y
despeja qué carga necesitas para cumplir el objetivo de la semana siguiente. Cinco escenarios:

| Situación | Qué hace |
|---|---|
| Primera vez | Te pide calibrar, o parte de lo que moviste en otro día del mismo movimiento |
| Tocaste el techo del rango y ninguna serie se cayó | **Sube el peso** al que te deja en el mínimo de reps con el RIR de la fase |
| Aún no has tocado el techo | **Mantén el peso** y suma 1 rep en tu mejor serie |
| Alguna serie por debajo del mínimo del rango | **Mantén el peso** e iguala las series flojas (o alarga el descanso). No baja la carga |
| Anotaste RIR muy alto | **Sube la carga** aunque no hayas llegado al tope: se te quedó corta |
| 2 sesiones del mismo día sin mejorar | **Baja un 7%** y reconstruye, con aviso de estancamiento |
| Semana de descarga | 90% de tu peso top y ~40% menos series |

### Por qué la referencia es de ese día y no del movimiento entero

Al principio había **un solo historial por movimiento**: las laterales de martes, jueves y
sábado compartían todo. La idea era buena, pero producía dos fallos que se veían en la app:

- La carga sugerida salía de la **última sesión cronológica**, sin mirar de qué día era. Las
  laterales del jueves van en 5º lugar y las del sábado casi al principio: los kilos no son los
  mismos. Así que el martes se prescribía el peso del sábado y viceversa, y la app mandaba
  **bajar el peso en días donde sí se estaba progresando**.
- El estancamiento comparaba el 1RM estimado de días distintos. El día con más fatiga
  acumulada nunca superaba el récord del día fresco, así que **cada semana contaba como una
  sesión sin mejorar**. Con tres dosis semanales el contador llegaba a 2 siempre y el motor
  aplicaba un recorte del 7% sobre un ejercicio que iba bien: un bucle de bajada disfrazado de
  estancamiento.

Ahora se separa el ámbito: la **carga y el estancamiento** se juzgan sobre el historial del
**hueco** (mismo ejercicio, mismo día, misma variante), que es la única comparación entre
iguales que existe; la **fuerza del movimiento** sigue viéndose entera en las gráficas, pero no
decide kilos.

### Cuándo sube la carga (y por qué no antes)

La regla mira dos series distintas de la última sesión:

- la **mejor** dice si la carga ya te queda corta,
- la **peor** dice si aguantas todas las series.

Sube el peso cuando has tocado el techo del rango en tu mejor serie **y** ninguna serie ha
caído por debajo del mínimo. Antes se exigía que **la peor** llegara al techo, y con 4 series y
un rango de 12-20 reps eso no ocurre nunca: la última siempre cae por fatiga. El resultado era
un ejercicio condenado a *"mantén el peso y suma 1 rep"* para siempre, con un objetivo por
debajo de lo que ya habías hecho en la primera serie. Que las últimas series bajen es normal y
esperado; lo que importa es que se queden dentro del rango.

Otros detalles:

- Topes de seguridad: nunca sugiere subir más de un 12% ni bajar más de un 8% de una semana
  a otra, para que un error de tecleo no te descuadre el bloque.
- Un **mal día aislado** ya no baja la carga. Antes bastaba una sesión peor que la anterior;
  ahora hace falta que se repita dos veces en el mismo día de la semana.
- En péndulo/hack lleva el historial de cada máquina por separado, porque los kilos no son
  comparables entre ellas.

## Cambiar un ejercicio por otro

El programa nombra máquinas concretas, y la realidad no siempre las ofrece: la máquina está
ocupada, o simplemente hay una versión que se siente mejor. En cada ejercicio hay un botón
**"¿Hoy hiciste otro ejercicio? Cámbialo"** con las variantes aceptadas y un campo libre para
escribir cualquier otra.

Lo que pasa al sustituir:

- **Queda registrado el que hiciste de verdad**, con su nombre, en la sesión y en el historial.
- **Cada variante progresa con sus propios kilos** y su propio escalón de carga: 20 kg de barra
  recta no son 20 kg de polea, y meterlos en el mismo historial hacía que la app sugiriera
  pesos imposibles. También tienen su propia línea en la gráfica de fuerza.
- **El volumen del músculo no cambia**: son las mismas series del mismo músculo, así que la
  auditoría semanal cuenta igual.
- **Se queda elegida para la próxima vez**. Si el antebrazo lo haces casi siempre con barra
  recta, la app te la ofrece ya puesta en lugar de volver a la polea cada semana.
- Si ya habías apuntado series y cambias, **no se pierde nada**: se conservan y solo se
  reetiqueta el ejercicio.

### Ritmo de ganancia

La pestaña *Inicio* calcula la **tendencia** de tu peso (regresión lineal de las últimas 4
semanas, no la pesada de hoy) y la compara con la banda objetivo de **+0,2 a +0,5% del peso
corporal por semana**. Si llevas semanas plano te lo dice y te sugiere cuántas calorías añadir,
con tu objetivo estimado de kcal y proteína. Un programa de hipertrofia sin superávit es un
programa de mantenimiento con más agujetas.

## Stack

React + TypeScript + Vite + Tailwind CSS + Recharts. Sin backend.
