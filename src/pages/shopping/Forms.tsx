import { newId } from '../../core/ids'
import { useState } from 'react'
import { shoppingCategories } from '../../core/categories'
import { useI18n } from '../../core/i18n'
import { entity, shoppingItemSchema, shoppingListSchema, type ShoppingItem, type ShoppingList } from '../../core/models'
import { currencies, currencyDigits, moneyInput, parseMoney, type Currency } from '../../core/money'
import { saveRecord } from '../../core/operations'
import { useData, usePreferences } from '../../state/context'
import { useFormCommit } from '../../state/useFormCommit'
import { Field, FormActions, FormError } from '../../components/ui'

export function ListForm({ record, close, onCreated }: { record?: ShoppingList; close: () => void; onCreated: (id: string) => void }) {
  const { preferences } = usePreferences()
  const { t } = useI18n()
  const { mutate } = useData()
  const { busy, error, submit } = useFormCommit()
  const [draft, setDraft] = useState<ShoppingList>(() => record ?? { ...entity(), name: '', description: '', currency: preferences.currency, reusable: false, items: [] })
  const patch = (value: Partial<ShoppingList>) => setDraft(current => ({ ...current, ...value }))
  return <form onSubmit={event => { void submit(event, shoppingListSchema, () => draft, async value => {
    const saved = await mutate(data => {
      const existing = data.shoppingLists.find(list => list.id === value.id)
      // Metadata edits preserve items committed in another tab.
      saveRecord(data, 'shoppingLists', { ...value, items: existing?.items ?? value.items })
    }, t('common.saved'))
    if (saved) onCreated(value.id)
    return saved
  }, close) }}><div className="form-stack">
    <Field label={t('common.name')}><input required maxLength={140} placeholder={t('shopping.listNamePlaceholder')} value={draft.name} onChange={event => patch({ name: event.target.value })} /></Field>
    <Field label={t('common.description')} optional><textarea maxLength={3000} value={draft.description} onChange={event => patch({ description: event.target.value })} /></Field>
    <Field label={t('common.currency')} hint={record?.items.length ? t('shopping.currencyLocked') : undefined}><select disabled={!!record?.items.length} value={draft.currency} onChange={event => patch({ currency: event.target.value as Currency })}>{currencies.map(currency => <option value={currency} key={currency}>{currency}</option>)}</select></Field>
    <label className="checkbox-label"><input type="checkbox" checked={draft.reusable} onChange={event => patch({ reusable: event.target.checked })} /><span><strong>{t('shopping.reusable')}</strong><small>{t('shopping.reusableHelp')}</small></span></label>
  </div><FormError message={error} /><FormActions onCancel={close} busy={busy} label={t(record ? 'common.save' : 'shopping.create')} /></form>
}

export function ItemForm({ record, list, close }: { record?: ShoppingItem; list: ShoppingList; close: () => void }) {
  const { t, categoryLabel } = useI18n()
  const { mutate } = useData()
  const { busy, error, submit } = useFormCommit()
  const [draft, setDraft] = useState<ShoppingItem>(() => record ?? { id: newId(), name: '', category: 'other', quantity: 1, estimatedPrice: 0, checked: false, notes: '' })
  const [estimate, setEstimate] = useState(record ? moneyInput(record.estimatedPrice, list.currency) : '')
  const [actual, setActual] = useState(record?.actualPrice !== undefined ? moneyInput(record.actualPrice, list.currency) : '')
  const patch = (value: Partial<ShoppingItem>) => setDraft(current => ({ ...current, ...value }))
  return <form onSubmit={event => { void submit(event, shoppingItemSchema, () => ({ ...draft, estimatedPrice: estimate.trim() ? parseMoney(estimate, list.currency) : 0, actualPrice: actual.trim() ? parseMoney(actual, list.currency) : undefined }), value => mutate(data => {
    const current = data.shoppingLists.find(item => item.id === list.id)
    if (!current || current.archivedAt || current.currency !== list.currency) throw new Error('invalid-list-state')
    const index = current.items.findIndex(item => item.id === value.id)
    if (index < 0) current.items.push(value)
    else current.items[index] = { ...value, checked: current.items[index].checked }
    current.updatedAt = new Date().toISOString()
  }, t('common.saved')), close) }}><div className="form-grid">
    <Field className="form-full" label={t('shopping.itemName')}><input required maxLength={140} placeholder={t('shopping.itemPlaceholder')} value={draft.name} onChange={event => patch({ name: event.target.value })} /></Field>
    <Field label={t('shopping.quantity')}><input type="number" inputMode="decimal" required min=".001" max="1000" step=".001" value={draft.quantity} onChange={event => patch({ quantity: Number(event.target.value) })} /></Field>
    <Field label={t('common.category')}><select value={draft.category} onChange={event => patch({ category: event.target.value })}>{[...new Set([...shoppingCategories, draft.category])].map(category => <option value={category} key={category}>{categoryLabel(category)}</option>)}</select></Field>
    <Field label={t('shopping.estimatedPrice')} optional><input type="number" inputMode="decimal" min="0" max={100_000_000 / 10 ** currencyDigits(list.currency)} step={currencyDigits(list.currency) ? '.01' : '1'} value={estimate} onChange={event => setEstimate(event.target.value)} /></Field>
    <Field label={t('shopping.actualPrice')} optional><input type="number" inputMode="decimal" min="0" max={100_000_000 / 10 ** currencyDigits(list.currency)} step={currencyDigits(list.currency) ? '.01' : '1'} value={actual} onChange={event => setActual(event.target.value)} /></Field>
    <Field className="form-full" label={t('common.notes')} optional><textarea maxLength={3000} value={draft.notes} onChange={event => patch({ notes: event.target.value })} /></Field>
  </div><p className="field-hint mt-4">{t('shopping.unitPriceHelp')} · {list.currency}</p><FormError message={error} /><FormActions onCancel={close} busy={busy} label={t(record ? 'common.save' : 'shopping.addItem')} /></form>
}
