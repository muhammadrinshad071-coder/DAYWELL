import { describe, expect, it } from 'vitest'
import { searchWorkspace } from '../../src/core/search'
import { populatedWorkspace } from '../fixtures'

describe('money records in global search', () => {
  it('finds budgets by translated category and amount while retaining their currency', () => {
    const data = populatedWorkspace()
    const translated = searchWorkspace(data, 'Food allowance', category => category === 'groceries' ? 'Food allowance' : category)
    expect(translated.results.find(result => result.kind === 'budgets')).toMatchObject({ id: data.budgets[0].id, title: 'Food allowance', detail: '2026-11 · INR', path: '/money' })
    expect(searchWorkspace(data, '500.00').results.map(result => result.kind)).toEqual(['budgets'])
  })

  it('finds savings goals by name, notes, target amount and deadline', () => {
    const data = populatedWorkspace()
    data.savingsGoals[0].notes = 'A slow train journey'
    for (const query of ['quiet holiday', 'slow train', '5000.00', '2027-04-01']) {
      expect(searchWorkspace(data, query).results).toContainEqual(expect.objectContaining({ kind: 'savingsGoals', id: data.savingsGoals[0].id, title: 'A quiet holiday' }))
    }
  })
})
