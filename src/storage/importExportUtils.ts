import type { BusinessPlan } from '../domain/types'
import { slugify } from '../domain/formatUtils'
import { APP_ID, CURRENT_SCHEMA_VERSION, readEnvelope, StorageError } from './schema'
import { sanitizePlans } from './sanitize'

/** Backups are small; anything bigger is almost certainly the wrong file. */
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024

export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}

export interface ImportResult {
  plans: BusinessPlan[]
  /** Entries in the file that weren't usable plans. */
  skipped: number
}

/** The text of a backup file for the given plans. */
export function serializeExport(plans: readonly BusinessPlan[]): string {
  return JSON.stringify(
    {
      app: APP_ID,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      plans,
    },
    null,
    2,
  )
}

export function exportFileName(plans: readonly BusinessPlan[], now: Date = new Date()): string {
  const day = now.toISOString().slice(0, 10)
  const base = plans.length === 1 ? slugify(plans[0].name) || 'plan' : 'all-plans'
  return `${base}-${day}.startup-plan.json`
}

/**
 * Checks and cleans the text of a backup file. Throws an `ImportError` with a
 * friendly message when the file can't be used; never lets bad data through.
 */
export function parseImport(text: string): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) throw new ImportError('That file is too large to be a plan backup.')

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new ImportError('That file isn’t a plan backup. It couldn’t be read as JSON.')
  }

  if (typeof json !== 'object' || json === null || (json as { app?: unknown }).app !== APP_ID) {
    throw new ImportError('That file doesn’t look like a backup from this app.')
  }

  let rawPlans: unknown[]
  try {
    rawPlans = readEnvelope(json).plans
  } catch (error) {
    if (error instanceof StorageError && error.code === 'newer-version') {
      throw new ImportError('That backup was made by a newer version of the app and can’t be opened here.')
    }
    throw new ImportError('That file doesn’t look like a backup from this app.')
  }

  const { plans, skipped } = sanitizePlans(rawPlans)
  if (plans.length === 0) throw new ImportError('There were no plans in that file to import.')
  return { plans, skipped }
}

export function readFileAsText(file: File): Promise<string> {
  if (file.size > MAX_IMPORT_BYTES) {
    return Promise.reject(new ImportError('That file is too large to be a plan backup.'))
  }
  return file.text()
}

/** Offer a text file to the browser as a download. */
export function downloadTextFile(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
