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
import { AlertTriangle, Minus, TrendingDown, TrendingUp, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { WORKOUT_DAYS, findDay } from '../data/program'
import { blockOf, estimated1RM, exerciseVolume, hasEvidence } from '../lib/progression'
import { buildAudit, type MuscleAudit, type SlotAudit } from '../lib/audit'
import { shortDate } from '../lib/format'
import { EmptyState, PageHeader, ProgressBar, SectionTitle } from '../components/ui'

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
  const audit = useMemo(() => buildAudit(state), [state])

  // Se agrupa por BLOQUE y semana. Agrupando solo por semana, al empezar el
  // bloque 2 la semana 1 nueva se sumaba encima de la semana 1 vieja y la
  // gráfica mostraba un pico que nunca existió.
  const volumeByWeek = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of state.sessions) {
      if (!hasEvidence(s)) continue
      const vol = s.exercises.reduce((a, e) => a + exerciseVolume(e), 0)
      const key = `${blockOf(s)}-${String(s.week).padStart(2, '0')}`
      map.set(key, (map.get(key) ?? 0) + vol)
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, vol]) => {
        const [b, w] = key.split('-')
        return { semana: `B${b}S${Number(w)}`, volumen: Math.round(vol) }
      })
  }, [state.sessions])

  /**
   * Opciones del selector de fuerza.
   *
   * Una entrada por HUECO y VARIANTE, no por nombre de ejercicio. Dos motivos:
   *  · Las laterales aparecen en tres días con el mismo nombre; antes salían
   *    tres opciones idénticas en el desplegable y no se sabía cuál era cuál.
   *  · Si un día sustituiste la polea por barra recta, esos kilos no son
   *    comparables. Meterlos en la misma línea del gráfico dibujaría una
   *    caída de fuerza que no ha existido.
   */
  const series = useMemo(() => {
    const out = new Map<string, string>()
    for (const d of WORKOUT_DAYS) {
      const dayLabel = d.name.split('·')[0].trim()
      for (const e of d.exercises) {
        out.set(`${e.id}::`, `${e.name} · ${dayLabel}`)
      }
    }
    for (const s of state.sessions) {
      const dayLabel = findDay(s.dayId)?.name.split('·')[0].trim() ?? 'Otro'
      for (const le of s.exercises) {
        if (!le.swap) continue
        out.set(`${le.exerciseId}::${le.swap.id}`, `${le.swap.name} · ${dayLabel}`)
      }
    }
    return [...out.entries()].map(([key, label]) => ({ key, label }))
  }, [state.sessions])

  const [seriesKey, setSeriesKey] = useState(series[0]?.key ?? '')

  // Progresión del hueco+variante seleccionados (1RM estimado y peso top)
  const exData = useMemo(() => {
    const [exId, swapId = ''] = seriesKey.split('::')
    const points: { date: string; e1rm: number; top: number }[] = []
    const sessions = [...state.sessions]
      .filter(hasEvidence)
      .sort((a, b) => a.date.localeCompare(b.date) || a.week - b.week)
    for (const s of sessions) {
      const le = s.exercises.find(
        (e) => e.exerciseId === exId && (e.swap?.id ?? '') === swapId,
      )
      if (!le) continue
      const working = le.sets.filter((st) => st.done && st.weight > 0 && st.reps > 0)
      if (working.length === 0) continue
      const top = Math.max(...working.map((w) => w.weight))
      const best = Math.max(...working.map((w) => estimated1RM(w.weight, w.reps)))
      points.push({ date: `B${blockOf(s)}S${s.week}`, e1rm: Math.round(best), top })
    }
    return points
  }, [state.sessions, seriesKey])

  const completedSessions = [...state.sessions]
    .filter(hasEvidence)
    .sort((a, b) => b.date.localeCompare(a.date) || b.week - a.week)

  const hasData = completedSessions.length > 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="Progreso"
        subtitle={`${completedSessions.length} entrenos registrados`}
      />

      {/* Informe de todo el historial */}
      <AuditCard audit={audit} />

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
          value={seriesKey}
          onChange={(e) => setSeriesKey(e.target.value)}
          className="input mb-3"
        >
          {series.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
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
              // Qué ejercicios sustituiste ese día: sin esto, al mirar atrás no
              // hay forma de saber que el antebrazo se hizo con barra recta.
              const swapped = s.exercises.filter(
                (e) => e.swap && e.sets.some((st) => st.done),
              )
              return (
                <div key={s.id} className="card p-3 flex items-center gap-3">
                  <span className="h-9 w-1.5 rounded-full shrink-0" style={{ background: day?.color ?? '#64748b' }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{day?.name ?? 'Sesión'}</div>
                    <div className="text-xs text-slate-400">
                      B{blockOf(s)} · Semana {s.week} · {shortDate(s.date)} · {setsDone} series ·{' '}
                      {vol.toLocaleString('es-ES')} kg
                      {!s.completed && (
                        <span className="text-sky-300/80"> · borrador (cuenta igual)</span>
                      )}
                    </div>
                    {swapped.length > 0 && (
                      <div className="text-xs text-violet-300/80 mt-0.5 truncate">
                        🔄 {swapped.map((e) => e.swap!.name).join(' · ')}
                      </div>
                    )}
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


/**
 * Informe de TODO el historial.
 *
 * Responde a la pregunta que la app no sabía contestar: "¿esto ha funcionado?".
 * No es una gráfica más: es el diagnóstico, con los tres cortes que importan
 * al decidir cómo sigue el bloque siguiente.
 *
 *  · Qué ejercicios llevan semanas sin mover la carga (y cuántas).
 *  · Qué músculos reciben menos series de las que el programa planifica, que es
 *    la definición operativa de "músculo descuidado": no es que falte en el
 *    papel, es que en la práctica no llega.
 *  · Cuántos entrenos hay sin finalizar, porque antes esos no contaban para
 *    nada y ahora sí.
 */
function AuditCard({ audit }: { audit: ReturnType<typeof buildAudit> }) {
  const [tab, setTab] = useState<'meseta' | 'musculos' | 'progreso'>('meseta')

  if (audit.sessionsWithEvidence === 0) {
    return (
      <div className="card p-4">
        <SectionTitle>Informe del bloque</SectionTitle>
        <p className="text-sm text-slate-400 leading-relaxed">
          Todavía no hay entrenos registrados. En cuanto apuntes series con kg y reps, aquí verás
          qué ejercicios progresan, cuáles llevan semanas clavados y qué músculos reciben menos
          trabajo del que el programa planifica.
        </p>
      </div>
    )
  }

  const TABS = [
    { id: 'meseta' as const, label: `Mesetas (${audit.stalled.length})` },
    { id: 'musculos' as const, label: `Músculos (${audit.neglected.length})` },
    { id: 'progreso' as const, label: `Progresan (${audit.bestProgress.length})` },
  ]

  return (
    <div className="card p-4">
      <SectionTitle
        right={
          <span className="text-[11px] text-slate-500 nums">
            {audit.sessionsWithEvidence} entrenos · S
            {audit.weeksCovered[0]}-{audit.weeksCovered[audit.weeksCovered.length - 1]}
          </span>
        }
      >
        Informe del bloque
      </SectionTitle>

      <p className="text-sm text-slate-300 leading-relaxed">{audit.headline}</p>

      {audit.unfinishedWithData > 0 && (
        <p className="mt-2.5 flex items-start gap-1.5 text-[11px] text-sky-300/90 bg-sky-500/10 border border-sky-500/20 rounded-xl p-2.5 leading-relaxed">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>
            {audit.unfinishedWithData} de tus {audit.sessionsWithEvidence} entrenos están sin
            finalizar. Ya <span className="font-semibold">sí cuentan</span> para las cargas y el
            volumen: el criterio ahora es que haya series marcadas, no que hayas pulsado
            Finalizar. Antes eran invisibles y es una de las razones por las que la app te
            repetía el mismo peso.
          </span>
        </p>
      )}

      <div className="flex gap-1 p-1 mt-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-all active:scale-95 ${
              tab === t.id
                ? 'bg-brand-600 text-white shadow-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {tab === 'meseta' &&
          (audit.stalled.length === 0 ? (
            <p className="text-sm text-slate-400">
              Ningún ejercicio en meseta: todos han movido carga o tienen tendencia positiva.
            </p>
          ) : (
            <>
              {audit.stalled.slice(0, 12).map((s) => (
                <SlotRow key={s.key} slot={s} />
              ))}
              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                Ordenados por sesiones seguidas con el mismo peso. A partir de 3, el motor fuerza
                una subida de un escalón por su cuenta en lugar de esperar a que toques el techo
                del rango.
              </p>
            </>
          ))}

        {tab === 'musculos' &&
          (audit.neglected.length === 0 ? (
            <p className="text-sm text-slate-400">
              Todos los músculos reciben al menos el 80% de las series planificadas.
            </p>
          ) : (
            <>
              {audit.neglected.map((m) => (
                <MuscleRow key={m.muscle} row={m} />
              ))}
              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                Series por semana que has hecho de verdad frente a las que el programa planifica.
                Un músculo puede estar perfectamente programado y aun así quedarse corto si sus
                ejercicios van siempre al final del entreno.
              </p>
            </>
          ))}

        {tab === 'progreso' &&
          (audit.bestProgress.length === 0 ? (
            <p className="text-sm text-slate-400">
              Aún no hay suficientes sesiones por ejercicio para confirmar una tendencia (hacen
              falta 3).
            </p>
          ) : (
            audit.bestProgress.slice(0, 12).map((s) => <SlotRow key={s.key} slot={s} />)
          ))}
      </div>
    </div>
  )
}

const SLOT_ICON = {
  progresa: <TrendingUp size={13} className="text-emerald-400 shrink-0" />,
  plano: <Minus size={13} className="text-amber-400 shrink-0" />,
  retrocede: <TrendingDown size={13} className="text-rose-400 shrink-0" />,
  'pocos-datos': <Minus size={13} className="text-slate-500 shrink-0" />,
}

function SlotRow({ slot }: { slot: SlotAudit }) {
  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-2.5">
      <div className="flex items-center gap-2">
        {SLOT_ICON[slot.status]}
        <span className="flex-1 min-w-0 truncate text-xs font-semibold text-slate-200">
          {slot.name}
        </span>
        <span className="chip bg-slate-700/60 text-slate-400 shrink-0">{slot.dayName}</span>
      </div>
      <div className="mt-1.5 ml-[21px] text-[11px] text-slate-400 nums leading-relaxed">
        {slot.sessions} sesiones · {slot.firstWeight} → {slot.lastWeight} kg
        {slot.deltaKg !== 0 && (
          <span className={slot.deltaKg > 0 ? 'text-emerald-300' : 'text-rose-300'}>
            {' '}
            ({slot.deltaKg > 0 ? '+' : ''}
            {slot.deltaKg} kg)
          </span>
        )}
        {' · 1RM est. '}
        {slot.e1rmFirst} → {slot.e1rmLast}
        <span className={slot.e1rmDeltaPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
          {' '}
          ({slot.e1rmDeltaPct > 0 ? '+' : ''}
          {slot.e1rmDeltaPct}%)
        </span>
      </div>
      {slot.sessionsAtSameLoad >= 2 && (
        <div className="mt-1 ml-[21px] text-[11px] text-amber-300/90">
          {slot.sessionsAtSameLoad} sesiones seguidas con {slot.lastWeight} kg
          {slot.rangeWidth >= 5 &&
            ` · rango ${slot.repMin}-${slot.repMax} (${slot.rangeWidth} reps de amplitud)`}
        </div>
      )}
    </div>
  )
}

function MuscleRow({ row }: { row: MuscleAudit }) {
  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-2.5">
      <div className="flex items-center gap-2 text-xs">
        <span className="flex-1 min-w-0 truncate font-semibold text-slate-200">{row.muscle}</span>
        <span className="nums text-slate-400">
          <span className="text-amber-300 font-bold">{row.setsPerWeek}</span> / {row.plannedPerWeek}{' '}
          series/sem
        </span>
      </div>
      <div className="mt-1.5">
        <ProgressBar pct={row.adherencePct} height="h-1.5" className="bg-amber-400" />
      </div>
      <div className="mt-1 text-[11px] text-slate-500 nums">
        {row.adherencePct}% de lo planificado · {row.weeksTrained} semanas entrenado ·{' '}
        {row.setsDone} series en total
        {row.stalledSlots > 0 && ` · ${row.stalledSlots} ejercicios en meseta`}
      </div>
    </div>
  )
}
