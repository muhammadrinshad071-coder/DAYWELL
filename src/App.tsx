import { lazy, Suspense } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { CircleAlert, RefreshCw } from 'lucide-react'
import { useI18n } from './core/i18n'
import { useData } from './state/context'
import Notifications from './state/Notifications'
import AppShell from './components/AppShell'
import { Button, Card, EmptyState, PageSkeleton } from './components/ui'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Planner = lazy(() => import('./pages/Planner'))
const Money = lazy(() => import('./pages/Money'))
const Reminders = lazy(() => import('./pages/Reminders'))
const Shopping = lazy(() => import('./pages/Shopping'))
const Documents = lazy(() => import('./pages/Documents'))
const LocalHelp = lazy(() => import('./pages/LocalHelp'))
const Wellness = lazy(() => import('./pages/Wellness'))
const Settings = lazy(() => import('./pages/Settings'))

function NotFound() {
  const { t } = useI18n()
  const navigate = useNavigate()
  return <Card><EmptyState title={t('error.notFound')} description={t('error.notFoundDetail')} action={<Button onClick={() => navigate('/')}>{t('error.home')}</Button>} /></Card>
}

export default function App() {
  const { status, refresh } = useData()
  const { t } = useI18n()
  const location = useLocation()
  return <AppShell><Notifications />{status === 'loading' ? <PageSkeleton /> : status === 'error' ? <Card><EmptyState icon={CircleAlert} title={t('app.storageTitle')} description={t('app.storageLoadError')} action={<Button icon={RefreshCw} onClick={() => { void refresh() }}>{t('app.retry')}</Button>} /></Card>
    : <AnimatePresence mode="wait" initial={false}><m.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .17 }}><Suspense fallback={<PageSkeleton />}><Routes location={location}><Route path="/" element={<Dashboard />} /><Route path="/planner" element={<Planner />} /><Route path="/money" element={<Money />} /><Route path="/reminders" element={<Reminders />} /><Route path="/shopping" element={<Shopping />} /><Route path="/documents" element={<Documents />} /><Route path="/local" element={<LocalHelp />} /><Route path="/wellness" element={<Wellness />} /><Route path="/settings" element={<Settings />} /><Route path="*" element={<NotFound />} /></Routes></Suspense></m.div></AnimatePresence>}</AppShell>
}
