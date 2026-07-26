import { Dumbbell, ArrowRight, Brain, Star, Utensils } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { WEEK_SCHEDULE } from '../data/program'

export default function Onboarding() {
  const { state, completeOnboarding } = useApp()

  return (
    <div className="min-h-full max-w-2xl mx-auto px-5 pt-12 pb-10 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="grid place-items-center h-14 w-14 rounded-2xl bg-brand-600 shadow-glow">
          <Dumbbell className="text-white" size={26} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Entreno</h1>
          <p className="text-slate-400 text-sm">
            Tu programa, {state.profile.name.split(' ')[0]}
          </p>
        </div>
      </div>

      <div className="card p-5 mt-7">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-lg">Bloque 2 · 10 semanas</h2>
          <span className="chip bg-amber-500/15 text-amber-300">pierna rediseñada</span>
        </div>
        <p className="text-sm text-slate-300 mt-2.5 leading-relaxed">
          Programa hecho a tu medida con tus máquinas. Prioridades del bloque:
        </p>
        <ol className="mt-3.5 space-y-2 text-sm text-slate-200">
          {[
            'Piernas: cuádriceps e isquios 2x/semana, sin cargar la lumbar',
            'Amplitud de espalda',
            'Deltoide lateral (hombros anchos)',
            'Mantener y progresar el pecho superior',
            'Integrar running hasta 5 km continuos',
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className={`grid place-items-center h-5 w-5 shrink-0 rounded-full text-[11px] font-extrabold mt-px ${
                  i === 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {i + 1}
              </span>
              <span className="leading-snug">
                {t}
                {i === 0 && (
                  <Star
                    size={11}
                    className="text-amber-400 inline-block ml-1.5 -mt-0.5"
                    fill="currentColor"
                  />
                )}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="card p-5 mt-4">
        <h3 className="font-bold">Tu semana tipo</h3>
        <ul className="mt-3 space-y-2.5">
          {WEEK_SCHEDULE.map((s) => {
            const isLeg = s.workoutId === 'd1' || s.workoutId === 'd4'
            return (
              <li key={s.day} className="flex items-start gap-3 text-sm">
                <span className="text-slate-500 w-[4.75rem] shrink-0 font-medium">{s.day}</span>
                <span
                  className={`flex-1 leading-snug ${isLeg ? 'text-amber-200 font-semibold' : 'text-slate-100'}`}
                >
                  {s.activity}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="card p-4 mt-4 space-y-3">
        <Feature icon={<Brain size={16} className="text-brand-400" />} title="Calcula tus cargas">
          Registras kg, reps y RIR, y la app estima tu fuerza real para decirte con qué peso
          entrenar la semana siguiente. Si te estancas, lo detecta y cambia de estrategia.
        </Feature>
        <Feature
          icon={<Utensils size={16} className="text-emerald-400" />}
          title="Vigila tu peso"
        >
          Calcula la tendencia real de tu peso corporal y te avisa si llevas semanas plano. Sin
          superávit no hay músculo nuevo, por buena que sea la rutina.
        </Feature>
      </div>

      <p className="text-[11px] text-slate-500 text-center mt-4 leading-relaxed">
        Tus datos se guardan solo en este dispositivo. Haz una copia desde Perfil de vez en cuando.
      </p>

      <button className="btn-primary w-full mt-5 py-4 text-base" onClick={completeOnboarding}>
        Empezar <ArrowRight size={18} />
      </button>
    </div>
  )
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid place-items-center h-8 w-8 rounded-xl bg-slate-800 shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{children}</p>
      </div>
    </div>
  )
}
