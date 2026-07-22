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

## El programa (Bloque 1 · 10 semanas)

Diseñado con **tus máquinas reales** y prioridades: piernas sin dolor → espalda → hombros →
mantener pecho → integrar running. Juegas **fútbol los viernes**, así que las piernas se
programan lejos de ese día.

| Día | Enfoque |
|-----|---------|
| Lunes | Pierna A · Cuádriceps (péndulo, hack, extensiones, gemelos, abdomen) |
| Martes | Empuje · Pecho/Hombro/Tríceps (press ancho, inclinado Smith, aperturas, cruce, laterales, tríceps, antebrazo) |
| Miércoles | Pierna B · Posterior (isquios tumbado y sentado, hip thrust, prensa unilateral, aductores, gemelos, crunch) |
| Jueves | Espalda + Bíceps (jalón MAG, remo máquina, pull over, deltoide posterior, curl sentado, bayesian, antebrazo) |
| Viernes | Fútbol ⚽ |
| Sábado | Hombro + Brazos (press militar Smith, laterales, pull over, predicador, copa, catana, antebrazo) |
| Domingo | Descanso (running suave opcional) |

**Frecuencia semanal**: espalda 2x, deltoide lateral 3x, pecho 2x, pierna 2x (+ fútbol),
antebrazo 3x (punto débil), abdomen 2x.

**Periodización del RIR**: Acumulación (S1-3, RIR 3) → Intensificación (S4-6, RIR 2) →
Pico (S7-9, RIR 1) → Descarga (S10, RIR 4, volumen reducido).

### Cómo progresa cada semana (doble progresión)

1. Registras tus series de la semana.
2. Para la semana siguiente, cada ejercicio se recalcula:
   - Si alcanzaste el tope del rango de reps en todas las series → **sube el peso** (según el
     incremento mínimo de esa máquina) y vuelve a por el mínimo de reps.
   - Si no → **mantén el peso** y suma 1-2 reps por serie.
3. La app te explica el *porqué* de cada sugerencia.

## Stack

React + TypeScript + Vite + Tailwind CSS + Recharts. Sin backend.
