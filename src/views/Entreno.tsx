import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Star } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { WORKOUT_DAYS, findDay, phaseForWeek } from '../data/program'
import { plannedSets } from '../lib/progression'
import { PageHeader, PhaseBadge, ProgressRing } from '../components/ui'
import SessionLogger from './SessionLogger'

export default function Entreno({
  initialDay,
  clearInitialDay,
}: {
  initialDay?: string
  clearInitialDay: () => void
}) {
  const { state, setCurrentWeek } = useApp()
  const [selectedDay, setSelectedDay] = useState<string | null>(initialDay ?? null)

  useEffect(() => {
    if (initialDay) {
      setSelectedDay(initialDay)
      clearInitialDay()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDay])

  const week = state.currentWeek
  const phase = phaseForWeek(week)

  if (selectedDay) {
    const day = findDay(selectedDay)
    if (day) {
      return <SessionLogger day={day} week={week} onBack={() => setSelectedDay(null)} />
    }
  }

  const doneThisWeek = new Set(
    state.sessions.filter((s) => s.week === week && s.completed).map((s) => s.dayId),
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Entrenamiento" right={<PhaseBadge phase={phase.name} />} />

      {/* Selector de semana */}
      <div className="card p-2.5 flex items-center justify-between">
        <button
          onClick={() => setCurrentWeek(week - 1)}
          disabled={week <= 1}
          className="btn-ghost !px-3 !py-2.5"
          aria-label="Semana anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="section-label">{phase.name}</div>
          <div className="font-extrabold text-lg nums mt-0.5">
            Semana {week}{' '}
            <span className="text-slate-600 font-semibold text-sm">
              / {state.blockLengthWeeks}
            </span>
          </div>
        </div>
        <button
          onClick={() => setCurrentWeek(week + 1)}
          disabled={week >= state.blockLengthWeeks}
          className="btn-ghost !px-3 !py-2.5"
          aria-label="Semana siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed px-1">{phase.description}</p>

      {/* Días */}
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
          const exCount = d.exercises.filter((e) => !e.alternativeOf).length

          return (
            <button
              key={d.id}
              onClick={() => setSelectedDay(d.id)}
              className="card-tap w-full p-4 flex items-center gap-3 text-left"
            >
              <span className="h-12 w-1.5 rounded-full shrink-0" style={{ background: d.color }} />
              {done ? (
                <CheckCircle2 className="text-emerald-400 shrink-0" size={24} />
              ) : started ? (
                <ProgressRing done={setsDone} total={setsPlanned} size={32} />
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
                <span className="block text-[11px] text-slate-400 mt-0.5 truncate">
                  {exCount} ejercicios · {setsPlanned} series · {d.focus}
                </span>
              </span>
              <ChevronRight className="text-slate-600 shrink-0" size={18} />
            </button>
          )
        })}
      </div>

      <div className="card p-4 text-xs text-slate-400 leading-relaxed">
        Al abrir un día verás el{' '}
        <span className="text-slate-200 font-semibold">peso y las reps sugeridas</span> para esta
        semana, calculadas a partir de lo que registraste antes, y podrás desplegar el porqué de
        cada decisión. ⭐ marca los días de tu prioridad nº1.
      </div>
    </div>
  )
}
