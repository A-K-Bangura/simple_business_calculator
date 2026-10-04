/** Largest quantity a user can enter. */
export const MAX_QUANTITY = 1_000_000_000
/** Largest single price / cost a user can enter. */
export const MAX_AMOUNT = 1_000_000_000_000

/** Non-finite values (NaN, ±Infinity) are treated as 0 so they can never reach the UI. */
export function safeNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** Like `safeNumber`, but negatives also become 0. */
export function toNonNegative(value: number | null | undefined): number {
  const n = safeNumber(value)
  return n > 0 ? n : 0
}

/**
 * Round half away from zero to `decimals` places without binary-float
 * artifacts (so 1.005 → 1.01 and 4999.9999997 → 5000).
 *
 * The decimal-exponent trick (`"1.005e2"`) shifts the decimal point in string
 * space, where 1.005 really is 100.5, instead of in float space, where
 * 1.005 * 100 is 100.49999999999999.
 */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** decimals
  const abs = Math.abs(value)
  // Beyond this size floats have no fractional precision left to round.
  if (abs * factor >= Number.MAX_SAFE_INTEGER) return value

  const text = String(abs)
  // Exponent notation only appears for tiny values (< 1e-6) at this point.
  const shifted = text.includes('e') ? abs * factor : Number(`${text}e${decimals}`)
  const rounded = Number(`${Math.round(shifted)}e-${decimals}`)
  return value < 0 && rounded !== 0 ? -rounded : rounded
}

/** Round to whole cents (2 decimal places). */
export function roundMoney(value: number): number {
  return roundTo(value, 2)
}

/** Add amounts, rounding after each step so float drift can never accumulate. */
export function sumMoney(values: Iterable<number>): number {
  let total = 0
  for (const value of values) total = roundMoney(total + safeNumber(value))
  return total
}
