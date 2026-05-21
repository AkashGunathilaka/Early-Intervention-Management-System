/** Turn FastAPI error `detail` (string or validation array) into display text. */
export function formatApiDetail(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item: { loc?: unknown[]; msg?: string }) => {
        const loc = Array.isArray(item?.loc) ? item.loc.join('.') : ''
        const msg = item?.msg ?? ''
        return loc ? `${loc}: ${msg}` : msg
      })
      .filter(Boolean)
      .join('; ')
  }
  return fallback
}

/** Format a number for display; null/invalid values show as em dash. */
export function fmt(value: unknown, digits = 2): string {
  if (value === null || value === undefined) return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}
