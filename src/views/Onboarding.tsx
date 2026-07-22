import { Dumbbell, ArrowRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { WEEK_SCHEDULE } from '../data/program'

export default function Onboarding() {
  const { state, completeOnboarding } = useApp()

  return (
    <div className="min-h-full max-w-2xl mx-auto px-5 py-10">
      <div className="flex items-center gap-3">
        <div className="grid place-items-center h-12 w-12 rounded-2xl bg-brand-600">
          <Dumbbell className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">Entreno</h1>
          <p className="text-slate-400 text-sm">Tu programa, {state.profile.name.split(' ')[0]}</p>
        </div>
      </div>

      <div className="card p-5 mt-6">
        <h2 className="font-bold text-lg">Bloque 1 · 10 semanas</h2>
        <p className="text-sm text-slate-300 mt-2">
          Programa hecho a tu medida con tus máquinas del gimnasio nuevo. Prioridades del
          bloque:
        </p>
        <ol className="mt-3 space-y-1.5 text-sm text-slate-200 list-decimal list-inside">
          <li>Piernas sin irritar el glúteo/lumbar derecho</li>
          <li>Amplitud de espalda</li>
          <li>Deltoide lateral (hombros anchos)</li>
          <li>Mantener y progresar el pecho superior</li>
          <li>Integrar running hasta 5 km continuos</li>
        </ol>
      </div>

      <div className="card p-5 mt-4">
        <h3 className="font-semibold">Tu semana tipo</h3>
        <ul className="mt-3 space-y-2">
          {WEEK_SCHEDULE.map((s) => (
            <li key={s.day} className="flex items-center justify-between text-sm">
              <span className="text-slate-400 w-24">{s.day}</span>
              <span className="flex-1 text-slate-100">{s.activity}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-4 mt-4 text-sm text-slate-400">
        Cada semana registras tus series y la app calcula automáticamente los pesos y
        repeticiones de la semana siguiente con sobrecarga progresiva. Tus datos se guardan
        solo en este dispositivo.
      </div>

      <button className="btn-primary w-full mt-6 py-3.5 text-base" onClick={completeOnboarding}>
        Empezar <ArrowRight size={18} />
      </button>
    </div>
  )
}
