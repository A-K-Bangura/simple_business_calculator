/**
 * Versioning for everything we write to disk (local storage and backup files
 * share one envelope format).
 *
 * To change the data model in future:
 *   1. bump CURRENT_SCHEMA_VERSION,
 *   2. add a migration keyed by the OLD version that returns the envelope in
 *      the NEW shape, e.g. `1: (envelope) => ({ ...envelope, plans: … })`.
 * Older saved data and old backup files are then upgraded automatically.
 */

export const APP_ID = 'startup-business-calculator'
export const CURRENT_SCHEMA_VERSION = 1

export interface DataEnvelope {
  schemaVersion: number
  plans: unknown[]
}

export type Migration = (envelope: DataEnvelope) => DataEnvelope

export const MIGRATIONS: Readonly<Record<number, Migration>> = {}

export type StorageErrorCode = 'corrupt' | 'newer-version' | 'write-failed'

export class StorageError extends Error {
  code: StorageErrorCode

  constructor(code: StorageErrorCode, message: string) {
    super(message)
    this.name = 'StorageError'
    this.code = code
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Checks the shape of parsed JSON and upgrades it to the current schema.
 * Throws a `StorageError` if it can't be understood or is from a newer app.
 */
export function readEnvelope(
  json: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  currentVersion: number = CURRENT_SCHEMA_VERSION,
): DataEnvelope {
  if (!isRecord(json) || !Array.isArray(json.plans)) {
    throw new StorageError('corrupt', 'The data is not in a format this app understands.')
  }

  const version = json.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new StorageError('corrupt', 'The data has no valid version number.')
  }
  if (version > currentVersion) {
    throw new StorageError(
      'newer-version',
      'This data was saved by a newer version of the app, so it can’t be opened here.',
    )
  }

  let envelope: DataEnvelope = { schemaVersion: version, plans: json.plans }
  while (envelope.schemaVersion < currentVersion) {
    const migrate = migrations[envelope.schemaVersion]
    if (!migrate) {
      throw new StorageError('corrupt', `There is no way to upgrade data from version ${envelope.schemaVersion}.`)
    }
    const upgraded = migrate(envelope)
    envelope = { ...upgraded, schemaVersion: envelope.schemaVersion + 1 }
  }
  return envelope
}
