/** The tiny slice of `localStorage` the app relies on, so it can be swapped or faked. */
export interface KeyValueStore {
  getItem(key: string): string | null
  /** Throws if the value can't be stored (quota exceeded, storage blocked…). */
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** `localStorage`, tolerant of browsers where merely touching it throws. */
export function createBrowserStore(): KeyValueStore {
  return {
    getItem(key) {
      try {
        return window.localStorage.getItem(key)
      } catch {
        return null
      }
    },
    setItem(key, value) {
      window.localStorage.setItem(key, value)
    },
    removeItem(key) {
      try {
        window.localStorage.removeItem(key)
      } catch {
        // Nothing to remove if storage isn't available.
      }
    },
  }
}

export function createMemoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}
