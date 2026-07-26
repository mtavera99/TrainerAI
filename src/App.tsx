import { useState } from 'react'
import {
  LayoutDashboard,
  Dumbbell,
  LineChart,
  Footprints,
  User,
} from 'lucide-react'
import { useApp } from './context/AppContext'
import Dashboard from './views/Dashboard'
import Entreno from './views/Entreno'
import Historial from './views/Historial'
import Running from './views/Running'
import Perfil from './views/Perfil'
import Onboarding from './views/Onboarding'

type Tab = 'dashboard' | 'entreno' | 'historial' | 'running' | 'perfil'

const TABS: { id: Tab; label: string; icon: typeof Dumbbell }[] = [
  { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
  { id: 'entreno', label: 'Entreno', icon: Dumbbell },
  { id: 'historial', label: 'Progreso', icon: LineChart },
  { id: 'running', label: 'Running', icon: Footprints },
  { id: 'perfil', label: 'Perfil', icon: User },
]

export default function App() {
  const { state } = useApp()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [goToDay, setGoToDay] = useState<string | undefined>(undefined)

  if (!state.onboarded) {
    return <Onboarding />
  }

  const openDay = (dayId: string) => {
    setGoToDay(dayId)
    setTab('entreno')
  }

  return (
    <div className="min-h-full max-w-2xl mx-auto flex flex-col">
      <main className="flex-1 px-4 pt-6 pb-nav">
        {/* La `key` fuerza la animación de entrada al cambiar de pestaña */}
        <div key={tab} className="animate-fade-up">
          {tab === 'dashboard' && (
            <Dashboard onOpenDay={openDay} goRunning={() => setTab('running')} />
          )}
          {tab === 'entreno' && (
            <Entreno initialDay={goToDay} clearInitialDay={() => setGoToDay(undefined)} />
          )}
          {tab === 'historial' && <Historial />}
          {tab === 'running' && <Running />}
          {tab === 'perfil' && <Perfil />}
        </div>
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-xl pb-safe">
        <div className="max-w-2xl mx-auto grid grid-cols-5 px-1">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={active ? 'page' : undefined}
                className="relative flex flex-col items-center gap-1 pt-3 pb-2.5 text-[11px] font-semibold transition-colors active:scale-95 duration-150"
              >
                {/* Indicador superior de la pestaña activa */}
                <span
                  className={`absolute top-0 h-[3px] w-9 rounded-b-full bg-brand-400 transition-all duration-200 ${
                    active ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
                  }`}
                />
                <span
                  className={`grid place-items-center h-8 w-8 rounded-xl transition-colors duration-200 ${
                    active ? 'bg-brand-500/15 text-brand-300' : 'text-slate-500'
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                </span>
                <span className={active ? 'text-brand-300' : 'text-slate-500'}>{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
