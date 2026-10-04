import { describe, expect, it } from 'vitest'
import { createDemoPlan } from '../domain/demoPlan'
import { addGroup, addItem } from '../domain/planOperations'
import { createMemoryStore, type KeyValueStore } from './keyValueStore'
import { createPlanRepository, STORAGE_KEY } from './planRepository'
import { readEnvelope, StorageError, type Migration } from './schema'

const currency = { code: 'SLE', symbol: 'Le' }
const input = (name: string) => ({ name, currency })

describe('planRepository', () => {
  it('starts empty', async () => {
    expect(await createPlanRepository(createMemoryStore()).getPlans()).toEqual([])
  })

  it('creates, reads, updates and deletes a plan', async () => {
    const repo = createPlanRepository(createMemoryStore())

    const created = await repo.createPlan({ name: 'Juice Business', description: 'Fresh', currency })
    expect(await repo.getPlan(created.id)).toEqual(created)
    expect(await repo.getPlans()).toHaveLength(1)

    const edited = addGroup({ ...created, name: 'Juice Co.' }, { name: 'Fruit', type: 'selling' })
    await repo.updatePlan(edited)
    expect(await repo.getPlan(created.id)).toEqual(edited)

    await repo.deletePlan(created.id)
    expect(await repo.getPlan(created.id)).toBeUndefined()
    expect(await repo.getPlans()).toEqual([])
  })

  it('keeps plans after “closing and reopening” — a new repository on the same storage', async () => {
    const store = createMemoryStore()
    const first = createPlanRepository(store)
    const demo = createDemoPlan()
    await first.importPlans([demo])

    const reopened = createPlanRepository(store)
    expect(await reopened.getPlans()).toEqual([demo])
  })

  it('lists the most recently updated plan first', async () => {
    const repo = createPlanRepository(createMemoryStore())
    const a = await repo.createPlan(input('A'))
    const b = await repo.createPlan(input('B'))
    await repo.updatePlan({ ...a, updatedAt: '2099-01-01T00:00:00.000Z' })
    expect((await repo.getPlans()).map((p) => p.name)).toEqual(['A', 'B'])
    expect(b.name).toBe('B')
  })

  it('saves an unknown plan instead of losing it', async () => {
    const repo = createPlanRepository(createMemoryStore())
    const plan = createDemoPlan()
    await repo.updatePlan(plan)
    expect(await repo.getPlan(plan.id)).toEqual(plan)
  })

  it('ignores deleting something that is not there', async () => {
    const repo = createPlanRepository(createMemoryStore())
    await expect(repo.deletePlan('nope')).resolves.toBeUndefined()
  })

  describe('duplicatePlan', () => {
    it('makes an independent copy with new ids and fresh dates', async () => {
      const repo = createPlanRepository(createMemoryStore())
      const [original] = await repo.importPlans([createDemoPlan()])
      const copy = await repo.duplicatePlan(original.id)

      expect(copy.name).toBe('Clothing Business (example) (copy)')
      expect(copy.id).not.toBe(original.id)
      expect(copy.groups[0].id).not.toBe(original.groups[0].id)
      expect(copy.groups[0].items[0].id).not.toBe(original.groups[0].items[0].id)
      expect(copy.groups.map((g) => g.items.length)).toEqual(original.groups.map((g) => g.items.length))
      expect(await repo.getPlans()).toHaveLength(2)

      // Editing the copy leaves the original alone.
      await repo.updatePlan(addItem(copy, copy.groups[0].id, { name: 'Socks', quantity: 1, unitCost: 1 }))
      expect((await repo.getPlan(original.id))?.groups[0].items).toHaveLength(2)
    })

    it('fails clearly for an unknown plan', async () => {
      await expect(createPlanRepository(createMemoryStore()).duplicatePlan('nope')).rejects.toBeInstanceOf(StorageError)
    })
  })

  describe('importPlans', () => {
    it('keeps ids that are free', async () => {
      const repo = createPlanRepository(createMemoryStore())
      const plan = createDemoPlan()
      const [imported] = await repo.importPlans([plan])
      expect(imported.id).toBe(plan.id)
    })

    it('gives a plan a fresh id (and says so in its name) when the id is already taken', async () => {
      const repo = createPlanRepository(createMemoryStore())
      const plan = createDemoPlan()
      await repo.importPlans([plan])
      const [again] = await repo.importPlans([plan])

      expect(again.id).not.toBe(plan.id)
      expect(again.name).toBe('Clothing Business (example) (imported)')
      expect(await repo.getPlans()).toHaveLength(2)
    })

    it('handles the same id appearing twice in one file', async () => {
      const repo = createPlanRepository(createMemoryStore())
      const plan = createDemoPlan()
      const imported = await repo.importPlans([plan, plan])
      expect(new Set(imported.map((p) => p.id)).size).toBe(2)
    })
  })

  describe('bad storage', () => {
    it('reports unreadable JSON as corrupt without changing it', async () => {
      const store = createMemoryStore({ [STORAGE_KEY]: '{not json' })
      const repo = createPlanRepository(store)
      await expect(repo.getPlans()).rejects.toMatchObject({ code: 'corrupt' })
      expect(store.getItem(STORAGE_KEY)).toBe('{not json')
    })

    it('reports data from a newer version instead of overwriting it', async () => {
      const store = createMemoryStore({ [STORAGE_KEY]: JSON.stringify({ schemaVersion: 99, plans: [] }) })
      await expect(createPlanRepository(store).getPlans()).rejects.toMatchObject({ code: 'newer-version' })
    })

    it('backs up unreadable data, then starts fresh', async () => {
      const written = new Map<string, string>()
      const base = createMemoryStore({ [STORAGE_KEY]: '{not json' })
      const store: KeyValueStore = {
        ...base,
        setItem(key, value) {
          written.set(key, value)
          base.setItem(key, value)
        },
      }
      const repo = createPlanRepository(store)
      await repo.backupAndReset()

      expect(store.getItem(STORAGE_KEY)).toBeNull()
      expect(await repo.getPlans()).toEqual([])

      const [backupKey, backupValue] = [...written.entries()][0]
      expect(backupKey).toMatch(new RegExp(`^${STORAGE_KEY}\\.backup-\\d+$`))
      expect(backupValue).toBe('{not json')
    })

    it('drops plans that are junk but keeps the good ones', async () => {
      const good = createDemoPlan()
      const store = createMemoryStore({
        [STORAGE_KEY]: JSON.stringify({ schemaVersion: 1, plans: [null, 42, 'x', { nope: true }, good] }),
      })
      expect(await createPlanRepository(store).getPlans()).toEqual([good])
    })

    it('surfaces a failed write (quota / blocked storage) as a StorageError', async () => {
      const failing: KeyValueStore = {
        ...createMemoryStore(),
        setItem() {
          throw new DOMException('full', 'QuotaExceededError')
        },
      }
      await expect(createPlanRepository(failing).createPlan(input('X'))).rejects.toMatchObject({
        code: 'write-failed',
      })
    })

    it('copes with storage that cannot be read at all', async () => {
      const blocked: KeyValueStore = { ...createMemoryStore(), getItem: () => null }
      expect(await createPlanRepository(blocked).getPlans()).toEqual([])
    })
  })
})

describe('schema migrations', () => {
  it('upgrades old data step by step', () => {
    const migrations: Record<number, Migration> = {
      1: (envelope) => ({ ...envelope, plans: envelope.plans.map((p) => ({ ...(p as object), step1: true })) }),
      2: (envelope) => ({ ...envelope, plans: envelope.plans.map((p) => ({ ...(p as object), step2: true })) }),
    }
    const result = readEnvelope({ schemaVersion: 1, plans: [{ name: 'Old' }] }, migrations, 3)
    expect(result.schemaVersion).toBe(3)
    expect(result.plans).toEqual([{ name: 'Old', step1: true, step2: true }])
  })

  it('refuses data from the future', () => {
    expect(() => readEnvelope({ schemaVersion: 2, plans: [] }, {}, 1)).toThrowError(StorageError)
  })

  it('refuses data with no usable version or plans list', () => {
    for (const bad of [null, [], 'x', { plans: [] }, { schemaVersion: 1 }, { schemaVersion: 'one', plans: [] }, { schemaVersion: 0, plans: [] }]) {
      expect(() => readEnvelope(bad)).toThrowError(StorageError)
    }
  })

  it('fails safely if a migration is missing', () => {
    expect(() => readEnvelope({ schemaVersion: 1, plans: [] }, {}, 2)).toThrowError(StorageError)
  })
})
