import type { AppState } from '../types'
import { PROFILE_SEED, BLOCK_LENGTH_WEEKS } from '../data/program'

const STORAGE_KEY = 'entreno-santiago-v1'

export function defaultState(): AppState {
  return {
    version: 1,
    profile: { ...PROFILE_SEED },
    currentWeek: 1,
    blockLengthWeeks: BLOCK_LENGTH_WEEKS,
    sessions: [],
    runs: [],
    bodyweightLog: [
      { date: new Date().toISOString().slice(0, 10), weightKg: PROFILE_SEED.weightKg },
    ],
    onboarded: false,
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as Partial<AppState>
    // Merge defensivo por si cambia el esquema
    return { ...defaultState(), ...parsed }
  } catch {
    return defaultState()
  }
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignorar errores de cuota
  }
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY)
}
