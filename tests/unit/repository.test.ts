import { afterEach, describe, expect, it, vi } from 'vitest'
import { IndexedDBRepository } from '../../src/core/repository'
import { emptyWorkspace } from '../../src/core/models'
import { makeTask, populatedWorkspace } from '../fixtures'

const repositories: IndexedDBRepository[] = []
function repository(name = `test-${crypto.randomUUID()}`) {
  const repo = new IndexedDBRepository(name)
  repositories.push(repo)
  return repo
}
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(repositories.splice(0).map(repo => repo.close())) })

describe('IndexedDB repository', () => {
  it('starts empty and persists across connection close and reopening', async () => {
    const name = `test-${crypto.randomUUID()}`
    const first = repository(name)
    expect(await first.load()).toEqual(emptyWorkspace())
    const task = makeTask()
    await first.update(data => { data.tasks.push(task) })
    await first.close()
    expect((await repository(name).load()).tasks).toEqual([task])
  })
  it('serializes simultaneous read-modify-write transactions across repository instances', async () => {
    const name = `test-${crypto.randomUUID()}`
    const first = repository(name)
    const second = repository(name)
    await Promise.all(Array.from({ length: 12 }, (_, index) => (index % 2 ? first : second).update(data => { data.tasks.push(makeTask({ title: `Task ${index}` })) })))
    const data = await first.load()
    expect(data.tasks).toHaveLength(12)
    expect(new Set(data.tasks.map(task => task.title)).size).toBe(12)
  })
  it('leaves the previous snapshot intact after a validation failure', async () => {
    const repo = repository()
    const data = populatedWorkspace()
    await repo.replace(data)
    await expect(repo.update(draft => { draft.transactions[0].amount = -1 })).rejects.toThrow()
    expect(await repo.load()).toEqual(data)
  })
  it('rolls back a mutation that throws before committing', async () => {
    const repo = repository()
    const task = makeTask()
    await repo.update(data => { data.tasks.push(task) })
    await expect(repo.update(data => { data.tasks.length = 0; throw new Error('interrupted') })).rejects.toThrow('interrupted')
    expect((await repo.load()).tasks).toEqual([task])
  })
  it('validates before replacing and restores all collections atomically', async () => {
    const repo = repository()
    const data = populatedWorkspace()
    await repo.replace(data)
    const invalid = structuredClone(data)
    invalid.habitLogs[0].habitId = crypto.randomUUID()
    await expect(repo.replace(invalid)).rejects.toThrow()
    expect(await repo.load()).toEqual(data)
    await repo.replace(emptyWorkspace())
    expect(await repo.load()).toEqual(emptyWorkspace())
  })
  it('surfaces blocked storage and can reconnect after the failure is removed', async () => {
    const repo = repository()
    const spy = vi.spyOn(indexedDB, 'open').mockImplementation(() => { throw new DOMException('Storage unavailable', 'SecurityError') })
    await expect(repo.load()).rejects.toThrow('Storage unavailable')
    spy.mockRestore()
    expect(await repo.load()).toEqual(emptyWorkspace())
  })
})
