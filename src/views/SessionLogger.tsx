import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Info,
  Minus,
  Plus,
  Timer,
} from 'lucide-react'
import type {
  ExercisePrescription,
  LoggedExercise,
  LoggedSet,
  ProgressionAction,
  SessionLog,
  WorkoutDayTemplate,
} from '../types'
import { useApp } from '../context/AppContext'
import { prescribeDay } from '../lib/progression'
import { todayISO, uid } from '../lib/format'
import { Muscle, ProgressBar, ProgressRing, RestTimer } from '../components/ui'

function blankSets(p: ExercisePrescription): LoggedSet[] {
  return Array.from({ length: p.sets }).map(() => ({
    weight: p.suggestedWeight ?? 0,
    reps: 0,
    rir: p.targetRIR,
    done: false,
  }))
}

function buildDraft(
  day: WorkoutDayTemplate,
  week: number,
  sessions: SessionLog[],
): SessionLog {
  const prescriptions = prescribeDay(day, week, sessions)
  return {
    id: uid('sess-'),
    dayId: day.id,
    week,
    date: todayISO(),
    exercises: day.exercises.map((ex) => ({
      exerciseId: ex.id,
      sets: blankSets(prescriptions.find((x) => x.exerciseId === ex.id)!),
    })),
    completed: false,
  }
}

/**
 * Alinea una sesión ya guardada con la plantilla actual del día.
 *
 * Hace falta porque el programa evoluciona: al rediseñar la pierna se añadieron
 * ejercicios (la opción de hack, la prensa a dos piernas) y se movió el curl
 * femoral tumbado de día. Una sesión guardada antes de ese cambio no tiene
 * entrada para los ejercicios nuevos, y sin este ajuste la pantalla petaba al
 * abrirla. Los ejercicios registrados que ya no están en la plantilla se
 * conservan al final para no perder historial.
 */
function reconcile(
  stored: SessionLog,
  day: WorkoutDayTemplate,
  prescriptions: ExercisePrescription[],
): SessionLog {
  const fromTemplate: LoggedExercise[] = day.exercises.map((ex) => {
    const found = stored.exercises.find((e) => e.exerciseId === ex.id)
    if (found && found.sets.length > 0) return found
    return {
      exerciseId: ex.id,
      sets: blankSets(prescriptions.find((x) => x.exerciseId === ex.id)!),
    }
  })

  const orphans = stored.exercises.filter(
    (e) => !day.exercises.some((ex) => ex.id === e.exerciseId),
  )

  return { ...stored, exercises: [...fromTemplate, ...orphans] }
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

  const [session, setSession] = useState<SessionLog>(() =>
    existing
      ? reconcile(existing, day, prescriptions)
      : buildDraft(day, week, state.sessions),
  )
  const [openInfo, setOpenInfo] = useState<string | null>(null)
  const [rest, setRest] = useState<{ seconds: number; label: string; key: number } | null>(null)

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

  const updateSet = (exId: string, idx: number, patch: Partial<LoggedSet>) => {
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

  /** Marcar/desmarcar serie. Al marcarla, arranca el descanso automáticamente. */
  const toggleDone = (exId: string, idx: number) => {
    const ex = day.exercises.find((e) => e.id === exId)
    const le = session.exercises.find((e) => e.exerciseId === exId)
    if (!ex || !le) return
    const nowDone = !le.sets[idx].done
    updateSet(exId, idx, { done: nowDone })

    const isLast = idx === le.sets.length - 1
    if (nowDone && !isLast && ex.restSec > 0) {
      setRest({ seconds: ex.restSec, label: `Descanso · ${ex.name}`, key: Date.now() })
    }
  }

  const addSet = (exId: string) => {
    setSession((s) => ({
      ...s,
      exercises: s.exercises.map((e) => {
        if (e.exerciseId !== exId) return e
        const last = e.sets[e.sets.length - 1]
        return {
          ...e,
          sets: [
            ...e.sets,
            last ? { ...last, done: false } : { weight: 0, reps: 0, rir: 2, done: false },
          ],
        }
      }),
    }))
  }

  const removeSet = (exId: string, idx: number) => {
    setSession((s) => ({
      ...s,
      exercises: s.exercises.map((e) =>
        e.exerciseId === exId ? { ...e, sets: e.sets.filter((_, i) => i !== idx) } : e,
      ),
    }))
  }

  /**
   * Cada "hueco" del día es un ejercicio, salvo los pares de alternativas
   * (péndulo / hack), donde el hueco ofrece dos opciones y solo se hace una.
   */
  const slots = useMemo(
    () =>
      day.exercises
        .filter((ex) => !ex.alternativeOf)
        .map((ex) => ({
          id: ex.id,
          options: [ex, ...day.exercises.filter((o) => o.alternativeOf === ex.id)],
        })),
    [day],
  )

  // Opción elegida en cada hueco: la que ya tenga series registradas, o la primera
  const [variant, setVariant] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const ex of day.exercises) {
      if (!ex.alternativeOf) continue
      const le = session.exercises.find((e) => e.exerciseId === ex.id)
      if (le?.sets.some((s) => s.done || s.reps > 0)) init[ex.alternativeOf] = ex.id
    }
    return init
  })

  const chosen = slots.map((s) => variant[s.id] ?? s.options[0].id)

  // Los totales cuentan solo la opción elegida: si sumáramos las dos, el día
  // aparentaría más series de las que se hacen de verdad.
  const chosenLogs = session.exercises.filter((e) => chosen.includes(e.exerciseId))
  const totalSets = chosenLogs.reduce((a, e) => a + e.sets.length, 0)
  const doneSets = chosenLogs.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)
  const pct = totalSets > 0 ? (doneSets / totalSets) * 100 : 0
  const volume = chosenLogs.reduce(
    (a, e) => a + e.sets.reduce((b, s) => b + (s.done ? s.weight * s.reps : 0), 0),
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
      {/* Cabecera fija con el progreso de la sesión */}
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-1 pb-3 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/70">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="btn-ghost !px-2.5 !py-2 shrink-0" aria-label="Volver">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-extrabold truncate leading-tight">{day.name}</h1>
            <p className="text-[11px] text-slate-400 nums">
              Semana {week} · {doneSets}/{totalSets} series
              {volume > 0 && ` · ${Math.round(volume).toLocaleString('es-ES')} kg`}
            </p>
          </div>
          <span className="text-lg font-extrabold nums text-brand-300 shrink-0">
            {Math.round(pct)}%
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar
            pct={pct}
            height="h-1.5"
            className={pct === 100 ? 'bg-emerald-400' : 'bg-gradient-to-r from-brand-500 to-brand-400'}
          />
        </div>
      </div>

      <div className="space-y-3">
        {slots.map((slot, si) => {
          const ex = slot.options.find((o) => o.id === chosen[si]) ?? slot.options[0]
          const p = prescriptions.find((x) => x.exerciseId === ex.id)
          const le = session.exercises.find((e) => e.exerciseId === ex.id)
          // Cinturón de seguridad: si el programa cambia y falta algo, se omite
          // ese ejercicio en lugar de tumbar toda la pantalla.
          if (!p || !le) return null
          const unit = ex.timeBased ? 's' : 'reps'
          const exDone = le.sets.filter((s) => s.done).length
          const complete = exDone >= le.sets.length

          return (
            <div
              key={ex.id}
              className={`card p-4 transition-colors ${
                complete ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : ''
              }`}
              data-exercise={ex.id}
            >
              <div className="flex items-start gap-3">
                <ProgressRing done={exDone} total={le.sets.length} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold leading-tight">{ex.name}</h3>
                    {ex.primary && (
                      <span className="chip bg-brand-500/15 text-brand-300">principal</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Muscle>{ex.muscle}</Muscle>
                    <Muscle>{ex.equipment}</Muscle>
                    {ex.unilateral && <Muscle>por lado</Muscle>}
                    {ex.emphasis && <Muscle>énfasis {ex.emphasis}</Muscle>}
                  </div>
                </div>

                {ex.note && (
                  <button
                    onClick={() => setOpenInfo(openInfo === ex.id ? null : ex.id)}
                    className={`btn-ghost !p-2 shrink-0 ${
                      openInfo === ex.id ? '!bg-brand-500/20 !text-brand-300' : ''
                    }`}
                    aria-label="Ver técnica"
                  >
                    <Info size={16} />
                  </button>
                )}
              </div>

              {/* Selector de máquina cuando el hueco admite dos opciones */}
              {slot.options.length > 1 && (
                <div className="mt-3">
                  <div className="flex gap-1 p-1 rounded-xl bg-slate-800/70 border border-slate-700/60">
                    {slot.options.map((o) => {
                      const active = o.id === ex.id
                      return (
                        <button
                          key={o.id}
                          onClick={() => setVariant((v) => ({ ...v, [slot.id]: o.id }))}
                          className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-all active:scale-95 ${
                            active
                              ? 'bg-brand-600 text-white shadow-glow'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {o.name.replace('Sentadilla ', '')}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Elige la máquina que uses hoy: haces una de las dos, nunca las dos. Cada una
                    lleva su propio historial de cargas.
                  </p>
                </div>
              )}

              {openInfo === ex.id && ex.note && (
                <p className="mt-3 text-xs text-slate-300 bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 leading-relaxed animate-fade-in">
                  🎯 {ex.note}
                </p>
              )}

              {/* Objetivo de la semana */}
              <div className="mt-3 rounded-xl bg-slate-800/50 border border-slate-700/60 overflow-hidden">
                <div className="p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.suggestedWeight !== undefined && !ex.timeBased && (
                      <span className="text-xl font-extrabold nums text-emerald-300">
                        {p.suggestedWeight}
                        <span className="text-xs font-bold text-emerald-400/70"> kg</span>
                      </span>
                    )}
                    <span className="text-xl font-extrabold nums text-brand-300">
                      {p.sets}
                      <span className="text-xs font-bold text-brand-400/70">×</span>
                      {p.targetReps ?? `${p.repMin}-${p.repMax}`}
                      <span className="text-xs font-bold text-brand-400/70"> {unit}</span>
                    </span>
                    <span className="chip bg-slate-700/70 text-slate-300">RIR {p.targetRIR}</span>
                    <span className="chip bg-slate-700/70 text-slate-300">
                      <Timer size={11} /> {p.restSec}s
                    </span>
                    <ActionChip action={p.action} />
                    {p.addedSets ? (
                      <span className="chip bg-sky-500/15 text-sky-300">
                        +{p.addedSets} serie{p.addedSets > 1 ? 's' : ''}
                      </span>
                    ) : null}
                  </div>

                  {(p.lastTop || p.e1rm) && (
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 flex-wrap nums">
                      {p.lastTop && (
                        <span>
                          S{p.lastTop.week}:{' '}
                          <span className="text-slate-400">
                            {p.lastTop.weight} kg × {p.lastTop.reps} · RIR {p.lastTop.rir}
                          </span>
                        </span>
                      )}
                      {p.e1rm ? (
                        <span>
                          1RM est. <span className="text-slate-400">{p.e1rm} kg</span>
                        </span>
                      ) : null}
                    </div>
                  )}

                  {p.alert && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                      <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {p.alert}
                    </p>
                  )}
                </div>

                <Why text={p.rationale} />
              </div>

              {/* Filas de series */}
              <div className="mt-3 space-y-1.5">
                <div className="grid grid-cols-[22px_1fr_1fr_1fr_44px] gap-2 section-label px-1">
                  <span>#</span>
                  <span className="text-center">
                    {ex.timeBased ? 'seg' : ex.equipment === 'Peso corporal' ? 'lastre' : 'kg'}
                  </span>
                  <span className="text-center">{unit}</span>
                  <span className="text-center">RIR</span>
                  <span />
                </div>

                {le.sets.map((st, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-[22px_1fr_1fr_1fr_44px] gap-2 items-center rounded-xl py-1 px-1 transition-colors ${
                      st.done ? 'bg-emerald-500/10' : ''
                    }`}
                  >
                    <span
                      className={`text-center text-xs font-bold nums ${
                        st.done ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      {i + 1}
                    </span>
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
                      onClick={() => toggleDone(ex.id, i)}
                      className={`grid place-items-center h-10 w-11 rounded-xl border transition-all active:scale-90 ${
                        st.done
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_16px_-4px_rgb(16_185_129/0.7)]'
                          : 'border-slate-600 text-slate-500 hover:border-slate-400 hover:text-slate-300'
                      }`}
                      aria-label={st.done ? 'Desmarcar serie' : 'Marcar serie como hecha'}
                    >
                      <Check size={17} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-2.5">
                <button
                  onClick={() => addSet(ex.id)}
                  className="chip bg-slate-800 text-brand-300 hover:bg-slate-700 !py-1.5 !px-2.5 transition-colors active:scale-95"
                >
                  <Plus size={13} /> Serie
                </button>
                {le.sets.length > 1 && (
                  <button
                    onClick={() => removeSet(ex.id, le.sets.length - 1)}
                    className="chip bg-slate-800/60 text-slate-500 hover:text-rose-300 !py-1.5 !px-2.5 transition-colors active:scale-95 ml-auto"
                  >
                    <Minus size={13} /> Quitar última
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
          <label className="section-label">Peso corporal de hoy (kg)</label>
          <NumInput
            className="mt-1.5 !text-left !px-3"
            value={session.bodyweight ?? 0}
            step={0.1}
            onChange={(v) => setSession((s) => ({ ...s, bodyweight: v }))}
          />
        </div>
        <div>
          <label className="section-label">Notas de la sesión</label>
          <textarea
            value={session.notes ?? ''}
            onChange={(e) => setSession((s) => ({ ...s, notes: e.target.value }))}
            rows={2}
            placeholder="Sensaciones, molestias, energía…"
            className="input mt-1.5 resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={saveDraft} className="btn-ghost flex-1">
          Guardar borrador
        </button>
        <button onClick={finish} className="btn-primary flex-1">
          <Check size={18} /> Finalizar
        </button>
      </div>

      {existing && (
        <button
          onClick={() => {
            if (confirm('¿Eliminar esta sesión? No se puede deshacer.')) {
              deleteSession(existing.id)
              onBack()
            }
          }}
          className="w-full text-center text-xs text-rose-400/80 hover:text-rose-400 py-2"
        >
          Eliminar esta sesión
        </button>
      )}

      {rest && (
        <RestTimer
          key={rest.key}
          seconds={rest.seconds}
          label={rest.label}
          onClose={() => setRest(null)}
        />
      )}
    </div>
  )
}

/** Explicación de la decisión del motor, plegable para no saturar la pantalla */
function Why({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-slate-700/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
        {open ? 'Ocultar el porqué' : '¿Por qué este peso?'}
      </button>
      {open && (
        <p className="px-3 pb-3 text-xs text-slate-400 leading-relaxed animate-fade-in">{text}</p>
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
      className={`w-full text-center rounded-xl bg-slate-800/80 border border-slate-700 py-2.5 text-sm font-semibold nums outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 ${className}`}
    />
  )
}
