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
      resetAll: () => {
        clearState()
        setState(defaultState())
      },
      exportJSON: () => exportState(state),
      importJSON: (json) => {
        try {
          const parsed = JSON.parse(json) as AppState
          setState({ ...defaultState(), ...parsed })
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
