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
      <main className="flex-1 px-4 pb-28 pt-5">
        {tab === 'dashboard' && <Dashboard onOpenDay={openDay} goRunning={() => setTab('running')} />}
        {tab === 'entreno' && (
          <Entreno initialDay={goToDay} clearInitialDay={() => setGoToDay(undefined)} />
        )}
        {tab === 'historial' && <Historial />}
        {tab === 'running' && <Running />}
        {tab === 'perfil' && <Perfil />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="max-w-2xl mx-auto grid grid-cols-5">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                {label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
