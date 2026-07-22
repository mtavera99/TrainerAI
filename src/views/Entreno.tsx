import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { WORKOUT_DAYS, findDay, phaseForWeek } from '../data/program'
import { PhaseBadge } from '../components/ui'
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
      return (
        <SessionLogger day={day} week={week} onBack={() => setSelectedDay(null)} />
      )
    }
  }

  const doneThisWeek = new Set(
    state.sessions.filter((s) => s.week === week && s.completed).map((s) => s.dayId),
  )

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Entrenamiento</h1>
        <PhaseBadge phase={phase.name} />
      </header>

      {/* Selector de semana */}
      <div className="card p-3 flex items-center justify-between">
        <button
          onClick={() => setCurrentWeek(week - 1)}
          disabled={week <= 1}
          className="btn-ghost !px-3 !py-2"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="text-xs text-slate-400 uppercase tracking-wide">{phase.name}</div>
          <div className="font-extrabold text-lg">
            Semana {week} <span className="text-slate-500 font-medium">/ {state.blockLengthWeeks}</span>
          </div>
        </div>
        <button
          onClick={() => setCurrentWeek(week + 1)}
          disabled={week >= state.blockLengthWeeks}
          className="btn-ghost !px-3 !py-2"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <p className="text-sm text-slate-400 -mt-1">{phase.description}</p>

      {/* Días */}
      <div className="space-y-2">
        {WORKOUT_DAYS.map((d) => {
          const done = doneThisWeek.has(d.id)
          return (
            <button
              key={d.id}
              onClick={() => setSelectedDay(d.id)}
              className="card w-full p-4 flex items-center gap-3 text-left hover:border-slate-700 transition-colors"
            >
              <span className="h-10 w-1.5 rounded-full shrink-0" style={{ background: d.color }} />
              {done ? (
                <CheckCircle2 className="text-emerald-400 shrink-0" size={22} />
              ) : (
                <Circle className="text-slate-600 shrink-0" size={22} />
              )}
              <span className="flex-1 min-w-0">
                <span className="block font-semibold">{d.name}</span>
                <span className="block text-xs text-slate-400">
                  {d.exercises.length} ejercicios · {d.focus}
                </span>
              </span>
              <ChevronRight className="text-slate-500 shrink-0" size={18} />
            </button>
          )
        })}
      </div>

      <div className="card p-4 text-sm text-slate-400">
        Al abrir un día verás el <span className="text-slate-200 font-medium">peso y las reps sugeridas</span> para
        esta semana, calculadas a partir de lo que registraste la semana anterior.
      </div>
    </div>
  )
}
