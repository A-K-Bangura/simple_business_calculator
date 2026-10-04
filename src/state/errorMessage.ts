import { ImportError } from '../storage/importExportUtils'
import { StorageError } from '../storage/schema'

/** A message that's safe and kind to show a person, whatever went wrong. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ImportError || error instanceof StorageError) return error.message
  return fallback
}
