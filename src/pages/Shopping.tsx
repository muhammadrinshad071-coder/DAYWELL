import { newId } from '../core/ids'
import { useState } from 'react'
import { CheckCheck, Copy, History, Pencil, Plus, Repeat2, ShoppingBasket, Trash2 } from 'lucide-react'
import { shoppingTotals } from '../core/calculations'
import { dateKey, displayDate } from '../core/dates'
import { useI18n } from '../core/i18n'
import { entity, type ShoppingItem, type ShoppingList } from '../core/models'
import { lineTotal } from '../core/money'
import { removeRecord, saveRecord } from '../core/operations'
import { useData, useFeedback, usePreferences } from '../state/context'
import { useEditorQuery } from '../state/hooks'
import { ActionMenu, Amount, Badge, Button, Card, CheckButton, EmptyState, FilterSearch, IconButton, Modal, PageHeader, Progress, Tabs } from '../components/ui'
import { ItemForm, ListForm } from './shopping/Forms'

export default function Shopping() {
  const { data, mutate } = useData()
  const { preferences } = usePreferences()
  const { confirm } = useFeedback()
  const { t, categoryLabel, locale } = useI18n()
  const [tab, setTab] = useState<'active' | 'history'>('active')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [listForm, setListForm] = useState(false)
  const [editingList, setEditingList] = useState<ShoppingList>()
  const [itemForm, setItemForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ShoppingItem>()
  const create = () => { setEditingList(undefined); setListForm(true) }
  useEditorQuery(create, id => { const list = data.shoppingLists.find(record => record.id === id); if (list) { setTab(list.archivedAt ? 'history' : 'active'); setQuery(''); setSelectedId(id) } })
  const lists = data.shoppingLists.filter(list => (tab === 'history' ? !!list.archivedAt : !list.archivedAt) && [list.name, list.description, ...list.items.map(item => item.name)].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const selected = lists.find(list => list.id === selectedId) ?? lists[0]
  const totals = selected ? shoppingTotals(selected) : null
  const addItem = () => { setEditingItem(undefined); setItemForm(true) }
  const deleteList = async (list: ShoppingList) => { if (await confirm({ title: t('common.deleteTitle', { name: list.name }), description: t('common.deleteDetail'), danger: true })) await mutate(draft => removeRecord(draft, 'shoppingLists', list.id), t('common.deleted')) }
  const deleteItem = async (list: ShoppingList, item: ShoppingItem) => {
    if (await confirm({ title: t('common.deleteTitle', { name: item.name }), description: t('shopping.removeItemDetail'), danger: true })) await mutate(draft => {
      const current = draft.shoppingLists.find(record => record.id === list.id)
      if (current && !current.archivedAt) { current.items = current.items.filter(record => record.id !== item.id); current.updatedAt = new Date().toISOString() }
    }, t('common.deleted'))
  }
  const reuse = async (list: ShoppingList) => {
    const copy: ShoppingList = { ...list, ...entity(), name: t('shopping.copyName', { name: list.name }).slice(0, 140), archivedAt: undefined, items: list.items.map(item => ({ ...item, id: newId(), checked: false, actualPrice: undefined })) }
    if (await mutate(draft => saveRecord(draft, 'shoppingLists', copy), t('shopping.reused'))) { setTab('active'); setQuery(''); setSelectedId(copy.id) }
  }
  const finish = async (list: ShoppingList) => {
    if (!list.items.length || list.items.some(item => !item.checked)) return
    if (await confirm({ title: t('shopping.finishTitle'), description: t('shopping.finishDetail'), confirmLabel: t('shopping.finish') })) {
      const saved = await mutate(draft => {
        const current = draft.shoppingLists.find(record => record.id === list.id)
        if (!current || !current.items.length || current.items.some(item => !item.checked)) throw new Error('invalid-list-state')
        current.archivedAt = new Date().toISOString(); current.updatedAt = current.archivedAt
      }, t('common.saved'))
      if (saved) { setTab('history'); setSelectedId(list.id) }
    }
  }
  return <><PageHeader eyebrow={t('nav.shopping')} title={t('shopping.title')} description={t('shopping.subtitle')} action={<Button icon={Plus} onClick={create}>{t('shopping.new')}</Button>} />
    <div className="toolbar"><Tabs value={tab} label={t('nav.shopping')} onChange={value => { setTab(value); setSelectedId('') }} options={[{ value: 'active', label: t('common.active'), icon: ShoppingBasket }, { value: 'history', label: t('common.history'), icon: History }]} /><FilterSearch value={query} onChange={setQuery} placeholder={t('shopping.search')} /></div>
    {!lists.length ? <Card><EmptyState icon={ShoppingBasket} title={t(query ? 'common.noResults' : tab === 'history' ? 'shopping.historyEmpty' : 'shopping.empty')} description={t(query ? 'common.noResultsDetail' : tab === 'history' ? 'shopping.historyEmptyDetail' : 'shopping.emptyDetail')} action={<Button icon={Plus} onClick={query ? () => setQuery('') : create}>{t(query ? 'common.clearFilters' : 'shopping.new')}</Button>} /></Card>
      : <div className="shopping-layout"><Card className="shopping-list-panel"><div className="table-card-heading"><h2>{t('shopping.lists')}</h2><Badge>{lists.length}</Badge></div><div className="shopping-list-buttons">{lists.map(list => { const sum = shoppingTotals(list); return <button className={selected?.id === list.id ? 'selected' : ''} key={list.id} onClick={() => setSelectedId(list.id)}><span className="list-button-icon"><ShoppingBasket size={19} aria-hidden="true" /></span><span><strong>{list.name}</strong><small>{t('shopping.itemCount', { done: sum.checked, total: list.items.length })}</small></span>{list.reusable && <Repeat2 size={13} aria-label={t('shopping.reusable')} />}</button> })}</div></Card>
        {selected && totals && <div className="grid gap-5"><Card className="card-padded shopping-detail"><div className="card-heading"><div><div className="flex items-center gap-2"><h2>{selected.name}</h2>{selected.reusable && <Badge tone="emerald">{t('shopping.reusable')}</Badge>}</div>{selected.description && <p>{selected.description}</p>}{selected.archivedAt && <p>{t('shopping.archivedOn', { date: displayDate(dateKey(new Date(selected.archivedAt)), preferences.dateFormat, locale) })}</p>}</div><ActionMenu label={`${t('common.actions')}: ${selected.name}`} actions={[...(!selected.archivedAt ? [{ label: t('common.edit'), icon: Pencil, onClick: () => { setEditingList(selected); setListForm(true) } }] : []), { label: t('shopping.copy'), icon: Copy, onClick: () => { void reuse(selected) } }, { label: t('common.delete'), icon: Trash2, danger: true, onClick: () => { void deleteList(selected) } }]} /></div><div className="shopping-summary"><div><span>{t('shopping.estimatedTotal')}</span><strong><Amount value={totals.estimated} currency={selected.currency} /></strong></div><div><span>{t('shopping.actualTotal')}</span><strong><Amount value={totals.actual} currency={selected.currency} /></strong></div><div><span>{t('shopping.projectedTotal')}</span><strong className="text-primary"><Amount value={totals.projected} currency={selected.currency} /></strong></div></div><div className="shopping-progress-label"><span>{t('shopping.itemCount', { done: totals.checked, total: selected.items.length })}</span><span>{selected.currency}</span></div><Progress value={selected.items.length ? totals.checked / selected.items.length * 100 : 0} label={selected.name} tone="emerald" /></Card>
          <Card><div className="table-card-heading"><h2>{t('common.items', { count: selected.items.length })}</h2>{!selected.archivedAt && <Button size="small" icon={Plus} onClick={addItem}>{t('shopping.addItem')}</Button>}</div>{selected.items.length ? <div className="shopping-items">{selected.items.map(item => <div className={`shopping-row ${item.checked ? 'item-checked' : ''}`} key={item.id} data-testid="shopping-item"><CheckButton checked={item.checked} disabled={!!selected.archivedAt} label={`${t(item.checked ? 'common.reopen' : 'common.complete')}: ${item.name}`} onClick={() => { void mutate(draft => { const list = draft.shoppingLists.find(record => record.id === selected.id); const current = list?.items.find(record => record.id === item.id); if (current && list && !list.archivedAt) { current.checked = !current.checked; list.updatedAt = new Date().toISOString() } }) }} /><div className="shopping-item-copy"><strong>{item.name}</strong><span>{item.quantity} × {categoryLabel(item.category)}{item.notes && ` · ${item.notes}`}</span></div><div className="shopping-item-price"><strong><Amount value={lineTotal(item.actualPrice ?? item.estimatedPrice, item.quantity)} currency={selected.currency} /></strong><small>{t(item.actualPrice !== undefined ? 'shopping.actualPrice' : 'shopping.estimatedPrice')}</small></div>{!selected.archivedAt && <div className="row-actions"><IconButton icon={Pencil} label={`${t('common.edit')}: ${item.name}`} onClick={() => { setEditingItem(item); setItemForm(true) }} /><IconButton icon={Trash2} label={`${t('common.delete')}: ${item.name}`} onClick={() => { void deleteItem(selected, item) }} /></div>}</div>)}</div> : <EmptyState compact icon={ShoppingBasket} title={t('shopping.noItems')} description={t('shopping.noItemsDetail')} action={!selected.archivedAt && <Button variant="secondary" size="small" onClick={addItem}>{t('shopping.addItem')}</Button>} />}</Card>
          <div className="shopping-footer-actions">{selected.archivedAt ? <Button icon={Repeat2} onClick={() => { void reuse(selected) }}>{t('shopping.reuse')}</Button> : <><p className="field-hint">{totals.checked !== selected.items.length || !selected.items.length ? t('shopping.finishFirst') : t('shopping.finishDetail')}</p><Button icon={CheckCheck} disabled={!selected.items.length || totals.checked !== selected.items.length} onClick={() => { void finish(selected) }}>{t('shopping.finish')}</Button></>}</div>
        </div>}
      </div>}
    <Modal open={listForm} title={t(editingList ? 'shopping.editList' : 'shopping.new')} onClose={() => setListForm(false)}>{listForm && <ListForm record={editingList} close={() => setListForm(false)} onCreated={id => { setSelectedId(id); setQuery(''); setTab('active') }} />}</Modal>
    <Modal open={itemForm && !!selected} title={t(editingItem ? 'shopping.editItem' : 'shopping.addItem')} onClose={() => setItemForm(false)}>{itemForm && selected && <ItemForm key={editingItem?.id ?? 'new'} record={editingItem} list={selected} close={() => setItemForm(false)} />}</Modal>
  </>
}
