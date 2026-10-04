import { safeNumber } from './moneyUtils'

const quantityFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 })
const percentFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const relativeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** 1,250 · 2.5 — never NaN. */
export function formatQuantity(quantity: number): string {
  return quantityFormat.format(Math.max(0, safeNumber(quantity)))
}

/** "50 pieces", or just "50" when there is no unit. */
export function formatQuantityWithUnit(quantity: number, unit?: string): string {
  const amount = formatQuantity(quantity)
  const label = unit?.trim()
  return label ? `${amount} ${label}` : amount
}

export function formatPercent(value: number): string {
  return `${percentFormat.format(safeNumber(value))}%`
}

/** "1 item", "8 items" */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/** "Just now", "5 minutes ago", "yesterday", or a short date once it's over a week old. */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return ''

  const seconds = Math.round((now - time) / 1000)
  if (seconds < 45) return 'just now'

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return relativeFormat.format(-minutes, 'minute')

  const hours = Math.round(minutes / 60)
  if (hours < 24) return relativeFormat.format(-hours, 'hour')

  const days = Math.round(hours / 24)
  if (days < 7) return relativeFormat.format(-days, 'day')

  return new Date(time).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** "Mariama's Clothing Business" → "mariamas-clothing-business" (for file names). */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}
