import { useState } from 'react'
import {
  CalendarDays,
  Footprints,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Trophy,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useApp } from '../context/AppContext'
import { RUNNING_CUES, runningWeek } from '../data/running'
import type { RunLog, RunType } from '../types'
import { shortDate, todayISO, uid } from '../lib/format'
import { EmptyState, PageHeader, SectionTitle, StatCard } from '../components/ui'

const TYPE_COLORS: Record<RunType, string> = {
  Intervalos: 'bg-sky-500/15 text-sky-300',
  Continuo: 'bg-emerald-500/15 text-emerald-300',
  Suave: 'bg-slate-500/20 text-slate-300',
  'Test 5K': 'bg-amber-500/15 text-amber-300',
}

export default function Running() {
  const { state, setCurrentWeek, addRun, deleteRun } = useApp()
  const week = state.currentWeek
  const rw = runningWeek(week)
  const [form, setForm] = useState(false)

  const chartData = [...state.runs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ date: shortDate(r.date), km: r.distanceKm }))

  const best = state.runs.reduce((m, r) => Math.max(m, r.distanceKm), 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Running"
        icon={<Footprints className="text-orange-400" size={24} />}
        right={<span className="chip bg-orange-500/15 text-orange-300">objetivo 5 km</span>}
      />

      {/* Distancia máxima */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          label="Mejor distancia"
          value={
            <>
              {best.toFixed(2)}
              <span className="text-sm text-slate-400 font-bold"> km</span>
            </>
          }
          accent="text-orange-400"
        />
        <StatCard label="Salidas totales" value={state.runs.length} accent="text-slate-100" />
      </div>

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
        <div className="text-center min-w-0 px-2">
          <div className="section-label">Plan semana {week}</div>
          <div className="font-bold text-sm mt-0.5 truncate">{rw.focus}</div>
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

      {/* Sesiones de la semana */}
      <div className="space-y-2">
        {rw.sessions.map((s) => (
          <div
            key={s.id}
            className={`card p-4 ${s.optional ? 'border-dashed opacity-80' : ''}`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-orange-300">{s.day}</span>
              {s.optional ? (
                <span className="chip bg-slate-700 text-slate-300">opcional</span>
              ) : (
                <span className="chip bg-orange-500/15 text-orange-300">fija</span>
              )}
              <span className={`chip ${TYPE_COLORS[s.type]}`}>{s.type}</span>
              <span className="text-xs text-slate-400 ml-auto">~{s.durationMin} min</span>
            </div>
            <p className="text-sm text-slate-200 mt-2">{s.description}</p>
            {s.optional && (
              <p className="text-xs text-slate-500 mt-1.5">
                Solo si llegas sobrado de energía. El viernes juegas al fútbol, así que si dudas,
                sáltatela.
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Por qué esos días */}
      <div className="card p-4 flex items-start gap-2">
        <CalendarDays size={16} className="text-orange-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          Las tres salidas caen en <span className="text-slate-200">días de tren superior</span>{' '}
          (martes empuje, jueves espalda, sábado hombro) y ninguna el mismo día que Pierna A o
          Pierna B. Toda la intensidad va el <span className="text-slate-200">sábado</span>,
          único día con 48 h sin pierna detrás. El{' '}
          <span className="text-slate-200">martes es la víspera de Pierna B</span>, así que es
          siempre trote conversacional, nunca series: con 5 días de pesas y el fútbol del viernes
          no hay ningún hueco perfecto, y este es el compromiso que menos te cuesta.
        </p>
      </div>

      {/* Técnica */}
      <div className="card p-4">
        <SectionTitle>Recuerda tu técnica</SectionTitle>
        <ul className="space-y-1.5 text-sm text-slate-300">
          {RUNNING_CUES.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-orange-400">•</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Progreso de distancia */}
      <div className="card p-4">
        <SectionTitle>Progreso de distancia</SectionTitle>
        {chartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(v: number) => [`${v} km`, 'Distancia']}
              />
              <Line type="monotone" dataKey="km" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-400">Registra al menos 2 salidas para ver tu evolución.</p>
        )}
      </div>

      {/* Registrar salida */}
      {form ? (
        <RunForm
          onSave={(r) => {
            addRun(r)
            setForm(false)
          }}
          onCancel={() => setForm(false)}
        />
      ) : (
        <button onClick={() => setForm(true)} className="btn-primary w-full">
          <Plus size={18} /> Registrar salida
        </button>
      )}

      {/* Historial de salidas */}
      <section>
        <SectionTitle>Tus salidas</SectionTitle>
        {state.runs.length === 0 ? (
          <EmptyState title="Aún no hay salidas" desc="Registra tu primera carrera para empezar a ver el progreso." />
        ) : (
          <div className="space-y-2">
            {[...state.runs]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((r) => (
                <div key={r.id} className="card p-3 flex items-center gap-3">
                  {r.type === 'Test 5K' && <Trophy size={18} className="text-amber-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`chip ${TYPE_COLORS[r.type]}`}>{r.type}</span>
                      <span className="text-xs text-slate-400">{shortDate(r.date)}</span>
                    </div>
                    <div className="text-sm mt-1">
                      <span className="font-bold text-orange-400">{r.distanceKm} km</span>
                      <span className="text-slate-400"> · {r.durationMin} min</span>
                      {r.cadence ? <span className="text-slate-400"> · {r.cadence} ppm</span> : null}
                    </div>
                    {r.notes && <div className="text-xs text-slate-500 mt-0.5">{r.notes}</div>}
                  </div>
                  <button onClick={() => deleteRun(r.id)} className="text-slate-500 hover:text-rose-400 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  )
}

function RunForm({
  onSave,
  onCancel,
}: {
  onSave: (r: RunLog) => void
  onCancel: () => void
}) {
  const [type, setType] = useState<RunType>('Suave')
  const [distanceKm, setDistance] = useState(0)
  const [durationMin, setDuration] = useState(0)
  const [cadence, setCadence] = useState(0)
  const [rpe, setRpe] = useState(0)
  const [notes, setNotes] = useState('')

  const types: RunType[] = ['Suave', 'Continuo', 'Intervalos', 'Test 5K']

  return (
    <div className="card p-4 space-y-3">
      <h3 className="font-bold">Nueva salida</h3>
      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`chip border ${
              type === t ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' : 'border-slate-700 text-slate-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Distancia (km)">
          <RunNum value={distanceKm} step={0.1} onChange={setDistance} />
        </Field>
        <Field label="Duración (min)">
          <RunNum value={durationMin} step={1} onChange={setDuration} />
        </Field>
        <Field label="Cadencia (ppm)">
          <RunNum value={cadence} step={1} onChange={setCadence} />
        </Field>
        <Field label="Esfuerzo (RPE 1-10)">
          <RunNum value={rpe} step={1} onChange={setRpe} />
        </Field>
      </div>
      <Field label="Notas">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Cómo te sentiste, tibial, respiración…"
          className="input resize-none"
        />
      </Field>
      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-ghost flex-1">Cancelar</button>
        <button
          onClick={() =>
            onSave({
              id: uid('run-'),
              date: todayISO(),
              type,
              distanceKm,
              durationMin,
              cadence: cadence || undefined,
              rpe: rpe || undefined,
              notes: notes || undefined,
            })
          }
          className="btn-primary flex-1"
        >
          Guardar
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="section-label">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

function RunNum({ value, onChange, step }: { value: number; onChange: (v: number) => void; step: number }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value}
      step={step}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="input font-semibold nums"
    />
  )
}
