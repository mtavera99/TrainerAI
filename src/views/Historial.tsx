import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { WORKOUT_DAYS, findDay } from '../data/program'
import { estimated1RM, exerciseVolume } from '../lib/progression'
import { shortDate } from '../lib/format'
import { EmptyState, SectionTitle } from '../components/ui'

const CHART_TT = {
  contentStyle: { background: '#0f172a', border: '1px solid #334155', borderRadius: 12 },
  labelStyle: { color: '#e2e8f0' },
}

export default function Historial() {
  const { state, deleteSession } = useApp()

  // Peso corporal
  const bwData = [...state.bodyweightLog]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((b) => ({ date: shortDate(b.date), kg: b.weightKg }))

  // Volumen por semana
  const volumeByWeek = useMemo(() => {
    const map = new Map<number, number>()
    for (const s of state.sessions) {
      if (!s.completed) continue
      const vol = s.exercises.reduce((a, e) => a + exerciseVolume(e), 0)
      map.set(s.week, (map.get(s.week) ?? 0) + vol)
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([week, vol]) => ({ semana: `S${week}`, volumen: Math.round(vol) }))
  }, [state.sessions])

  // Todos los ejercicios (para el selector)
  const allExercises = useMemo(() => {
    const seen = new Set<string>()
    const list: { id: string; name: string }[] = []
    for (const d of WORKOUT_DAYS) {
      for (const e of d.exercises) {
        if (!seen.has(e.id)) {
          seen.add(e.id)
          list.push({ id: e.id, name: e.name })
        }
      }
    }
    return list
  }, [])

  const [exId, setExId] = useState(allExercises[0]?.id ?? '')

  // Progresión del ejercicio seleccionado (1RM estimado y peso top)
  const exData = useMemo(() => {
    const points: { date: string; e1rm: number; top: number }[] = []
    const sessions = [...state.sessions]
      .filter((s) => s.completed)
      .sort((a, b) => a.week - b.week || a.date.localeCompare(b.date))
    for (const s of sessions) {
      const le = s.exercises.find((e) => e.exerciseId === exId)
      if (!le) continue
      const working = le.sets.filter((st) => st.done && st.weight > 0 && st.reps > 0)
      if (working.length === 0) continue
      const top = Math.max(...working.map((w) => w.weight))
      const best = Math.max(...working.map((w) => estimated1RM(w.weight, w.reps)))
      points.push({ date: `S${s.week}`, e1rm: Math.round(best), top })
    }
    return points
  }, [state.sessions, exId])

  const completedSessions = [...state.sessions]
    .filter((s) => s.completed)
    .sort((a, b) => b.week - a.week || b.date.localeCompare(a.date))

  const hasData = completedSessions.length > 0

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Progreso</h1>

      {/* Peso corporal */}
      <div className="card p-4">
        <SectionTitle
          right={
            <span className="text-sm text-slate-400">
              meta {state.profile.goalWeightKg} kg
            </span>
          }
        >
          Peso corporal
        </SectionTitle>
        {bwData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={bwData} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip {...CHART_TT} formatter={(v: number) => [`${v} kg`, 'Peso']} />
              <Line type="monotone" dataKey="kg" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-400">
            Registra tu peso (en el perfil o al finalizar una sesión) varios días para ver la
            tendencia.
          </p>
        )}
      </div>

      {/* Volumen por semana */}
      <div className="card p-4">
        <SectionTitle>Volumen semanal (kg movidos)</SectionTitle>
        {volumeByWeek.length >= 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={volumeByWeek} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="semana" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip {...CHART_TT} formatter={(v: number) => [`${v.toLocaleString('es-ES')} kg`, 'Volumen']} />
              <Bar dataKey="volumen" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-400">Completa sesiones para ver tu volumen semanal.</p>
        )}
      </div>

      {/* Progresión por ejercicio */}
      <div className="card p-4">
        <SectionTitle>Fuerza por ejercicio</SectionTitle>
        <select
          value={exId}
          onChange={(e) => setExId(e.target.value)}
          className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm outline-none focus:border-brand-500 mb-3"
        >
          {allExercises.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        {exData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={exData} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip {...CHART_TT} formatter={(v: number, n) => [`${v} kg`, n === 'e1rm' ? '1RM estimado' : 'Peso top']} />
              <Line type="monotone" dataKey="e1rm" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} name="1RM estimado" />
              <Line type="monotone" dataKey="top" stroke="#f97316" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} name="Peso top" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-400">
            Necesitas al menos 2 sesiones registradas con este ejercicio para ver la progresión.
          </p>
        )}
      </div>

      {/* Historial de sesiones */}
      <section>
        <SectionTitle>Sesiones registradas</SectionTitle>
        {!hasData ? (
          <EmptyState title="Sin sesiones aún" desc="Cuando finalices entrenamientos aparecerán aquí." />
        ) : (
          <div className="space-y-2">
            {completedSessions.map((s) => {
              const day = findDay(s.dayId)
              const setsDone = s.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0)
              const vol = Math.round(s.exercises.reduce((a, e) => a + exerciseVolume(e), 0))
              return (
                <div key={s.id} className="card p-3 flex items-center gap-3">
                  <span className="h-9 w-1.5 rounded-full shrink-0" style={{ background: day?.color ?? '#64748b' }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{day?.name ?? 'Sesión'}</div>
                    <div className="text-xs text-slate-400">
                      Semana {s.week} · {shortDate(s.date)} · {setsDone} series · {vol.toLocaleString('es-ES')} kg
                    </div>
                    {s.notes && <div className="text-xs text-slate-500 mt-0.5 truncate">📝 {s.notes}</div>}
                  </div>
                  <button onClick={() => deleteSession(s.id)} className="text-slate-500 hover:text-rose-400 p-1 shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
