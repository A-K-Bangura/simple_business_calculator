import { describe, expect, it } from 'vitest'
import { parseRoute, planHref } from './router'

describe('parseRoute', () => {
  it('shows the plans list for the empty and root hashes', () => {
    for (const hash of ['', '#', '#/', '#/nonsense', '#/plans']) {
      expect(parseRoute(hash)).toEqual({ name: 'plans' })
    }
  })

  it('opens a plan from its link', () => {
    expect(parseRoute('#/plan/abc-123')).toEqual({ name: 'plan', planId: 'abc-123' })
    expect(parseRoute(planHref('7f1c0e5e-0a39-4d8b-9a0e-1f2b3c4d5e6f'))).toEqual({
      name: 'plan',
      planId: '7f1c0e5e-0a39-4d8b-9a0e-1f2b3c4d5e6f',
    })
  })

  it('round-trips ids that need escaping', () => {
    expect(parseRoute(planHref('a b/c'))).toEqual({ name: 'plan', planId: 'a b/c' })
  })

  it('falls back to the list for a plan link with no id or broken escaping', () => {
    expect(parseRoute('#/plan/')).toEqual({ name: 'plans' })
    expect(parseRoute('#/plan/%E0%A4%A')).toEqual({ name: 'plans' })
  })
})
