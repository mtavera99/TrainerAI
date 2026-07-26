import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Flame,
  Footprints,
  Star,
  Trophy,
  TrendingUp,
  Utensils,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { WORKOUT_DAYS, phaseForWeek } from '../data/program'
import { runningWeek } from '../data/running'
import { weeklyVolume, type MuscleVolumeRow, type VolumeStatus } from '../lib/volume'
import { gainRateReport, nutritionTargets, type GainStatus } from '../lib/nutrition'
import { PhaseBadge, ProgressBar, SectionTitle, StatCard } from '../components/ui'

export default function Dashboard({
  onOpenDay,
  goRunning,
}: {
  onOpenDay: (dayId: string) => void
  goRunning: () => void
}) {
  const { state } = useApp()
  const week = state.currentWeek
  const phase = phaseForWeek(week)

  const doneThisWeek = new Set(
    state.sessions.filter((s) => s.week === week && s.completed).map((s) => s.dayId),
  )

  const totalStrength = WORKOUT_DAYS.length
  const blockPct = ((week - 1) / state.blockLengthWeeks) * 100
  const rw = runningWeek(week)

  const firstName = state.profile.name.split(' ')[0]

  const volume = useMemo(() => weeklyVolume(week, state.sessions), [week, state.sessions])
  const gain = useMemo(
    () => gainRateReport(state.profile, state.bodyweightLog),
    [state.profile, state.bodyweightLog],
  )
  const targets = useMemo(
    () => nutritionTargets(state.profile, gain.smoothedKg),
    [state.profile, gain.smoothedKg],
  )

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-slate-400 text-sm">Hola, {firstName} 👋</p>
          <h1 className="text-2xl font-extrabold">Semana {week}</h1>
        </div>
        <PhaseBadge phase={phase.name} />
      </header>

      {/* Progreso del bloque */}
      <div className="card p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-300 font-medium">Bloque 1</span>
          <span className="text-slate-400">
            Semana {week} de {state.blockLengthWeeks}
          </span>
        </div>
        <ProgressBar pct={blockPct} />
        <p className="text-xs text-slate-400 mt-2">{phase.description}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Fuerza" value={`${doneThisWeek.size}/${totalStrength}`} sub="esta semana" />
        <StatCard
          label="Peso"
          value={`${state.profile.weightKg}`}
          sub={`meta ${state.profile.goalWeightKg} kg`}
          accent="text-emerald-400"
        />
        <StatCard
          label="Running"
          value={state.runs.length}
          sub="salidas totales"
          accent="text-orange-400"
        />
      </div>

      {/* Entrenamientos de la semana */}
      <section>
        <h2 className="text-lg font-bold mb-3">Entrenamientos de fuerza</h2>
        <div className="space-y-2">
          {WORKOUT_DAYS.map((d) => {
            const done = doneThisWeek.has(d.id)
            return (
              <button
                key={d.id}
                onClick={() => onOpenDay(d.id)}
                className="card w-full p-4 flex items-center gap-3 text-left hover:border-slate-700 transition-colors"
              >
                <span
                  className="h-9 w-1.5 rounded-full shrink-0"
                  style={{ background: d.color }}
                />
                {done ? (
                  <CheckCircle2 className="text-emerald-400 shrink-0" size={22} />
                ) : (
                  <Circle className="text-slate-600 shrink-0" size={22} />
                )}
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold truncate">{d.name}</span>
                  <span className="block text-xs text-slate-400 truncate">{d.focus}</span>
                </span>
                <ChevronRight className="text-slate-500 shrink-0" size={18} />
              </button>
            )
          })}
        </div>
      </section>

      {/* Running de la semana */}
      <button onClick={goRunning} className="card w-full p-4 flex items-center gap-3 text-left hover:border-slate-700">
        <div className="grid place-items-center h-10 w-10 rounded-xl bg-orange-500/15 text-orange-400 shrink-0">
          <Footprints size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Running · {rw.focus}</div>
          <div className="text-xs text-slate-400">{rw.sessions.length} salidas esta semana · objetivo 5 km</div>
        </div>
        <ChevronRight className="text-slate-500" size={18} />
      </button>

      {/* Auditoría de volumen */}
      <VolumeCard rows={volume} />

      {/* Ritmo de ganancia */}
      <div className="card p-4">
        <SectionTitle
          right={
            <span className="text-xs text-slate-400">
              meta {state.profile.goalWeightKg} kg
            </span>
          }
        >
          Ritmo de ganancia
        </SectionTitle>
        <div className="flex items-baseline gap-2">
          <TrendingUp size={18} className={GAIN_COLORS[gain.status]} />
          <span className={`font-bold ${GAIN_COLORS[gain.status]}`}>{gain.headline}</span>
        </div>
        {gain.status !== 'sin-datos' && (
          <div className="mt-2 flex items-center gap-4 text-sm">
            <span>
              <span className="text-slate-400 text-xs">tendencia </span>
              <span className="font-semibold">
                {gain.weeklyKg > 0 ? '+' : ''}
                {gain.weeklyKg} kg/sem
              </span>
            </span>
            <span className="text-slate-400 text-xs">({gain.weeklyPct}% / sem)</span>
            <span className="text-slate-400 text-xs ml-auto">{gain.smoothedKg} kg</span>
          </div>
        )}
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{gain.advice}</p>
        {gain.weeksToGoal !== undefined && (
          <p className="text-xs text-slate-500 mt-1">
            A este ritmo llegas a {state.profile.goalWeightKg} kg en ~{gain.weeksToGoal} semanas.
          </p>
        )}
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-300 bg-slate-800/50 rounded-xl p-3">
          <Utensils size={14} className="text-emerald-400 shrink-0" />
          <span>
            Objetivo diario: <span className="font-semibold">{targets.kcal} kcal</span> y{' '}
            <span className="font-semibold">
              {targets.proteinG[0]}-{targets.proteinG[1]} g
            </span>{' '}
            de proteína. Sin esto, el programa no puede funcionar.
          </span>
        </div>
      </div>

      {/* Objetivos */}
      <section className="card p-4">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Trophy size={18} className="text-amber-400" /> Objetivos del bloque
        </h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <Goal icon={<Flame size={15} className="text-rose-400" />}>
            <span className="font-semibold">Piernas (prioridad nº1):</span> cuádriceps e isquios
            2x/semana, sin cargar la lumbar
          </Goal>
          <Goal icon={<Flame size={15} className="text-rose-400" />}>Espalda más ancha (2x/sem)</Goal>
          <Goal icon={<Flame size={15} className="text-rose-400" />}>Hombros más redondos (laterales 3x/sem)</Goal>
          <Goal icon={<Footprints size={15} className="text-orange-400" />}>Correr 5 km continuos</Goal>
        </ul>
      </section>
    </div>
  )
}

function Goal({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5">{icon}</span>
      <span>{children}</span>
    </li>
  )
}

const GAIN_COLORS: Record<GainStatus, string> = {
  'sin-datos': 'text-slate-400',
  perdiendo: 'text-rose-400',
  plano: 'text-amber-400',
  lento: 'text-amber-300',
  optimo: 'text-emerald-400',
  rapido: 'text-orange-400',
}

const STATUS_STYLES: Record<VolumeStatus, { cls: string; label: string }> = {
  bajo: { cls: 'bg-rose-500/15 text-rose-300', label: 'bajo' },
  ok: { cls: 'bg-emerald-500/15 text-emerald-300', label: 'ok' },
  alto: { cls: 'bg-amber-500/15 text-amber-300', label: 'alto' },
}

/**
 * Series y frecuencia reales por músculo, calculadas desde el programa.
 * Es la tarjeta que impide que la app vuelva a "prometer" una frecuencia que
 * los ejercicios no cumplen.
 */
function VolumeCard({ rows }: { rows: MuscleVolumeRow[] }) {
  const [showAll, setShowAll] = useState(false)
  const lowOrPriority = rows.filter((r) => r.priority || r.status !== 'ok')
  const visible = showAll ? rows : lowOrPriority
  const low = rows.filter((r) => r.status === 'bajo')

  return (
    <div className="card p-4">
      <SectionTitle right={<span className="text-xs text-slate-400">series · frecuencia</span>}>
        Volumen semanal por músculo
      </SectionTitle>

      <div className="space-y-1.5">
        {visible.map((r) => (
          <div key={r.muscle} className="flex items-center gap-2 text-sm">
            <span className="w-4 shrink-0">
              {r.priority && <Star size={12} className="text-amber-400" fill="currentColor" />}
            </span>
            <span className="flex-1 min-w-0 truncate text-slate-200">{r.muscle}</span>
            <span className="text-slate-400 text-xs w-14 text-right">
              {r.target[0]}-{r.target[1]}
            </span>
            <span className="font-semibold w-14 text-right">{r.plannedSets}</span>
            <span className="text-slate-400 text-xs w-8 text-right">{r.frequency}x</span>
            <span className={`chip w-12 justify-center ${STATUS_STYLES[r.status].cls}`}>
              {STATUS_STYLES[r.status].label}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowAll((v) => !v)}
        className="mt-3 text-xs text-brand-400 font-medium hover:text-brand-300"
      >
        {showAll ? 'Ver solo prioritarios' : `Ver los ${rows.length} músculos`}
      </button>

      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
        ⭐ = prioridad del bloque. La columna de la izquierda es el rango recomendado de series
        directas por semana; el número en negrita es lo que el programa planifica de verdad esta
        semana (contando el escalado de series de la fase).
        {low.length > 0 && (
          <>
            {' '}
            <span className="text-rose-300">
              Por debajo del mínimo: {low.map((r) => r.muscle).join(', ')}.
            </span>
          </>
        )}
      </p>
    </div>
  )
}
