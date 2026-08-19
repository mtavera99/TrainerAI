export function todayISO(): string {
  return new Date().toISOString()
}

export function shortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  })
}

export function fullDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

export function uid(prefix = ''): string {
  return (
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 7)
  )
}

export function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}


/**
 * Identificador estable a partir de un texto libre. Se usa para las variantes
 * que el usuario escribe a mano: si dos sesiones distintas escriben "Curl con
 * barra recta", ambas caen en el mismo id y comparten historial de cargas. Sin
 * esto, cada variante libre sería un ejercicio nuevo cada semana y nunca
 * acumularía progresión.
 */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}
