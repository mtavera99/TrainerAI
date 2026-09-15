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

Diseñado con **tus máquinas reales**. Prioridades del bloque 3, corregidas con lo
que reportaste al cerrar el bloque 2:

1. **Brazo** (bíceps, tríceps, antebrazo) — el grupo que quedó apagado
2. **Cuádriceps** sin cargar la lumbar — la pierna está en su punto, no se toca
3. **Espalda**
4. Hombro: responde bien, se mantiene
5. Pecho: mantenimiento
6. Femoral: **ya no es prioridad**. Se colgó de la etiqueta "pierna = prioridad
   nº1" y acabó con 8-11 series semanales y la peor adherencia del programa
   (64%). No se le recorta nada, solo deja de reclamar volumen extra.

Juegas **fútbol los viernes**.

| Día | Enfoque | Series |
|-----|---------|--------|
| Lunes | **Pierna A** · péndulo *o* hack, prensa unilateral, extensiones, curl femoral tumbado, gemelos de pie, colgado | 20 → 26 |
| Martes | Empuje · press ancho, inclinado Smith, **tríceps ×2, antebrazo**, aperturas, laterales | 22 → 24 |
| Miércoles | **Pierna B** · curl femoral sentado, hip thrust, prensa profunda, aductores, gemelos sentado, crunch | 21 → 28 |
| Jueves | Espalda + Bíceps · jalón MAG, remo máquina, pull over, **curl bíceps**, deltoide posterior, laterales | 21 → 24 |
| Viernes | Fútbol ⚽ | — |
| Sábado | **Brazos** + Hombro · predicador, copa, bayesian, antebrazo, laterales, posterior, pull over | 24 → 27 |
| Domingo | Descanso total | — |

### El orden del día es la lista de prioridad de recorte

Quedarse sin tiempo un día suelto pasa cuando tienes trabajo. Eso no se arregla
recortando el programa —el volumen total sigue siendo el mismo, 117 series
semanales frente a las 115 del bloque anterior— sino decidiendo **de antemano
qué sobra** cuando la sesión se corta.

Antes la app no opinaba, así que lo que se caía era siempre lo último de la
lista. Y lo último eran los brazos: en el día de empuje, press cerrado y
antebrazo; en el día llamado *Hombro + Brazos*, el bíceps empezaba en 5ª
posición. No fue mala suerte, fue estructura.

Ahora el orden de cada día **es** su orden de importancia, y todo lo que tiene
otra dosis en la semana va marcado como `recortable`. En la pantalla del entreno
hay un botón **"¿Hoy tienes poco tiempo?"** que los pliega y te deja la lista
corta: en el día de empuje, 5 ejercicios y 16 series en lugar de 8 y 25.

| Día | Completo | Con prisa |
|---|---|---|
| Lunes · Pierna A | 6 ej · 20 series | 5 ej · 17 |
| Martes · Empuje | 8 ej · 25 series | 5 ej · 16 |
| Miércoles · Pierna B | 6 ej · 21 series | 5 ej · 18 |
| Jueves · Espalda + Bíceps | 7 ej · 24 series | 5 ej · 18 |
| Sábado · Brazos + Hombro | 8 ej · 27 series | 6 ej · 21 |

En los cinco casos el brazo entra completo en la lista corta.

### Compensar las series que faltaron: qué dice la evidencia

La app calcula esto sola en *Inicio* (tarjeta **Series que faltaron**), y la
respuesta no es intuitiva:

- **La dosis que construye músculo es la semanal**, y la relación
  dosis-respuesta es una curva suave con rendimientos decrecientes, no un
  acantilado. Perder 3 de 14 series semanales de bíceps una semana está dentro
  del ruido.
- **La frecuencia es casi neutra** cuando el volumen semanal se iguala. Esto es
  lo que hace que compensar funcione: da casi igual *qué día* caigan esas
  series, siempre que sea en la misma semana.
- **Pero el volumen por sesión sí tiene techo** (~11 series fraccionadas del
  mismo músculo). Y aquí está la clave: apilar lo que faltó encima de la
  siguiente sesión de *ese mismo músculo* mete casi todas esas series por encima
  del techo, donde ya no aportan. Es fatiga que no compra nada.

**La regla:** compensa **moviendo** a otro día de la misma semana que ya
entrene ese músculo y tenga sitio. Nunca duplicando la dosis en una sesión que
ya trae la suya. Y si no queda ningún día, déjalo ir.

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

| Músculo | Frecuencia | Series directas (S1-3 → S7-9) |
|---|---|---|
| Bíceps ⭐ | 2x | 11 → 14 |
| Tríceps ⭐ | 2x | 10 → 12 |
| Antebrazo ⭐ | 2x | 7 → 8 |
| Cuádriceps ⭐ | 2x | 13 → 18 |
| Espalda ⭐ | 2x | 13 → 14 |
| Femoral | 2x | 8 → 11 |
| Glúteo | 1x (+ fútbol) | 4 → 5 |
| Gemelos | 2x | 7 → 9 |
| Deltoide lateral | 3x | 10 |
| Hombro posterior | 2x | 7 → 8 |
| Core | 2x | 6 → 8 |
| Pecho | 1x | 9 |
| Aductores | 1x | 3 |
| Hombro anterior | — | 0 directas (4,5 efectivas de los press) |

En el bloque 2, **solo la pierna escalaba**: sumaba 14 series en 10 semanas
mientras el brazo, la espalda, el posterior y el core se quedaban exactamente
igual de la primera a la última semana. Ahora escalan todos los grupos con
margen, y los 14 músculos caen dentro de su rango en las cuatro fases.

El antebrazo pasa de 3x a **2x con más series por sesión**: tres dosis de 3
series repartidas en tres días era mucho tiempo de cambio de máquina para un
músculo pequeño, y la tercera se caía siempre. Dos dosis de 3-4 series que sí se
hacen valen más que tres planificadas de las que llegan dos.

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

### Cuándo sube la carga: cuatro puertas, no una

La regla mira dos series distintas de la última sesión: la **mejor** dice si la
carga ya te queda corta, la **peor** dice si aguantas todas las series. Que las
últimas series bajen es normal; lo que importa es que se queden dentro del rango.

Sube el peso si se cumple **cualquiera** de estas cuatro:

| Puerta | Cuándo |
|---|---|
| **Techo del rango** | Tu mejor serie llegó a `repMax` y ninguna bajó de `repMin` |
| **Banda alta** | Llegaste al 60% superior del rango con el RIR de la fase |
| **RIR sobrante** | Anotaste 1 rep o más de margen sobre el objetivo de la fase |
| **Meseta de carga** | 3 sesiones seguidas con el mismo peso completando el rango |

Antes existía **solo la primera**, y se exigía además que la *peor* serie tocara
el techo. Con rangos de 12-20 reps eso no ocurre nunca, así que el ejercicio
quedaba condenado a *"mantén el peso y suma 1 rep"* indefinidamente. En el
bloque 2 esto pasó de verdad: las laterales del martes estuvieron **5 sesiones
en 25 kg** y el curl predicador **6 sesiones en 30 kg**, subiendo solo reps.

Las puertas 2 y 4 son las que rompen ese bucle, y además todos los rangos del
programa se han estrechado a 3-4 reps de amplitud: un rango de 8 reps no es
doble progresión, es una cinta de correr.

Otros detalles:

- Topes de seguridad: nunca sugiere subir más de un 12% ni bajar más de un 8% de una semana
  a otra, para que un error de tecleo no te descuadre el bloque. **Pero un escalón siempre
  cabe**: en unas aperturas a 10 kg el disco más pequeño ya es +25%, y el tope las dejó
  clavadas 9 sesiones seguidas por pura aritmética.
- **Subir tiene prioridad sobre recortar.** Si llevas semanas moviendo lo mismo y completando
  el rango, el detector de estancamiento se disparaba y te bajaba la carga un 7%. Ahí no había
  nada que reconstruir: nunca se te había pedido más.
- Un **mal día aislado** no baja la carga: hacen falta dos señales, ni récord nuevo ni
  tendencia positiva del 1RM estimado.
- Reps absurdamente altas (más de 1,8× el techo del rango) no envenenan el 1RM estimado. Un
  `44 kg × 30 reps` mal teclado multiplicaba la carga sugerida de las semanas siguientes.
- En péndulo/hack lleva el historial de cada máquina por separado, porque los kilos no son
  comparables entre ellas.

### El historial se lee por FECHA, no por número de semana

La semana se avanza a mano con las flechas de *Entreno*. El motor pedía
"sesiones con semana < semana actual", así que si no la movías —o repetías un
día dentro de la misma semana— tu última sesión quedaba fuera del historial y la
app prescribía como si no existiera.

Además solo contaban las sesiones **finalizadas**. El autoguardado guarda como
borrador, así que si salías con la flecha atrás en lugar de pulsar *Finalizar*,
el entreno quedaba completo en pantalla pero **invisible** para la progresión,
el volumen y las gráficas.

Ahora el criterio único en toda la app es: **hay series marcadas = has
entrenado**. Y el orden es cronológico. Como efecto secundario, empezar un
bloque nuevo ya no pierde las cargas.

## Bloques

El bloque dura 10 semanas y termina en descarga. Al acabar, en *Perfil* →
**Empezar bloque N+1** vuelves a la semana 1: se reinicia la periodización
(Acumulación, RIR 3, series base) pero **no se borra nada** y las cargas siguen
donde las dejaste, porque se calculan por fecha.

Cada sesión guarda a qué bloque pertenece. Sin eso, la semana 1 del bloque nuevo
encontraba la sesión de la semana 1 del bloque anterior y la abría para que la
sobreescribieras encima.

## El informe del bloque

La pestaña *Progreso* abre con un informe que lee **todo** el historial y
responde lo que ninguna gráfica contesta:

- **Mesetas**: qué ejercicios llevan sesiones sin mover la carga, con cuántas y
  con la amplitud de su rango de reps al lado (que suele ser la causa).
- **Músculos**: series por semana que has hecho *de verdad* frente a las
  planificadas. Un músculo puede estar bien programado y quedarse corto porque
  sus ejercicios van siempre al final del entreno y llegas fundido.
- **Progresan**: los que sí avanzan, ordenados por ganancia de 1RM estimado.

En *Perfil* puedes copiar ese historial como **texto plano** (`Copiar resumen`)
para pegarlo donde no se pueda adjuntar un archivo, además del JSON completo.

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
