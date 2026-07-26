import { useRef, useState } from 'react'
import { Download, Upload, RotateCcw, Save, Info } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { WORKOUT_DAYS, WEEK_SCHEDULE } from '../data/program'
import { PageHeader, SectionTitle } from '../components/ui'

export default function Perfil() {
  const { state, updateProfile, logBodyweight, exportJSON, importJSON, resetAll } = useApp()
  const [p, setP] = useState(state.profile)
  const [saved, setSaved] = useState(false)
  const [newWeight, setNewWeight] = useState(state.profile.weightKg)
  const fileRef = useRef<HTMLInputElement>(null)

  const save = () => {
    updateProfile(p)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const doExport = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `entreno-santiago-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const doImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const ok = importJSON(String(reader.result))
      alert(ok ? 'Datos importados correctamente.' : 'El archivo no es válido.')
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Perfil" subtitle={state.profile.name} />

      {/* Datos */}
      <div className="card p-4 space-y-3">
        <SectionTitle>Tus datos</SectionTitle>
        <Row label="Nombre">
          <TextInput value={p.name} onChange={(v) => setP({ ...p, name: v })} />
        </Row>
        <div className="grid grid-cols-2 gap-3">
          <Row label="Edad">
            <NumInput value={p.age} onChange={(v) => setP({ ...p, age: v })} />
          </Row>
          <Row label="Altura (cm)">
            <NumInput value={p.heightCm} onChange={(v) => setP({ ...p, heightCm: v })} />
          </Row>
          <Row label="Peso (kg)">
            <NumInput value={p.weightKg} step={0.1} onChange={(v) => setP({ ...p, weightKg: v })} />
          </Row>
          <Row label="Grasa (%)">
            <NumInput value={p.bodyFatPct} step={0.5} onChange={(v) => setP({ ...p, bodyFatPct: v })} />
          </Row>
          <Row label="Nivel">
            <TextInput value={p.level} onChange={(v) => setP({ ...p, level: v })} />
          </Row>
          <Row label="Meta peso (kg)">
            <NumInput value={p.goalWeightKg} step={0.1} onChange={(v) => setP({ ...p, goalWeightKg: v })} />
          </Row>
        </div>
        <button onClick={save} className="btn-primary w-full">
          <Save size={18} /> {saved ? 'Guardado ✓' : 'Guardar datos'}
        </button>
      </div>

      {/* Registro rápido de peso */}
      <div className="card p-4">
        <SectionTitle>Registrar peso de hoy</SectionTitle>
        <div className="flex gap-3">
          <NumInput value={newWeight} step={0.1} onChange={setNewWeight} />
          <button
            onClick={() => logBodyweight(newWeight)}
            className="btn-ghost whitespace-nowrap"
          >
            Añadir
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Se añade a la gráfica de peso en la pestaña Progreso.
        </p>
      </div>

      {/* Info del programa */}
      <div className="card p-4">
        <SectionTitle>Tu programa</SectionTitle>
        <div className="flex items-start gap-2 text-sm text-slate-300 bg-slate-800/50 rounded-xl p-3">
          <Info size={16} className="text-brand-400 shrink-0 mt-0.5" />
          <span>
            Bloque de {state.blockLengthWeeks} semanas · {WORKOUT_DAYS.length} días de fuerza +
            fútbol (viernes) + 2 salidas de running. Prioridad nº1 la pierna: cuádriceps e isquios
            2x/semana. Las salidas de running caen en días de tren superior para no robarle
            recuperación a las piernas.
          </span>
        </div>
        <ul className="mt-3 space-y-2.5">
          {WEEK_SCHEDULE.map((s) => (
            <li key={s.day} className="text-sm">
              <div className="flex items-start gap-3">
                <span className="text-slate-400 w-20 shrink-0">{s.day}</span>
                <span className="text-slate-100">{s.activity}</span>
              </div>
              {s.note && (
                <p className="text-xs text-slate-500 mt-0.5 ml-[5.75rem] leading-relaxed">
                  {s.note}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Gestión de datos */}
      <div className="card p-4">
        <SectionTitle>Copia de seguridad</SectionTitle>
        <p className="text-xs text-slate-400 mb-3">
          Tus datos viven solo en este navegador. Exporta un respaldo de vez en cuando para no
          perderlos.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={doExport} className="btn-ghost">
            <Download size={16} /> Exportar
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn-ghost">
            <Upload size={16} /> Importar
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) doImport(f)
            e.target.value = ''
          }}
        />
        <button
          onClick={() => {
            if (confirm('¿Seguro? Se borrarán todas tus sesiones, salidas y ajustes.')) resetAll()
          }}
          className="btn w-full mt-3 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 px-4 py-2.5"
        >
          <RotateCcw size={16} /> Reiniciar todos los datos
        </button>
      </div>

      <p className="text-center text-xs text-slate-600">Entreno · Santiago Tavera · v1.0</p>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="section-label">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input"
    />
  )
}

function NumInput({
  value,
  onChange,
  step = 1,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
}) {
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
