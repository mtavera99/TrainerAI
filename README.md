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
  (kg, reps, RIR) marcándolas como hechas.
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
| Lunes | **Pierna A** · péndulo *o* hack, prensa unilateral, extensiones, curl femoral tumbado, gemelos de pie, colgado | 19-21 |
| Martes | Empuje · press ancho, inclinado Smith, aperturas, cruce, laterales, tríceps ×2, antebrazo | 26 |
| Miércoles | **Pierna B** · curl femoral sentado, hip thrust, prensa profunda, aductores, gemelos sentado, crunch | 19-21 |
| Jueves | Espalda + Bíceps · jalón MAG, remo máquina, pull over, deltoide posterior, laterales, curl sentado, bayesian, antebrazo | 26 |
| Viernes | Fútbol ⚽ | — |
| Sábado | Hombro + Brazos · press militar Smith, laterales, pull over, predicador, copa, catana, antebrazo | 22 |
| Domingo | Descanso total | — |

Las salidas de running van el **martes y el sábado**, en días de tren superior: correr es la
modalidad de cardio que más interfiere con la hipertrofia de pierna, así que no se programa ni
el mismo día ni la víspera de un día de pierna. El plan de la pestaña *Running* lista 3 salidas
por semana; haz las dos continuas (martes y sábado) y deja la de intervalos como opcional: **el
fútbol del viernes ya es tu sesión de alta intensidad** y de sprints repetidos.

### Frecuencia y volumen reales

No están escritos a mano en ningún sitio: los calcula `src/lib/volume.ts` a partir de los
ejercicios del programa y se muestran en la pestaña *Inicio*. Si algún día se toca un
entrenamiento y un músculo se queda corto, se ve al instante.

| Músculo | Frecuencia | Series (S1-3 → S4-10) |
|---|---|---|
| Cuádriceps ⭐ | 2x | 13 → 15 |
| Femoral ⭐ | 2x | 8 → 10 |
| Glúteo ⭐ | 1x (+ fútbol) | 4 |
| Gemelos | 2x | 7 |
| Espalda ⭐ | 2x | 13 |
| Deltoide lateral ⭐ | 3x | 11 |
| Antebrazo ⭐ | 3x | 9 |
| Tríceps | 2x | 12 |
| Bíceps | 2x | 9 |
| Core | 2x | 4 |
| Pecho | 1x | 13 |
| Hombro (press) / posterior | 1x | 3 / 4 |

Pecho, hombro y brazos se quedan **1x a propósito**: el entreno de pecho te gusta y hombro y
brazos los sientes bien, así que en este bloque solo se rediseñó la pierna. Está documentado
como decisión, no como descuido.

**Periodización**: el RIR baja *y* el volumen sube. Acumulación (S1-3, RIR 3) →
Intensificación (S4-6, RIR 2, +1 serie en pierna) → Pico (S7-9, RIR 1) → Descarga (S10, RIR 4,
~40% menos series).

### Cómo decide la app tu carga de la semana

No es "suma 2,5 kg y reza". Registras kg, reps y RIR; a partir de ahí estima tu fuerza real en
ese movimiento (1RM estimado con la fórmula de Epley **corregido por el RIR** que anotaste) y
despeja qué carga necesitas para cumplir el objetivo de la semana siguiente. Cinco escenarios:

| Situación | Qué hace |
|---|---|
| Primera vez | Te pide calibrar y anotar la referencia |
| Llegaste al tope del rango | **Sube el peso** al que te deja en el mínimo de reps con el RIR de la fase |
| No llegaste al tope | **Mantén el peso** y suma 1 rep por serie |
| Anotaste RIR muy alto | **Sube la carga** aunque no hayas llegado al tope: se te quedó corta |
| 2 sesiones sin mejorar | **Baja un 7%** y reconstruye, con aviso de estancamiento |
| Semana de descarga | 90% de tu peso top y ~40% menos series |

Detalles que importan:

- El historial es **por movimiento, no por casilla del día**: las elevaciones laterales de
  martes, jueves y sábado son el mismo ejercicio y progresan juntas. Antes llevaban tres
  historiales independientes que no se hablaban entre sí.
- Topes de seguridad: nunca sugiere subir más de un 12% ni bajar más de un 8% de una semana
  a otra, para que un error de tecleo no te descuadre el bloque.
- En péndulo/hack lleva el historial de cada máquina por separado, porque los kilos no son
  comparables entre ellas.

### Ritmo de ganancia

La pestaña *Inicio* calcula la **tendencia** de tu peso (regresión lineal de las últimas 4
semanas, no la pesada de hoy) y la compara con la banda objetivo de **+0,2 a +0,5% del peso
corporal por semana**. Si llevas semanas plano te lo dice y te sugiere cuántas calorías añadir,
con tu objetivo estimado de kcal y proteína. Un programa de hipertrofia sin superávit es un
programa de mantenimiento con más agujetas.

## Stack

React + TypeScript + Vite + Tailwind CSS + Recharts. Sin backend.
