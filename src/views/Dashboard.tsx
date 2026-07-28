import { useMemo, useState } from 'react'
import {
  AlertTriangle,
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
import { requiredRuns, runningWeek } from '../data/running'
import { plannedSets } from '../lib/progression'
import {
  PER_SESSION_CEILING,
  perSessionOverload,
  regionVolume,
  weeklyVolume,
  type MuscleVolumeRow,
  type SessionOverload,
  type VolumeStatus,
} from '../lib/volume'
import { gainRateReport, nutritionTargets, type GainStatus } from '../lib/nutrition'
import {
  PageHeader,
  PhaseBadge,
  ProgressBar,
  ProgressRing,
  RangeBar,
  SectionTitle,
  StatCard,
} from '../components/ui'

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
  const overloads = useMemo(() => perSessionOverload(week), [week])
  const gain = useMemo(
    () => gainRateReport(state.profile, state.bodyweightLog),
    [state.profile, state.bodyweightLog],
  )
  const targets = useMemo(
    () => nutritionTargets(state.profile, gain.smoothedKg),
    [state.profile, gain.smoothedKg],
  )

  const runsThisWeek = requiredRuns(week)

  return (
    <div className="space-y-4">
      <PageHeader
        subtitle={`Hola, ${firstName} 👋`}
        title={`Semana ${week}`}
        right={<PhaseBadge phase={phase.name} />}
      />

      {/* Progreso del bloque */}
      <div className="card p-4">
        <div className="flex items-center justify-between text-sm mb-2.5">
          <span className="font-semibold text-slate-200">Bloque 2 · Pierna</span>
          <span className="text-xs text-slate-400 nums">
            {week} / {state.blockLengthWeeks} semanas
          </span>
        </div>
        <ProgressBar pct={blockPct} />
        <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">{phase.description}</p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <StatCard label="Fuerza" value={`${doneThisWeek.size}/${totalStrength}`} sub="esta semana" />
        <StatCard
          label="Peso"
          value={gain.smoothedKg}
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
        <SectionTitle
          right={
            <span className="text-xs text-slate-400 nums">
              {doneThisWeek.size} de {totalStrength} hechos
            </span>
          }
        >
          Entrenamientos
        </SectionTitle>
        <div className="space-y-2">
          {WORKOUT_DAYS.map((d) => {
            const done = doneThisWeek.has(d.id)
            const session = state.sessions.find((s) => s.dayId === d.id && s.week === week)
            const setsDone = session
              ? session.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0)
              : 0
            const setsPlanned = d.exercises
              .filter((e) => !e.alternativeOf)
              .reduce((a, e) => a + plannedSets(e, week, undefined, state.sessions).sets, 0)
            const started = !done && setsDone > 0
            const isLeg = d.id === 'd1' || d.id === 'd4'

            return (
              <button
                key={d.id}
                onClick={() => onOpenDay(d.id)}
                className="card-tap w-full p-3.5 flex items-center gap-3 text-left"
              >
                <span
                  className="h-11 w-1.5 rounded-full shrink-0"
                  style={{ background: d.color }}
                />
                {done ? (
                  <CheckCircle2 className="text-emerald-400 shrink-0" size={24} />
                ) : started ? (
                  <ProgressRing done={setsDone} total={setsPlanned} size={30} />
                ) : (
                  <Circle className="text-slate-700 shrink-0" size={24} />
                )}
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="font-semibold truncate">{d.name}</span>
                    {isLeg && (
                      <Star size={11} className="text-amber-400 shrink-0" fill="currentColor" />
                    )}
                  </span>
                  <span className="block text-[11px] text-slate-400 truncate mt-0.5">
                    {setsPlanned} series · {d.focus}
                  </span>
                </span>
                <ChevronRight className="text-slate-600 shrink-0" size={18} />
              </button>
            )
          })}
        </div>
      </section>

      {/* Running de la semana */}
      <button onClick={goRunning} className="card-tap w-full p-3.5 flex items-center gap-3 text-left">
        <div className="grid place-items-center h-11 w-11 rounded-xl bg-orange-500/15 text-orange-400 shrink-0">
          <Footprints size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">Running · {rw.focus}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {runsThisWeek.map((s) => s.day).join(' y ')}
            {rw.sessions.some((s) => s.optional) && ' · jueves opcional'} · objetivo 5 km
          </div>
        </div>
        <ChevronRight className="text-slate-600 shrink-0" size={18} />
      </button>

      {/* Auditoría de volumen */}
      <VolumeCard rows={volume} deload={!!phase.deload} overloads={overloads} />

      {/* Ritmo de ganancia */}
      <div className="card p-4">
        <SectionTitle
          right={
            <span className="text-xs text-slate-400 nums">
              meta {state.profile.goalWeightKg} kg
            </span>
          }
        >
          Ritmo de ganancia
        </SectionTitle>

        <div className="flex items-center gap-2.5">
          <span
            className={`grid place-items-center h-10 w-10 rounded-xl shrink-0 ${GAIN_BG[gain.status]}`}
          >
            <TrendingUp size={18} />
          </span>
          <div className="min-w-0">
            <div className={`font-bold leading-tight ${GAIN_COLORS[gain.status]}`}>
              {gain.headline}
            </div>
            {gain.status !== 'sin-datos' && (
              <div className="text-xs text-slate-400 nums mt-0.5">
                {gain.weeklyKg > 0 ? '+' : ''}
                {gain.weeklyKg} kg/sem · {gain.weeklyPct}% · media {gain.smoothedKg} kg
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-3 leading-relaxed">{gain.advice}</p>
        {gain.weeksToGoal !== undefined && (
          <p className="text-xs text-slate-500 mt-1.5 nums">
            A este ritmo llegas a {state.profile.goalWeightKg} kg en ~{gain.weeksToGoal} semanas.
          </p>
        )}

        <div className="mt-3 flex items-start gap-2 text-xs text-slate-300 bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
          <Utensils size={14} className="text-emerald-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            Objetivo diario: <span className="font-bold nums">{targets.kcal} kcal</span> y{' '}
            <span className="font-bold nums">
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
        <ul className="space-y-2.5 text-sm text-slate-200">
          <Goal icon={<Flame size={15} className="text-rose-400" />}>
            <span className="font-semibold">Piernas (prioridad nº1):</span> cuádriceps e isquios
            2x/semana, sin cargar la lumbar
          </Goal>
          <Goal icon={<Flame size={15} className="text-rose-400" />}>
            Espalda más ancha (2x/sem)
          </Goal>
          <Goal icon={<Flame size={15} className="text-rose-400" />}>
            Hombros más redondos (laterales 3x/sem)
          </Goal>
          <Goal icon={<Footprints size={15} className="text-orange-400" />}>
            Correr 5 km continuos
          </Goal>
        </ul>
      </section>
    </div>
  )
}

function Goal({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="leading-snug">{children}</span>
    </li>
  )
}

const GAIN_COLORS: Record<GainStatus, string> = {
  'sin-datos': 'text-slate-300',
  perdiendo: 'text-rose-400',
  plano: 'text-amber-400',
  lento: 'text-amber-300',
  optimo: 'text-emerald-400',
  rapido: 'text-orange-400',
}

const GAIN_BG: Record<GainStatus, string> = {
  'sin-datos': 'bg-slate-800 text-slate-400',
  perdiendo: 'bg-rose-500/15 text-rose-400',
  plano: 'bg-amber-500/15 text-amber-400',
  lento: 'bg-amber-500/15 text-amber-300',
  optimo: 'bg-emerald-500/15 text-emerald-400',
  rapido: 'bg-orange-500/15 text-orange-400',
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
function VolumeCard({
  rows,
  deload,
  overloads,
}: {
  rows: MuscleVolumeRow[]
  deload: boolean
  overloads: SessionOverload[]
}) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? rows : rows.filter((r) => r.priority || r.status !== 'ok')
  const low = rows.filter((r) => r.status === 'bajo')
  const regions = regionVolume(rows)
  const doneTotal = rows.reduce((a, r) => a + r.doneSets, 0)
  const plannedTotal = rows.reduce((a, r) => a + r.plannedSets, 0)

  return (
    <div className="card p-4">
      <SectionTitle
        right={
          deload ? (
            <span className="chip bg-emerald-500/15 text-emerald-300">descarga</span>
          ) : (
            <span className="text-[11px] text-slate-500">series · frecuencia</span>
          )
        }
      >
        Volumen por músculo
      </SectionTitle>

      {/* Totales por región. El rango va SIEMPRE al lado: sin él, un total de
          28 de hombro se compara con la regla de "10-20 por músculo" y parece
          una barbaridad, cuando son tres músculos sumados. */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {regions.map((g) => (
          <div key={g.label} className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 leading-tight">
              {g.label}
            </div>
            <div className="mt-1 text-xl font-extrabold nums leading-none">
              {g.effectiveSets}
              <span className="text-[10px] font-bold text-slate-500"> series</span>
            </div>
            <div className="text-[10px] text-slate-500 nums mt-0.5">
              rango {g.target[0]}-{g.target[1]} · {g.members.length} músculos
            </div>
            <div className="text-[10px] text-slate-500 nums">
              {g.directSets} dir
              {g.indirectSets > 0 && ` + ${g.indirectSets} ind`} · {g.frequency}x
            </div>
          </div>
        ))}
      </div>

      {/* Lo que llevas HECHO esta semana. Sin esto la tarjeta solo mostraba el
          plan, que dentro de una misma fase es idéntico las tres semanas, y
          parecía que la app no recalculaba nada. */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-300 font-semibold">Hecho esta semana</span>
          <span className="text-slate-400 nums">
            {doneTotal} de {plannedTotal} series
          </span>
        </div>
        <ProgressBar
          pct={plannedTotal > 0 ? (doneTotal / plannedTotal) * 100 : 0}
          height="h-1.5"
          className="bg-gradient-to-r from-emerald-500 to-emerald-400"
        />
      </div>

      {/* Segundo eje de calibración: reparto dentro de la semana */}
      {overloads.length > 0 && (
        <div className="mb-4 flex items-start gap-2 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            {overloads.map((o) => (
              <span key={o.dayId + o.muscle}>
                <span className="font-semibold">
                  {o.muscle}: {o.fractionalSets} series en un solo día
                </span>{' '}
                ({o.dayName.split('·')[0].trim()}).{' '}
              </span>
            ))}
            Por encima de ~{PER_SESSION_CEILING} series del mismo músculo en una sesión, añadir
            más deja de aportar. El total semanal está bien; lo que está apelotonado es el
            reparto.
          </span>
        </div>
      )}

      <div className="space-y-2.5">
        {visible.map((r) => (
          <div key={r.muscle}>
            <div className="flex items-center gap-2 text-sm">
              {r.priority ? (
                <Star size={11} className="text-amber-400 shrink-0" fill="currentColor" />
              ) : (
                <span className="w-[11px] shrink-0" />
              )}
              <span className="flex-1 min-w-0 truncate text-slate-200">{r.muscle}</span>
              <span className="text-[11px] text-slate-500 nums">
                {r.target[0]}-{r.target[1]}
              </span>
              <span className="font-bold nums w-12 text-right">
                {r.effectiveSets}
                {r.indirectSets > 0 && (
                  <span className="text-[10px] font-medium text-slate-500">
                    {' '}
                    ({r.plannedSets}+{r.indirectSets})
                  </span>
                )}
              </span>
              <span className="text-[11px] text-slate-400 nums w-6 text-right">{r.frequency}x</span>
              <span className={`chip w-11 justify-center ${STATUS_STYLES[r.status].cls}`}>
                {STATUS_STYLES[r.status].label}
              </span>
            </div>
            <div className="mt-1.5 ml-[19px] flex items-center gap-2">
              <div className="flex-1">
                <RangeBar
                  value={r.effectiveSets}
                  min={r.target[0]}
                  max={r.target[1]}
                  tone={r.status}
                />
              </div>
              <span
                className={`text-[10px] nums w-16 text-right ${
                  r.doneSets >= r.plannedSets ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {r.doneSets}/{r.plannedSets} hechas
              </span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowAll((v) => !v)}
        className="mt-3.5 chip bg-slate-800 text-brand-300 hover:bg-slate-700 !py-1.5 !px-2.5 transition-colors active:scale-95"
      >
        {showAll ? 'Ver solo prioritarios' : `Ver los ${rows.length} músculos`}
      </button>

      <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed">
        ⭐ prioridad del bloque. El número grande es el volumen efectivo de la semana y, entre
        paréntesis, las series <span className="text-slate-400">directas + indirectas</span>: un
        press de pecho no entrena el deltoides anterior como un press militar, pero tampoco a
        cero, así que cuenta media serie. Los rangos son{' '}
        <span className="text-slate-400">por músculo</span>, nunca por región, y están calibrados
        para nivel intermedio: 10-20 en los prioritarios y 8-16 en los de mantenimiento.
        {low.length > 0 && (
          <span className="text-rose-300">
            {' '}
            Por debajo del mínimo: {low.map((r) => r.muscle).join(', ')}.
          </span>
        )}
      </p>
    </div>
  )
}
