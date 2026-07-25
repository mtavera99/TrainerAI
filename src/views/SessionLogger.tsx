import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, Check, Info, Plus, Trash2, Timer } from 'lucide-react'
import type {
  LoggedExercise,
  LoggedSet,
  ProgressionAction,
  SessionLog,
  WorkoutDayTemplate,
} from '../types'
import { useApp } from '../context/AppContext'
import { prescribeDay } from '../lib/progression'
import { todayISO, uid } from '../lib/format'
import { Muscle } from '../components/ui'

function buildDraft(
  day: WorkoutDayTemplate,
  week: number,
  sessions: SessionLog[],
): SessionLog {
  const prescriptions = prescribeDay(day, week, sessions)
  const exercises: LoggedExercise[] = day.exercises.map((ex) => {
    const p = prescriptions.find((x) => x.exerciseId === ex.id)!
    const sets: LoggedSet[] = Array.from({ length: p.sets }).map(() => ({
      weight: p.suggestedWeight ?? 0,
      reps: 0,
      rir: p.targetRIR,
      done: false,
    }))
    return { exerciseId: ex.id, sets }
  })
  return {
    id: uid('sess-'),
    dayId: day.id,
    week,
    date: todayISO(),
    exercises,
    completed: false,
  }
}

export default function SessionLogger({
  day,
  week,
  onBack,
}: {
  day: WorkoutDayTemplate
  week: number
  onBack: () => void
}) {
  const { state, saveSession, deleteSession } = useApp()

  const existing = useMemo(
    () => state.sessions.find((s) => s.dayId === day.id && s.week === week),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const prescriptions = useMemo(
    () => prescribeDay(day, week, state.sessions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [day.id, week],
  )

  const [session, setSession] = useState<SessionLog>(
    () => existing ?? buildDraft(day, week, state.sessions),
  )
  const [openInfo, setOpenInfo] = useState<string | null>(null)

  // Autoguardado: cada cambio se persiste como borrador para no perder
  // nada al cambiar de pestaña o salir. Se omite el primer render (el
  // borrador recién creado y vacío no se guarda hasta que escribas algo).
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    saveSession(session)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const updateSet = (
    exId: string,
    idx: number,
    patch: Partial<LoggedSet>,
  ) => {
    setSession((s) => ({
      ...s,
      exercises: s.exercises.map((e) =>
        e.exerciseId === exId
          ? {
              ...e,
              sets: e.sets.map((st, i) => (i === idx ? { ...st, ...patch } : st)),
            }
          : e,
      ),
    }))
  }

  const addSet = (exId: string) => {
    setSession((s) => ({
      ...s,
      exercises: s.exercises.map((e) => {
        if (e.exerciseId !== exId) return e
        const last = e.sets[e.sets.length - 1]
        return {
          ...e,
          sets: [...e.sets, last ? { ...last, done: false } : { weight: 0, reps: 0, rir: 2, done: false }],
        }
      }),
    }))
  }

  const removeSet = (exId: string, idx: number) => {
    setSession((s) => ({
      ...s,
      exercises: s.exercises.map((e) =>
        e.exerciseId === exId
          ? { ...e, sets: e.sets.filter((_, i) => i !== idx) }
          : e,
      ),
    }))
  }

  const totalSets = session.exercises.reduce((a, e) => a + e.sets.length, 0)
  const doneSets = session.exercises.reduce(
    (a, e) => a + e.sets.filter((s) => s.done).length,
    0,
  )

  const finish = () => {
    saveSession({ ...session, completed: true, date: session.date || todayISO() })
    onBack()
  }

  const saveDraft = () => {
    saveSession({ ...session, completed: false })
    onBack()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-ghost !px-2.5 !py-2">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold truncate">{day.name}</h1>
          <p className="text-xs text-slate-400">
            Semana {week} · {doneSets}/{totalSets} series hechas
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {day.exercises.map((ex) => {
          const p = prescriptions.find((x) => x.exerciseId === ex.id)!
          const le = session.exercises.find((e) => e.exerciseId === ex.id)!
          const unit = ex.timeBased ? 's' : 'reps'
          return (
            <div key={ex.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {ex.optionLabel && (
                      <span className="chip bg-slate-700 text-slate-200 font-semibold">
                        {ex.optionLabel}
                      </span>
                    )}
                    <h3 className="font-bold">{ex.name}</h3>
                    {ex.primary && (
                      <span className="chip bg-brand-500/15 text-brand-300">principal</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <Muscle>{ex.muscle}</Muscle>
                    <Muscle>{ex.equipment}</Muscle>
                    {ex.unilateral && <Muscle>por lado</Muscle>}
                    {ex.emphasis && <Muscle>énfasis {ex.emphasis}</Muscle>}
                  </div>
                  {ex.optionLabel && (
                    <p className="text-[11px] text-amber-300/80 mt-1.5">
                      Haz solo una de las dos opciones y registra únicamente esa.
                    </p>
                  )}
                </div>
                {ex.note && (
                  <button
                    onClick={() => setOpenInfo(openInfo === ex.id ? null : ex.id)}
                    className="btn-ghost !p-2 shrink-0"
                    aria-label="Ver técnica"
                  >
                    <Info size={16} />
                  </button>
                )}
              </div>

              {/* Objetivo de la semana */}
              <div className="mt-3 rounded-xl bg-slate-800/60 border border-slate-700/60 p-3">
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  <span className="font-semibold text-brand-300">
                    {p.sets} × {p.targetReps ?? `${p.repMin}-${p.repMax}`} {unit}
                  </span>
                  <span className="text-slate-400">RIR {p.targetRIR}</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Timer size={13} /> {p.restSec}s
                  </span>
                  {p.suggestedWeight !== undefined && !ex.timeBased && (
                    <span className="chip bg-emerald-500/15 text-emerald-300 font-semibold">
                      {p.suggestedWeight} kg
                    </span>
                  )}
                  <ActionChip action={p.action} />
                  {p.addedSets ? (
                    <span className="chip bg-sky-500/15 text-sky-300">
                      +{p.addedSets} serie{p.addedSets > 1 ? 's' : ''} esta fase
                    </span>
                  ) : null}
                </div>

                {(p.lastTop || p.e1rm) && (
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                    {p.lastTop && (
                      <span>
                        Última vez (S{p.lastTop.week}):{' '}
                        <span className="text-slate-400">
                          {p.lastTop.weight} kg × {p.lastTop.reps} · RIR {p.lastTop.rir}
                        </span>
                      </span>
                    )}
                    {p.e1rm ? (
                      <span>
                        1RM est.: <span className="text-slate-400">{p.e1rm} kg</span>
                      </span>
                    ) : null}
                  </div>
                )}

                {p.alert && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-300 bg-amber-500/10 rounded-lg p-2">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {p.alert}
                  </p>
                )}

                <p className="text-xs text-slate-400 mt-2 leading-relaxed">💡 {p.rationale}</p>
              </div>

              {openInfo === ex.id && ex.note && (
                <p className="mt-2 text-xs text-slate-300 bg-slate-800/40 rounded-lg p-3 leading-relaxed">
                  🎯 {ex.note}
                </p>
              )}

              {/* Filas de series */}
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-[24px_1fr_1fr_1fr_36px] gap-2 text-[11px] uppercase tracking-wide text-slate-500 px-1">
                  <span>#</span>
                  <span>{ex.timeBased ? 'Seg' : 'Kg'}</span>
                  <span>{unit}</span>
                  <span>RIR</span>
                  <span></span>
                </div>
                {le.sets.map((st, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-[24px_1fr_1fr_1fr_36px] gap-2 items-center rounded-lg p-1 ${
                      st.done ? 'bg-emerald-500/10' : ''
                    }`}
                  >
                    <span className="text-center text-sm text-slate-400">{i + 1}</span>
                    {!ex.timeBased ? (
                      <NumInput
                        value={st.weight}
                        step={ex.loadStep || 1}
                        onChange={(v) => updateSet(ex.id, i, { weight: v })}
                      />
                    ) : (
                      <span className="text-center text-slate-600">—</span>
                    )}
                    <NumInput
                      value={st.reps}
                      step={1}
                      onChange={(v) => updateSet(ex.id, i, { reps: v })}
                    />
                    <NumInput
                      value={st.rir}
                      step={1}
                      onChange={(v) => updateSet(ex.id, i, { rir: v })}
                    />
                    <button
                      onClick={() => updateSet(ex.id, i, { done: !st.done })}
                      className={`grid place-items-center h-9 w-9 rounded-lg border transition-colors ${
                        st.done
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-600 text-slate-500 hover:border-slate-400'
                      }`}
                      aria-label="Marcar serie"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-2">
                <button onClick={() => addSet(ex.id)} className="text-xs text-brand-400 font-medium flex items-center gap-1 hover:text-brand-300">
                  <Plus size={14} /> Añadir serie
                </button>
                {le.sets.length > 1 && (
                  <button
                    onClick={() => removeSet(ex.id, le.sets.length - 1)}
                    className="text-xs text-slate-500 font-medium flex items-center gap-1 hover:text-rose-400 ml-auto"
                  >
                    <Trash2 size={14} /> Quitar última
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Extras */}
      <div className="card p-4 space-y-3">
        <div>
          <label className="text-sm font-medium text-slate-300">Peso corporal de hoy (kg)</label>
          <NumInput
            className="mt-1"
            value={session.bodyweight ?? 0}
            step={0.1}
            onChange={(v) => setSession((s) => ({ ...s, bodyweight: v }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-300">Notas de la sesión</label>
          <textarea
            value={session.notes ?? ''}
            onChange={(e) => setSession((s) => ({ ...s, notes: e.target.value }))}
            rows={2}
            placeholder="Sensaciones, molestias, energía…"
            className="mt-1 w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={saveDraft} className="btn-ghost flex-1">
          Guardar borrador
        </button>
        <button onClick={finish} className="btn-primary flex-1">
          <Check size={18} /> Finalizar sesión
        </button>
      </div>

      {existing && (
        <button
          onClick={() => {
            deleteSession(existing.id)
            onBack()
          }}
          className="w-full text-center text-xs text-rose-400/80 hover:text-rose-400 py-2"
        >
          Eliminar esta sesión
        </button>
      )}
    </div>
  )
}

const ACTION_CHIPS: Record<ProgressionAction, { label: string; cls: string }> = {
  'primera-vez': { label: 'calibrar', cls: 'bg-slate-700 text-slate-300' },
  'subir-peso': { label: '↑ sube peso', cls: 'bg-emerald-500/15 text-emerald-300' },
  'sumar-reps': { label: '+ reps', cls: 'bg-sky-500/15 text-sky-300' },
  'ajustar-por-rir': { label: 'carga corta', cls: 'bg-amber-500/15 text-amber-300' },
  'romper-estancamiento': {
    label: 'romper estancamiento',
    cls: 'bg-rose-500/15 text-rose-300',
  },
  descarga: { label: 'descarga', cls: 'bg-violet-500/15 text-violet-300' },
}

function ActionChip({ action }: { action: ProgressionAction }) {
  const a = ACTION_CHIPS[action]
  if (!a) return null
  return <span className={`chip ${a.cls}`}>{a.label}</span>
}

function NumInput({
  value,
  onChange,
  step = 1,
  className = '',
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  className?: string
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={Number.isFinite(value) ? value : 0}
      step={step}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={`w-full text-center rounded-lg bg-slate-800 border border-slate-700 py-2 text-sm outline-none focus:border-brand-500 ${className}`}
    />
  )
}
