import type { ReactNode } from 'react'

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
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-extrabold ${accent}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
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
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-bold text-slate-100">{children}</h2>
      {right}
    </div>
  )
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
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
  return (
    <span className="chip bg-slate-800 text-slate-300">{children}</span>
  )
}

export function EmptyState({
  title,
  desc,
}: {
  title: string
  desc: string
}) {
  return (
    <div className="card p-8 text-center">
      <div className="text-slate-200 font-semibold">{title}</div>
      <div className="mt-1 text-sm text-slate-400">{desc}</div>
    </div>
  )
}
