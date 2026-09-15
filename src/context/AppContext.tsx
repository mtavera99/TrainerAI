import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppState,
  Profile,
  RunLog,
  SessionLog,
} from '../types'
import {
  clearState,
  defaultState,
  exportState,
  loadState,
  migrate,
  saveState,
} from '../lib/storage'

interface AppContextValue {
  state: AppState
  updateProfile: (p: Partial<Profile>) => void
  setCurrentWeek: (w: number) => void
  saveSession: (session: SessionLog) => void
  deleteSession: (id: string) => void
  addRun: (run: RunLog) => void
  deleteRun: (id: string) => void
  logBodyweight: (weightKg: number, date?: string) => void
  completeOnboarding: () => void
  startNewBlock: () => void
  resetAll: () => void
  exportJSON: () => string
  importJSON: (json: string) => boolean
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())

  useEffect(() => {
    saveState(state)
  }, [state])

  const value = useMemo<AppContextValue>(() => {
    return {
      state,
      updateProfile: (p) =>
        setState((s) => ({ ...s, profile: { ...s.profile, ...p } })),
      setCurrentWeek: (w) =>
        setState((s) => ({
          ...s,
          currentWeek: Math.min(
            Math.max(1, w),
            s.blockLengthWeeks,
          ),
        })),
      saveSession: (session) =>
        setState((s) => {
          const exists = s.sessions.some((x) => x.id === session.id)
          const sessions = exists
            ? s.sessions.map((x) => (x.id === session.id ? session : x))
            : [...s.sessions, session]
          // Si registró peso corporal, lo añadimos al log
          let bodyweightLog = s.bodyweightLog
          if (session.bodyweight && session.bodyweight > 0) {
            const day = session.date.slice(0, 10)
            bodyweightLog = [
              ...bodyweightLog.filter((b) => b.date !== day),
              { date: day, weightKg: session.bodyweight },
            ].sort((a, b) => a.date.localeCompare(b.date))
          }
          return { ...s, sessions, bodyweightLog }
        }),
      deleteSession: (id) =>
        setState((s) => ({
          ...s,
          sessions: s.sessions.filter((x) => x.id !== id),
        })),
      addRun: (run) =>
        setState((s) => ({ ...s, runs: [...s.runs, run] })),
      deleteRun: (id) =>
        setState((s) => ({
          ...s,
          runs: s.runs.filter((x) => x.id !== id),
        })),
      logBodyweight: (weightKg, date) =>
        setState((s) => {
          const day = (date ?? new Date().toISOString()).slice(0, 10)
          const bodyweightLog = [
            ...s.bodyweightLog.filter((b) => b.date !== day),
            { date: day, weightKg },
          ].sort((a, b) => a.date.localeCompare(b.date))
          return {
            ...s,
            bodyweightLog,
            profile: { ...s.profile, weightKg },
          }
        }),
      completeOnboarding: () =>
        setState((s) => ({ ...s, onboarded: true })),
      /**
       * Cerrar el bloque y empezar el siguiente en la semana 1.
       *
       * NO borra nada: el historial completo se conserva y, como el motor de
       * progresión lee por fecha y no por número de semana, las cargas del
       * bloque nuevo arrancan justo donde las dejaste. Lo único que se reinicia
       * es la periodización: vuelves a Acumulación con RIR 3 y a las series
       * base, que es de lo que trata empezar un bloque.
       */
      startNewBlock: () =>
        setState((s) => ({
          ...s,
          currentBlock: (s.currentBlock ?? 1) + 1,
          currentWeek: 1,
        })),
      resetAll: () => {
        clearState()
        setState(defaultState())
      },
      exportJSON: () => exportState(state),
      importJSON: (json) => {
        try {
          const parsed = JSON.parse(json) as AppState
          // Un respaldo puede venir de una versión anterior del esquema, así
          // que pasa por las mismas migraciones que el arranque normal.
          setState(migrate({ ...defaultState(), ...parsed }))
          return true
        } catch {
          return false
        }
      },
    }
  }, [state])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}
