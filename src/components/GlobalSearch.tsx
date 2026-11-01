import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Bell, CalendarCheck2, FileText, Heart, Phone, Search, ShoppingBasket, Target, Wallet, type LucideIcon } from 'lucide-react'
import { searchWorkspace, type SearchKind } from '../core/search'
import { useI18n } from '../core/i18n'
import { useData } from '../state/context'
import { Badge, Button, EmptyState, Modal } from './ui'
import type { TranslationKey } from '../core/translations/en'

const icons: Record<SearchKind, LucideIcon> = { tasks: CalendarCheck2, transactions: Wallet, budgets: Wallet, savingsGoals: Target, reminders: Bell, shoppingLists: ShoppingBasket, documents: FileText, contacts: Phone, habits: Heart }
const labels: Record<SearchKind, TranslationKey> = { tasks: 'nav.planner', transactions: 'nav.money', budgets: 'money.budgets', savingsGoals: 'money.goals', reminders: 'nav.reminders', shoppingLists: 'nav.shopping', documents: 'nav.documents', contacts: 'local.contacts', habits: 'nav.wellness' }

export default function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const { data } = useData()
  const { t, categoryLabel } = useI18n()
  const navigate = useNavigate()
  const { results, total } = useMemo(() => searchWorkspace(data, query, categoryLabel), [data, query, categoryLabel])
  const close = () => { onClose(); setQuery('') }
  return <Modal open={open} title={t('search.title')} onClose={close} wide><div className="command-search"><Search size={21} aria-hidden="true" /><input data-autofocus type="search" aria-label={t('search.placeholder')} placeholder={t('search.placeholder')} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); document.querySelector<HTMLButtonElement>('.search-result')?.focus() }
  }} /></div><div className="search-results" onKeyDown={event => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('.search-result'))
    if (!buttons.length) return
    event.preventDefault()
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    buttons[(current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus()
  }}>
    {!query.trim() ? <><EmptyState compact icon={Search} title={t('search.start')} description={t('search.startDetail')} /><div className="search-shortcuts"><Button variant="secondary" icon={CalendarCheck2} onClick={() => { close(); navigate('/planner') }}>{t('nav.planner')}</Button><Button variant="secondary" icon={Wallet} onClick={() => { close(); navigate('/money') }}>{t('nav.money')}</Button><Button variant="secondary" icon={Heart} onClick={() => { close(); navigate('/wellness') }}>{t('nav.wellness')}</Button></div></>
      : !results.length ? <EmptyState compact title={t('search.empty')} description={t('search.emptyDetail')} />
        : results.map(result => { const Icon = icons[result.kind]; return <button className="search-result" key={`${result.kind}:${result.id}`} onClick={() => { close(); navigate(`${result.path}?focus=${result.id}`) }}><span className="icon-tile indigo"><Icon size={19} aria-hidden="true" /></span><span className="search-result-copy"><strong>{result.title}</strong><span>{result.detail}</span></span><Badge>{t(labels[result.kind])}</Badge><ArrowUpRight size={17} aria-hidden="true" /></button> })}
  </div><div className="search-footer"><span>{query.trim() ? t('search.resultCount', { count: total }) : t('app.localShort')}</span><span>{t('search.escape')}</span></div>{total > 50 && <p className="field-hint">{t('search.more')}</p>}</Modal>
}
