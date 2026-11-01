import { describe, expect, it } from 'vitest'
import { attentionItems, recentActivity } from '../../src/core/activity'
import { emptyWorkspace } from '../../src/core/models'
import { makeTask, populatedWorkspace, TODAY } from '../fixtures'
import { sampleContact, sampleDocument } from '../file-fixtures'

describe('activity centre', () => {
  it('includes overdue and upcoming plans and document-specific renewal windows', () => {
    const data = populatedWorkspace()
    data.tasks.push(makeTask({ title: 'Completed', dueDate: '2026-10-01', completedAt: '2026-11-01T08:00:00Z' }), makeTask({ title: 'Far away', dueDate: '2026-12-01' }), makeTask({ title: 'Next week', dueDate: '2026-11-08' }))
    data.documents.push({ ...sampleDocument(), expiryDate: '2026-11-25', reminderDays: 30 })
    const attention = attentionItems(data, TODAY)
    expect(attention.some(item => item.title === 'Completed' || item.title === 'Far away')).toBe(false)
    expect(attention.some(item => item.title === 'Next week')).toBe(true)
    expect(attention.some(item => item.title === 'Household policy')).toBe(true)
    expect(attention.map(item => item.date)).toEqual(attention.map(item => item.date).sort())
  })

  it('sorts recent saved records by their latest update and includes contacts', () => {
    const data = populatedWorkspace()
    const contact = sampleContact({ updatedAt: '2099-01-01T00:00:00Z' })
    data.contacts.push(contact)
    const snapshot = structuredClone(data)
    expect(recentActivity(data)[0]).toMatchObject({ id: contact.id, kind: 'contacts', path: '/local' })
    expect(data).toEqual(snapshot)
    data.contacts = []
    expect(recentActivity(data).some(item => item.id === contact.id)).toBe(false)
  })

  it('has true empty states and caps recent results without truncating attention counts', () => {
    const data = emptyWorkspace()
    expect(recentActivity(data)).toEqual([])
    expect(attentionItems(data, TODAY)).toEqual([])
    data.tasks = Array.from({ length: 55 }, (_, index) => makeTask({ title: `Task ${index}`, dueDate: TODAY }))
    expect(recentActivity(data)).toHaveLength(50)
    expect(attentionItems(data, TODAY)).toHaveLength(55)
  })
})
