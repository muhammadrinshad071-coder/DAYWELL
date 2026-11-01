import { useState } from 'react'
import { expenseCategories, incomeCategories } from '../../core/categories'
import { dateKey, monthKey } from '../../core/dates'
import { useI18n } from '../../core/i18n'
import { budgetSchema, entity, savingsGoalSchema, transactionSchema, type Budget, type SavingsGoal, type Transaction } from '../../core/models'
import { currencies, currencyDigits, moneyInput, parseMoney, type Currency } from '../../core/money'
import { saveRecord } from '../../core/operations'
import { useData, usePreferences } from '../../state/context'
import { useFormCommit } from '../../state/useFormCommit'
import { Field, FormActions, FormError } from '../../components/ui'

export function TransactionForm({ record, initialDate, close }: { record?: Transaction; initialDate: string; close: () => void }) {
  const { preferences } = usePreferences()
  const { t, categoryLabel } = useI18n()
  const { mutate } = useData()
  const { busy, error, submit } = useFormCommit()
  const [draft, setDraft] = useState<Transaction>(() => record ?? { ...entity(), title: '', type: 'expense', amount: 0, currency: preferences.currency, category: 'groceries', date: initialDate, notes: '' })
  const [amount, setAmount] = useState(record ? moneyInput(record.amount, record.currency) : '')
  const patch = (value: Partial<Transaction>) => setDraft(current => ({ ...current, ...value }))
  const categories = draft.type === 'income' ? incomeCategories : expenseCategories
  return <form onSubmit={event => { void submit(event, transactionSchema, () => ({ ...draft, amount: parseMoney(amount, draft.currency) }), value => mutate(data => saveRecord(data, 'transactions', value), t('common.saved')), close) }}>
    <div className="form-grid">
      <Field className="form-full" label={t('common.title')}><input required maxLength={140} placeholder={t('money.titlePlaceholder')} value={draft.title} onChange={event => patch({ title: event.target.value })} /></Field>
      <Field label={t('money.type')}><select value={draft.type} onChange={event => { const type = event.target.value as Transaction['type']; patch({ type, category: type === 'income' ? 'salary' : 'groceries' }) }}><option value="expense">{t('money.expense')}</option><option value="income">{t('money.income')}</option></select></Field>
      <Field label={t('common.category')}><select value={draft.category} onChange={event => patch({ category: event.target.value })}>{[...new Set([...categories, draft.category])].map(category => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></Field>
      <Field label={t('common.amount')}><input type="number" inputMode="decimal" required min={currencyDigits(draft.currency) ? '.01' : '1'} step={currencyDigits(draft.currency) ? '.01' : '1'} value={amount} onChange={event => setAmount(event.target.value)} /></Field>
      <Field label={t('common.currency')}><select value={draft.currency} onChange={event => patch({ currency: event.target.value as Currency })}>{currencies.map(currency => <option value={currency} key={currency}>{currency}</option>)}</select></Field>
      <Field className="form-full" label={t('common.date')}><input type="date" required min="1900-01-01" max="2200-12-31" value={draft.date} onChange={event => patch({ date: event.target.value })} /></Field>
      <Field className="form-full" label={t('common.notes')} optional><textarea maxLength={3000} value={draft.notes} onChange={event => patch({ notes: event.target.value })} /></Field>
    </div><p className="field-hint mt-4">{t('money.amountHint', { currency: draft.currency, digits: currencyDigits(draft.currency) })}</p><FormError message={error} /><FormActions onCancel={close} busy={busy} label={t(record ? 'common.save' : 'money.create')} />
  </form>
}

export function BudgetForm({ record, month, close }: { record?: Budget; month: string; close: () => void }) {
  const { preferences } = usePreferences()
  const { t, categoryLabel } = useI18n()
  const { data, mutate } = useData()
  const { busy, error, submit } = useFormCommit()
  const [draft, setDraft] = useState<Budget>(() => record ?? { ...entity(), category: 'groceries', month: month || monthKey(dateKey()), amount: 0, currency: preferences.currency })
  const [amount, setAmount] = useState(record ? moneyInput(record.amount, record.currency) : '')
  const patch = (value: Partial<Budget>) => setDraft(current => ({ ...current, ...value }))
  return <form onSubmit={event => { void submit(event, budgetSchema, () => {
    if (data.budgets.some(budget => budget.id !== draft.id && budget.month === draft.month && budget.category === draft.category && budget.currency === draft.currency)) throw new Error('invalid-budget-duplicate')
    return { ...draft, amount: parseMoney(amount, draft.currency) }
  }, value => mutate(workspace => saveRecord(workspace, 'budgets', value), t('common.saved')), close) }}>
    <div className="form-grid">
      <Field label={t('common.category')}><select value={draft.category} onChange={event => patch({ category: event.target.value })}>{[...new Set([...expenseCategories, draft.category])].map(category => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></Field>
      <Field label={t('money.budgetMonth')}><input type="month" required min="1900-01" max="2200-12" value={draft.month} onChange={event => patch({ month: event.target.value })} /></Field>
      <Field label={t('common.amount')}><input type="number" inputMode="decimal" required min={currencyDigits(draft.currency) ? '.01' : '1'} step={currencyDigits(draft.currency) ? '.01' : '1'} value={amount} onChange={event => setAmount(event.target.value)} /></Field>
      <Field label={t('common.currency')}><select value={draft.currency} onChange={event => patch({ currency: event.target.value as Currency })}>{currencies.map(currency => <option value={currency} key={currency}>{currency}</option>)}</select></Field>
    </div><FormError message={error} /><FormActions onCancel={close} busy={busy} label={t(record ? 'common.save' : 'money.newBudget')} />
  </form>
}

export function GoalForm({ record, close }: { record?: SavingsGoal; close: () => void }) {
  const { preferences } = usePreferences()
  const { t } = useI18n()
  const { mutate } = useData()
  const { busy, error, submit } = useFormCommit()
  const [draft, setDraft] = useState<SavingsGoal>(() => record ?? { ...entity(), name: '', target: 0, saved: 0, currency: preferences.currency, notes: '' })
  const [target, setTarget] = useState(record ? moneyInput(record.target, record.currency) : '')
  const [saved, setSaved] = useState(record ? moneyInput(record.saved, record.currency) : '0')
  const patch = (value: Partial<SavingsGoal>) => setDraft(current => ({ ...current, ...value }))
  return <form onSubmit={event => { void submit(event, savingsGoalSchema, () => ({ ...draft, target: parseMoney(target, draft.currency), saved: parseMoney(saved, draft.currency) }), value => mutate(data => saveRecord(data, 'savingsGoals', value), t('common.saved')), close) }}>
    <div className="form-grid">
      <Field className="form-full" label={t('common.name')}><input required maxLength={140} value={draft.name} onChange={event => patch({ name: event.target.value })} /></Field>
      <Field label={t('money.target')}><input type="number" inputMode="decimal" required min={currencyDigits(draft.currency) ? '.01' : '1'} step={currencyDigits(draft.currency) ? '.01' : '1'} value={target} onChange={event => setTarget(event.target.value)} /></Field>
      <Field label={t('money.savedAmount')}><input type="number" inputMode="decimal" required min="0" step={currencyDigits(draft.currency) ? '.01' : '1'} value={saved} onChange={event => setSaved(event.target.value)} /></Field>
      <Field label={t('common.currency')}><select value={draft.currency} onChange={event => patch({ currency: event.target.value as Currency })}>{currencies.map(currency => <option value={currency} key={currency}>{currency}</option>)}</select></Field>
      <Field label={t('money.deadline')} optional><input type="date" min="1900-01-01" max="2200-12-31" value={draft.deadline ?? ''} onChange={event => patch({ deadline: event.target.value || undefined })} /></Field>
      <Field className="form-full" label={t('common.notes')} optional><textarea maxLength={3000} value={draft.notes} onChange={event => patch({ notes: event.target.value })} /></Field>
    </div><p className="field-hint mt-4">{t('money.goalHelp')}</p><FormError message={error} /><FormActions onCancel={close} busy={busy} label={t(record ? 'common.save' : 'money.newGoal')} />
  </form>
}
