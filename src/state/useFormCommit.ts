import { useState, type FormEvent } from 'react'
import type { z } from 'zod'
import { useI18n } from '../core/i18n'

export function useFormCommit() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { t } = useI18n()
  async function submit<T>(event: FormEvent, schema: z.ZodType<T>, build: () => unknown, commit: (record: T) => Promise<boolean>, close: () => void) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const record = schema.parse(build())
      if (await commit(record)) close()
    } catch (cause) {
      setError(t(cause instanceof Error && cause.message === 'invalid-budget-duplicate' ? 'money.duplicateBudget' : 'common.invalidForm'))
    } finally { setBusy(false) }
  }
  return { busy, error, submit, setError }
}
