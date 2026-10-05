import { useMemo, useSyncExternalStore } from 'react'

/**
 * A tiny hash router: `#/` is the plans list, `#/plan/<id>` is one plan.
 * Hash URLs need no server setup, so the app works from any static host,
 * and the browser's back button just works.
 */
export type Route = { name: 'plans' } | { name: 'plan'; planId: string }

export function parseRoute(hash: string): Route {
  const match = /^#?\/plan\/([^/?#]+)/.exec(hash)
  if (match?.[1]) {
    try {
      return { name: 'plan', planId: decodeURIComponent(match[1]) }
    } catch {
      return { name: 'plans' }
    }
  }
  return { name: 'plans' }
}

export const plansHref = '#/'
export const planHref = (id: string) => `#/plan/${encodeURIComponent(id)}`

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return useMemo(() => parseRoute(hash), [hash])
}

export function navigateTo(href: string, options: { replace?: boolean } = {}): void {
  if (options.replace) window.location.replace(href)
  else window.location.hash = href
}
