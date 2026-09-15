import { useRef, useState } from 'react'
import {
  ClipboardCopy,
  Download,
  FileText,
  FlagTriangleRight,
  Upload,
  RotateCcw,
  Save,
  Info,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { WORKOUT_DAYS, WEEK_SCHEDULE } from '../data/program'
import { compactReport } from '../lib/audit'
import { PageHeader, SectionTitle } from '../components/ui'

export default function Perfil() {
  const {
    state,
    updateProfile,
    logBodyweight,
    exportJSON,
    importJSON,
    resetAll,
    startNewBlock,
  } = useApp()
  const [p, setP] = useState(state.profile)
  const [saved, setSaved] = useState(false)
  const [newWeight, setNewWeight] = useState(state.profile.weightKg)
  const [copied, setCopied] = useState<string | null>(null)
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

  /**
   * Copiar al portapapeles.
   *
   * Existe porque hay sitios donde no se puede adjuntar un archivo .json (por
   * ejemplo un chat), y exportar un respaldo que luego no puedes mover a
   * ninguna parte no sirve de nada. `execCommand` como plan B: en navegadores
   * móviles antiguos `navigator.clipboard` no siempre está disponible.
   */
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(ok ? label : null)
      if (!ok) alert('Tu navegador no ha dejado copiar. Usa el botón Exportar.')
    }
    setTimeout(() => setCopied(null), 2000)
  }

  const doExportText = () => {
    const blob = new Blob([compactReport(state)], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `entreno-resumen-${new Date().toISOString().slice(0, 10)}.txt`
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

      {/* Bloque en curso */}
      <div className="card p-4">
        <SectionTitle
          right={
            <span className="text-xs text-slate-400 nums">
              semana {state.currentWeek}/{state.blockLengthWeeks}
            </span>
          }
        >
          Bloque {state.currentBlock ?? 1}
        </SectionTitle>
        <p className="text-xs text-slate-400 leading-relaxed">
          Al acabar la semana {state.blockLengthWeeks} (la de descarga) empieza un bloque nuevo.
          <span className="text-slate-200 font-semibold">
            {' '}
            No se borra nada
          </span>
          : el historial se conserva entero y las cargas siguen donde las dejaste, porque la app
          las calcula por fecha. Lo que se reinicia es la periodización — vuelves a Acumulación con
          RIR 3 y a las series base.
        </p>
        <button
          onClick={() => {
            if (
              confirm(
                `¿Cerrar el bloque ${state.currentBlock ?? 1} y empezar el ${(state.currentBlock ?? 1) + 1} en la semana 1?\n\nTu historial y tus cargas se conservan.`,
              )
            ) {
              startNewBlock()
            }
          }}
          className="btn-ghost w-full mt-3"
        >
          <FlagTriangleRight size={16} /> Empezar bloque {(state.currentBlock ?? 1) + 1}
        </button>
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

        {/* Compartir el historial donde no se puede adjuntar un archivo */}
        <div className="mt-3 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
          <div className="section-label">Compartir el historial</div>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Para revisar tu progreso donde no se pueda adjuntar un archivo. El{' '}
            <span className="text-slate-200 font-semibold">resumen</span> es texto plano y cabe en
            un mensaje; el <span className="text-slate-200 font-semibold">JSON</span> es la copia
            fiel y completa.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <button
              onClick={() => copy(compactReport(state), 'resumen')}
              className="btn-ghost !text-xs !py-2"
            >
              <ClipboardCopy size={14} />{' '}
              {copied === 'resumen' ? 'Copiado ✓' : 'Copiar resumen'}
            </button>
            <button
              onClick={() => copy(exportJSON(), 'json')}
              className="btn-ghost !text-xs !py-2"
            >
              <ClipboardCopy size={14} /> {copied === 'json' ? 'Copiado ✓' : 'Copiar JSON'}
            </button>
          </div>
          <button onClick={doExportText} className="btn-ghost w-full !text-xs !py-2 mt-2">
            <FileText size={14} /> Descargar resumen en .txt
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
