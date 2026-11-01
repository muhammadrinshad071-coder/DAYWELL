import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, CalendarCheck2, ChevronRight, Download, FileText, Heart, LayoutDashboard, Leaf, LockKeyhole, MapPin, Menu, Moon, Search, Settings, ShoppingBasket, Sun, Wallet, WifiOff, X, type LucideIcon } from 'lucide-react'
import { useI18n } from '../core/i18n'
import type { TranslationKey } from '../core/translations/en'
import { dateKey } from '../core/dates'
import { attentionItems } from '../core/activity'
import { useClock, useData, usePreferences, usePWA } from '../state/context'
import { useOnline, useSystemDark } from '../state/hooks'
import GlobalSearch from './GlobalSearch'
import ActivityCentre from './ActivityCentre'
import { Button, IconButton, Modal } from './ui'

const navigation: { path: string; label: TranslationKey; icon: LucideIcon }[] = [
  { path: '/', label: 'nav.dashboard', icon: LayoutDashboard }, { path: '/planner', label: 'nav.planner', icon: CalendarCheck2 },
  { path: '/money', label: 'nav.money', icon: Wallet }, { path: '/reminders', label: 'nav.reminders', icon: Bell },
  { path: '/shopping', label: 'nav.shopping', icon: ShoppingBasket }, { path: '/documents', label: 'nav.documents', icon: FileText },
  { path: '/local', label: 'nav.local', icon: MapPin }, { path: '/wellness', label: 'nav.wellness', icon: Heart },
]

function WorkspaceNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n()
  return <><p className="nav-section-label">{t('nav.workspace')}</p><nav aria-label={t('nav.workspace')} className="workspace-nav">{navigation.map(({ path, label, icon: Icon }) => <NavLink key={path} to={path} end={path === '/'} onClick={onNavigate} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={19} strokeWidth={1.8} aria-hidden="true" /><span>{t(label)}</span><span className="nav-active-dot" /></NavLink>)}</nav><p className="nav-section-label nav-settings-label">{t('nav.preferences')}</p><NavLink to="/settings" onClick={onNavigate} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Settings size={19} strokeWidth={1.8} aria-hidden="true" /><span>{t('nav.settings')}</span></NavLink></>
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n()
  const { preferences, setPreferences, preferenceError } = usePreferences()
  const { saving, storageError, data, status } = useData()
  const { needRefresh, update, dismissUpdate, install } = usePWA()
  const now = useClock()
  const online = useOnline()
  const systemDark = useSystemDark()
  const dark = preferences.theme === 'dark' || (preferences.theme === 'system' && systemDark)
  const location = useLocation()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const current = navigation.find(item => item.path === location.pathname)
  const label = current?.label ?? 'nav.settings'
  const today = dateKey(now)
  const initials = preferences.name.trim().slice(0, 2).toUpperCase()
  const attention = useMemo(() => attentionItems(data, today), [data, today])
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (document.querySelector('[role="dialog"]') && !document.querySelector('.command-search')) return
        setSearchOpen(open => !open)
      }
    }
    window.addEventListener('keydown', keyboard)
    return () => window.removeEventListener('keydown', keyboard)
  }, [])
  useEffect(() => { document.title = `${t(label)} · Daywell`; window.scrollTo({ top: 0, behavior: 'instant' }) }, [location.pathname, label, t])
  return <div className="app-shell"><a className="skip-link" href="#main-content">{t('app.skip')}</a><aside className="sidebar"><NavLink className="brand" to="/"><img src="/favicon.svg" alt="" /><span><strong>{t('app.name')}</strong><small>{t('app.tagline')}</small></span></NavLink><WorkspaceNavigation /><div className="sidebar-bottom"><div className="sidebar-note"><span className="sidebar-leaf"><Leaf size={20} aria-hidden="true" /></span><strong>{t('app.privacy')}</strong><p>{t('app.privacyDetail')}</p>{install && <Button variant="secondary" size="small" icon={Download} onClick={() => { void install() }}>{t('pwa.install')}</Button>}</div><span className="local-label"><LockKeyhole size={13} aria-hidden="true" />{t('app.local')}</span></div></aside>
    <div className="app-main">
      <header className="topbar">
        <IconButton className="mobile-menu-button" icon={Menu} label={t('app.menu')} onClick={() => setMenuOpen(true)} />
        <div className="breadcrumb"><span>{t('app.name')}</span><ChevronRight size={13} aria-hidden="true" /><strong>{t(label)}</strong></div>
        <button className="global-search-trigger" onClick={() => setSearchOpen(true)} aria-keyshortcuts="Meta+k Control+k"><Search size={17} aria-hidden="true" /><span>{t('search.open')}</span><kbd>⌘ / Ctrl K</kbd></button>
        <div className="topbar-actions">
          <span className="topbar-date"><CalendarDays size={15} aria-hidden="true" />{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(now)}</span>
          <IconButton className="mobile-search-button" icon={Search} label={t('search.open')} onClick={() => setSearchOpen(true)} />
          <IconButton icon={dark ? Sun : Moon} label={t(dark ? 'settings.light' : 'settings.dark')} onClick={() => setPreferences({ theme: dark ? 'light' : 'dark' })} />
          <button className="notification-button" aria-label={t('activity.open', { count: attention.length })} title={t('activity.title')} onClick={() => setActivityOpen(true)}><Bell size={19} aria-hidden="true" />{attention.length > 0 && <span className="notification-dot" />}</button>
          <button className="avatar" aria-label={`${t('settings.profile')}${initials ? `: ${initials}` : ''}`} title={t('app.localProfile')} onClick={() => navigate('/settings')}>{initials || <Leaf size={19} aria-hidden="true" />}</button>
        </div>
      </header>
      {!online && <div className="app-banner offline-banner" role="status"><WifiOff size={16} aria-hidden="true" />{t('app.offline')}</div>}
      {storageError && <div className="app-banner error-banner" role="alert">{t('app.storageError')}</div>}
      {preferenceError && <div className="app-banner error-banner" role="alert">{t('app.preferenceError')}</div>}
      {needRefresh && <div className="app-banner update-banner"><Download size={16} aria-hidden="true" /><span>{t('pwa.updateTitle')}</span><Button size="small" onClick={() => { void update() }}>{t('pwa.update')}</Button><IconButton icon={X} label={t('common.dismiss')} onClick={dismissUpdate} /></div>}
      <main id="main-content" tabIndex={-1} className="main-content">{children}<footer className="workspace-footer"><span><LockKeyhole size={12} aria-hidden="true" />{t('app.localShort')}</span><span role="status"><span className={`save-dot ${saving ? 'save-pending' : ''}`} />{status === 'error' ? t('app.workspaceUnavailable') : status === 'loading' ? t('app.loading') : storageError ? t('app.unsaved') : saving ? t('app.saving') : t('app.online')}</span><span className="footer-wordmark">{t('app.tagline')}</span></footer></main>
    </div><nav className="mobile-bottom-nav" aria-label={t('nav.workspace')}><NavLink to="/" end><LayoutDashboard size={20} aria-hidden="true" /><span>{t('nav.home')}</span></NavLink><NavLink to="/planner"><CalendarCheck2 size={20} aria-hidden="true" /><span>{t('nav.plannerShort')}</span></NavLink><NavLink to="/money"><Wallet size={20} aria-hidden="true" /><span>{t('nav.moneyShort')}</span></NavLink><NavLink to="/wellness"><Heart size={20} aria-hidden="true" /><span>{t('nav.wellnessShort')}</span></NavLink><button onClick={() => setMenuOpen(true)}><Menu size={20} aria-hidden="true" /><span>{t('nav.more')}</span></button></nav>
    <Modal open={menuOpen} title={t('app.name')} description={t('app.local')} onClose={() => setMenuOpen(false)}><div className="mobile-drawer"><WorkspaceNavigation onNavigate={() => setMenuOpen(false)} /></div></Modal><GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    {activityOpen && <ActivityCentre attention={attention} close={() => setActivityOpen(false)} />}
  </div>
}
