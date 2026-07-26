import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Pause, Play, RotateCcw, Timer } from 'lucide-react'

export function PageHeader({
  title,
  subtitle,
  right,
  icon,
}: {
  title: string
  subtitle?: ReactNode
  right?: ReactNode
  icon?: ReactNode
}) {
  return (
    <header className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        {subtitle && <p className="text-sm text-slate-400 truncate">{subtitle}</p>}
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight flex items-center gap-2">
          {icon}
          {title}
        </h1>
      </div>
      {right}
    </header>
  )
}

export function StatCard({
  label,
  value,
  sub,
  accent = 'text-brand-400',
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: string
}) {
  return (
    <div className="card p-3.5">
      <div className="section-label">{label}</div>
      <div className={`mt-1.5 text-2xl font-extrabold nums leading-none ${accent}`}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-slate-400 leading-tight">{sub}</div>}
    </div>
  )
}

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <h2 className="text-base font-bold text-slate-100">{children}</h2>
      {right}
    </div>
  )
}

export function ProgressBar({
  pct,
  className = 'bg-gradient-to-r from-brand-500 to-brand-400',
  height = 'h-2.5',
}: {
  pct: number
  className?: string
  height?: string
}) {
  return (
    <div className={`${height} w-full rounded-full bg-slate-800 overflow-hidden`}>
      <div
        className={`h-full rounded-full origin-left animate-grow-x transition-all duration-500 ${className}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  )
}

/**
 * Barra que sitúa un valor dentro de un rango recomendado. Se usa en la
 * auditoría de volumen: enseña de un vistazo si un músculo se queda corto o
 * se pasa, sin tener que leer los números.
 */
export function RangeBar({
  value,
  min,
  max,
  tone = 'ok',
}: {
  value: number
  min: number
  max: number
  tone?: 'bajo' | 'ok' | 'alto'
}) {
  const scale = Math.max(max * 1.15, value)
  const pct = (n: number) => `${Math.min(100, (n / scale) * 100)}%`
  const TONES = {
    bajo: 'bg-rose-400',
    ok: 'bg-emerald-400',
    alto: 'bg-amber-400',
  }
  return (
    <div className="relative h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
      {/* Zona recomendada */}
      <div
        className="absolute inset-y-0 bg-slate-700/70"
        style={{ left: pct(min), width: `calc(${pct(max)} - ${pct(min)})` }}
      />
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${TONES[tone]}`}
        style={{ width: pct(value) }}
      />
    </div>
  )
}

/** Anillo de progreso compacto (series hechas de un ejercicio) */
export function ProgressRing({
  done,
  total,
  size = 34,
}: {
  done: number
  total: number
  size?: number
}) {
  const r = (size - 5) / 2
  const c = 2 * Math.PI * r
  const pct = total > 0 ? done / total : 0
  const complete = total > 0 && done >= total
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={3.5} className="stroke-slate-800" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={3.5}
          fill="none"
          strokeLinecap="round"
          className={complete ? 'stroke-emerald-400' : 'stroke-brand-400'}
          style={{
            strokeDasharray: c,
            strokeDashoffset: c * (1 - pct),
            transition: 'stroke-dashoffset 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </svg>
      <span
        className={`absolute inset-0 grid place-items-center text-[10px] font-bold nums ${
          complete ? 'text-emerald-400' : 'text-slate-400'
        }`}
      >
        {done}/{total}
      </span>
    </div>
  )
}

const PHASE_STYLES: Record<string, string> = {
  Acumulación: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Intensificación: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Pico: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  Descarga: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
}

export function PhaseBadge({ phase }: { phase: string }) {
  return (
    <span
      className={`chip border ${PHASE_STYLES[phase] ?? 'bg-slate-700/40 text-slate-300 border-slate-600'}`}
    >
      {phase}
    </span>
  )
}

export function Muscle({ children }: { children: ReactNode }) {
  return <span className="chip bg-slate-800 text-slate-300">{children}</span>
}

export function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card p-8 text-center">
      <div className="text-slate-200 font-semibold">{title}</div>
      <div className="mt-1 text-sm text-slate-400">{desc}</div>
    </div>
  )
}

/**
 * Temporizador de descanso flotante. Con descansos de 2-3 min en el péndulo y
 * el curl femoral, mirar el reloj del móvil a ojo es la vía rápida a acortar
 * los descansos sin darte cuenta, y eso te cuesta repeticiones en la serie
 * siguiente. Arranca solo al marcar una serie como hecha.
 */
export function RestTimer({
  seconds,
  label,
  onClose,
}: {
  seconds: number
  label: string
  onClose: () => void
}) {
  const [left, setLeft] = useState(seconds)
  const [running, setRunning] = useState(true)
  const beeped = useRef(false)

  useEffect(() => {
    setLeft(seconds)
    setRunning(true)
    beeped.current = false
  }, [seconds, label])

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setLeft((v) => (v > 0 ? v - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [running])

  useEffect(() => {
    if (left === 0 && !beeped.current) {
      beeped.current = true
      // Vibración corta si el dispositivo la soporta
      navigator.vibrate?.([120, 80, 120])
    }
  }, [left])

  const mm = Math.floor(left / 60)
  const ss = String(left % 60).padStart(2, '0')
  const pct = seconds > 0 ? ((seconds - left) / seconds) * 100 : 100
  const done = left === 0

  // Se monta directamente en <body> con un portal. Si se renderizara dentro del
  // árbol de la vista, cualquier ancestro con transform, filter o backdrop-blur
  // lo convertiría en su bloque contenedor y el `position: fixed` dejaría de
  // referirse a la pantalla: el temporizador acababa a 3000 px de scroll.
  return createPortal(
    <div
      className="fixed inset-x-0 z-40 px-4 animate-fade-up"
      style={{ bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
    >
      <div
        className={`max-w-2xl mx-auto card p-3 border ${
          done ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/95'
        } backdrop-blur-xl`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`grid place-items-center h-9 w-9 rounded-xl shrink-0 ${
              done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-brand-500/15 text-brand-300 animate-pulse-ring'
            }`}
          >
            <Timer size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className={`text-xl font-extrabold nums ${done ? 'text-emerald-300' : ''}`}>
                {mm}:{ss}
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                {done ? '¡A por la siguiente serie!' : label}
              </span>
            </div>
            <div className="mt-1.5">
              <ProgressBar
                pct={pct}
                height="h-1"
                className={done ? 'bg-emerald-400' : 'bg-brand-400'}
              />
            </div>
          </div>
          <button
            onClick={() => setRunning((r) => !r)}
            className="btn-ghost !px-2.5 !py-2 shrink-0"
            aria-label={running ? 'Pausar' : 'Reanudar'}
          >
            {running ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button
            onClick={() => {
              setLeft(seconds)
              setRunning(true)
              beeped.current = false
            }}
            className="btn-ghost !px-2.5 !py-2 shrink-0"
            aria-label="Reiniciar"
          >
            <RotateCcw size={15} />
          </button>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 px-1 shrink-0 text-lg leading-none"
            aria-label="Cerrar temporizador"
          >
            ✕
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
