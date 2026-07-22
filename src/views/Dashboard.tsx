import { CheckCircle2, Circle, ChevronRight, Flame, Footprints, Trophy } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { WORKOUT_DAYS, phaseForWeek } from '../data/program'
import { runningWeek } from '../data/running'
import { PhaseBadge, ProgressBar, StatCard } from '../components/ui'

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

      {/* Objetivos */}
      <section className="card p-4">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Trophy size={18} className="text-amber-400" /> Objetivos del bloque
        </h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <Goal icon={<Flame size={15} className="text-rose-400" />}>
            Mejorar piernas sin dolor (péndulo, hack, isquios, hip thrust)
          </Goal>
          <Goal icon={<Flame size={15} className="text-rose-400" />}>Espalda más ancha</Goal>
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
