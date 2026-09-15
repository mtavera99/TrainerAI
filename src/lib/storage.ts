import type { AppState } from '../types'
import { PROFILE_SEED, BLOCK_LENGTH_WEEKS } from '../data/program'

const STORAGE_KEY = 'entreno-santiago-v1'

export function defaultState(): AppState {
  return {
    version: 2,
    profile: { ...PROFILE_SEED },
    currentBlock: 1,
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
    return migrate({ ...defaultState(), ...parsed })
  } catch {
    return defaultState()
  }
}

/**
 * Migraciones de esquema. El merge defensivo con `defaultState()` rellena
 * campos nuevos, pero no arregla datos que ya existen y necesitan traducirse:
 * eso es lo que hace esto.
 *
 * v1 → v2: aparece el concepto de BLOQUE. Todas las sesiones guardadas hasta
 * ahora son del bloque 1, y hay que marcarlas explícitamente para que al
 * empezar el bloque 2 la app no confunda "semana 1 del bloque nuevo" con
 * "semana 1 del bloque viejo" y te abra la sesión antigua para sobreescribirla.
 */
export function migrate(state: AppState): AppState {
  let out = state

  if (!out.currentBlock || out.currentBlock < 1) {
    out = { ...out, currentBlock: 1 }
  }

  if (out.sessions.some((s) => s.block === undefined)) {
    out = {
      ...out,
      sessions: out.sessions.map((s) => (s.block === undefined ? { ...s, block: 1 } : s)),
    }
  }

  return { ...out, version: 2 }
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
