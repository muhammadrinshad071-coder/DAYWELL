import { afterEach, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { newId } from '../../src/core/ids'

afterEach(() => vi.unstubAllGlobals())

it('uses native UUID generation when available', () => {
  const randomUUID = vi.fn(() => 'a824aa01-0ff4-4c42-9118-543eb1606e63')
  vi.stubGlobal('crypto', { randomUUID })
  expect(newId()).toBe('a824aa01-0ff4-4c42-9118-543eb1606e63')
  expect(randomUUID).toHaveBeenCalledOnce()
})

it('creates distinct valid UUID v4 values without the secure-context-only API', () => {
  const getRandomValues = crypto.getRandomValues.bind(crypto)
  vi.stubGlobal('crypto', { getRandomValues })
  const ids = Array.from({ length: 100 }, newId)
  expect(new Set(ids).size).toBe(100)
  ids.forEach(id => expect(z.uuid({ version: 'v4' }).safeParse(id).success).toBe(true))
})
