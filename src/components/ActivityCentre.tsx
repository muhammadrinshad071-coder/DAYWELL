import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Bell, CalendarCheck2, FileText, Heart, Phone, ShoppingBasket, Target, Wallet, type LucideIcon } from 'lucide-react'
import { recentActivity, type ActivityItem } from '../core/activity'
import { dateKey, displayDate } from '../core/dates'
import { useI18n } from '../core/i18n'
import type { SearchKind } from '../core/search'
import type { TranslationKey } from '../core/translations/en'
import { useClock, useData, usePreferences } from '../state/context'
import { Badge, Button, EmptyState, Modal, Tabs } from './ui'

const icons: Record<SearchKind, LucideIcon> = { tasks: CalendarCheck2, transactions: Wallet, budgets: Wallet, savingsGoals: Target, reminders: Bell, shoppingLists: ShoppingBasket, documents: FileText, contacts: Phone, habits: Heart }
const labels: Record<SearchKind, TranslationKey> = { tasks: 'nav.planner', transactions: 'nav.money', budgets: 'money.budgets', savingsGoals: 'money.goals', reminders: 'nav.reminders', shoppingLists: 'nav.shopping', documents: 'nav.documents', contacts: 'local.contacts', habits: 'nav.wellness' }

export default function ActivityCentre({ attention, close }: { attention: ActivityItem[]; close: () => void }) {
  const { data } = useData()
  const { preferences } = usePreferences()
  const { t, categoryLabel, locale } = useI18n()
  const today = dateKey(useClock())
  const [tab, setTab] = useState<'attention' | 'recent'>('attention')
  const recent = useMemo(() => recentActivity(data), [data])
  const items = tab === 'attention' ? attention.slice(0, 50) : recent
  const navigate = useNavigate()
  const go = (path: string) => { close(); navigate(path) }
  return <Modal open title={t('activity.title')} description={t('activity.description')} onClose={close}>
    <Tabs value={tab} label={t('activity.title')} onChange={setTab} options={[{ value: 'attention', label: t('activity.attention', { count: attention.length }) }, { value: 'recent', label: t('activity.recent') }]} />
    <p className="field-hint activity-hint">{t(tab === 'attention' ? 'activity.attentionHelp' : 'activity.recentHelp')}</p>
    <div className="activity-list">{items.length ? items.map(item => {
      const Icon = icons[item.kind]
      const date = tab === 'recent' ? dateKey(new Date(item.date)) : item.date
      return <button className="activity-item" key={`${item.kind}:${item.id}`} onClick={() => go(`${item.path}?focus=${item.id}`)}>
        <span className="icon-tile indigo"><Icon size={19} aria-hidden="true" /></span><span className="activity-copy"><strong>{item.kind === 'budgets' ? categoryLabel(item.title) : item.title}</strong><span>{t(labels[item.kind])} · {displayDate(date, preferences.dateFormat, locale)}</span></span>{tab === 'attention' && <Badge tone={date < today ? 'danger' : date === today ? 'amber' : 'neutral'}>{t(date < today ? 'activity.overdue' : date === today ? 'common.today' : 'activity.upcoming')}</Badge>}<ArrowUpRight size={15} aria-hidden="true" />
      </button>
    }) : <EmptyState compact icon={Bell} title={t(tab === 'attention' ? 'activity.clear' : 'activity.empty')} description={t(tab === 'attention' ? 'activity.clearDetail' : 'activity.emptyDetail')} />}</div>
    <div className="record-actions"><Button variant="secondary" icon={CalendarCheck2} onClick={() => go('/planner')}>{t('nav.planner')}</Button><Button variant="secondary" icon={Bell} onClick={() => go('/reminders')}>{t('nav.reminders')}</Button></div>
  </Modal>
}
