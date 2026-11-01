import { Children, cloneElement, isValidElement, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, m } from 'motion/react'
import { Check, ChevronDown, LoaderCircle, MoreHorizontal, SearchX, X, type LucideIcon } from 'lucide-react'
import { useI18n } from '../core/i18n'
import { formatMoney, type Currency } from '../core/money'
import { usePreferences } from '../state/context'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'normal' | 'small' | 'icon'
  icon?: LucideIcon
  busy?: boolean
}

export function Button({ variant = 'primary', size = 'normal', icon: Icon, busy, children, className = '', disabled, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={`btn btn-${variant} btn-${size} ${className}`} disabled={disabled || busy} aria-busy={busy || undefined} {...props}>
    {busy ? <LoaderCircle size={17} className="spin" aria-hidden="true" /> : Icon ? <Icon size={17} aria-hidden="true" /> : null}{children}
  </button>
}

export function IconButton({ icon, label, ...props }: Omit<ButtonProps, 'children'> & { label: string }) {
  return <Button {...props} icon={icon} size="icon" variant={props.variant ?? 'ghost'} aria-label={label} title={label} />
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action && <div className="page-heading-action">{action}</div>}</header>
}

export function StatCard({ label, value, detail, icon: Icon, accent = 'indigo' }: { label: string; value: ReactNode; detail?: ReactNode; icon: LucideIcon; accent?: string }) {
  return <Card className="stat-card"><div className="stat-top"><span>{label}</span><span className={`icon-tile ${accent}`}><Icon size={19} aria-hidden="true" /></span></div><div className="stat-value">{value}</div>{detail && <div className="stat-detail">{detail}</div>}</Card>
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function Progress({ value, label, tone = 'indigo', small = false }: { value: number; label: string; tone?: string; small?: boolean }) {
  const bounded = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))
  return <div className={`progress ${small ? 'progress-small' : ''}`} role="progressbar" aria-valuenow={Math.round(bounded)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
    <m.div className={`progress-fill ${tone}`} initial={{ width: 0 }} animate={{ width: `${bounded}%` }} transition={{ duration: .65, ease: 'easeOut' }} />
  </div>
}

export function EmptyState({ icon: Icon = SearchX, title, description, action, compact = false }: { icon?: LucideIcon; title: string; description?: string; action?: ReactNode; compact?: boolean }) {
  return <div className={`empty-state ${compact ? 'empty-compact' : ''}`}><div className="empty-icon"><Icon size={compact ? 23 : 29} strokeWidth={1.5} aria-hidden="true" /></div><h3>{title}</h3>{description && <p>{description}</p>}{action && <div className="empty-action">{action}</div>}</div>
}

export function Field({ label, hint, optional, children, className = '' }: { label: string; hint?: string; optional?: boolean; children: ReactElement; className?: string }) {
  const id = useId()
  const { t } = useI18n()
  const control = cloneElement(children as ReactElement<{ id?: string; 'aria-describedby'?: string }>, { id, ...(hint ? { 'aria-describedby': `${id}-hint` } : {}) })
  return <div className={`field ${className}`}><div className="field-label"><label htmlFor={id}>{label}</label>{optional && <span className="optional" aria-hidden="true">{t('common.optional')}</span>}</div>{control}{hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}</div>
}

export function FormActions({ onCancel, busy, label }: { onCancel: () => void; busy?: boolean; label: string }) {
  const { t } = useI18n()
  return <footer className="form-actions"><Button variant="secondary" onClick={onCancel} disabled={busy}>{t('common.cancel')}</Button><Button type="submit" busy={busy} icon={Check}>{label}</Button></footer>
}

export function FormError({ message }: { message: string }) {
  return message ? <p className="form-error" role="alert">{message}</p> : null
}

export function Tabs<T extends string>({ value, options, onChange, label, compact = false }: { value: T; options: { value: T; label: string; icon?: LucideIcon }[]; onChange: (value: T) => void; label: string; compact?: boolean }) {
  return <div className={`tabs ${compact ? 'tabs-compact' : ''}`} role="tablist" aria-label={label}>{options.map(({ value: key, label: text, icon: Icon }, index) => <button key={key} role="tab" aria-selected={value === key} tabIndex={value === key ? 0 : -1} className={value === key ? 'selected' : ''} onClick={() => onChange(key)} onKeyDown={event => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length
    onChange(options[next].value)
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus()
  }}>{Icon && <Icon size={16} aria-hidden="true" />}{text}</button>)}</div>
}

export function Modal({ open, title, description, onClose, children, wide = false }: { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  const { t } = useI18n()
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => {
      const target = panel.current?.querySelector<HTMLElement>('[data-autofocus], input:not([type="checkbox"]), textarea, select') ?? panel.current
      target?.focus()
    })
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return }
      if (event.key !== 'Tab') return
      const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]') ?? []).filter(control => control.offsetParent !== null)
      if (!controls.length) { event.preventDefault(); panel.current?.focus(); return }
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus() }
  }, [open])
  return createPortal(<AnimatePresence>{open && <m.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <m.div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? `${titleId}-description` : undefined} tabIndex={-1} className={`modal-panel ${wide ? 'modal-wide' : ''}`} initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .98 }} transition={{ duration: .18 }}>
      <div className="modal-heading"><div><h2 id={titleId}>{title}</h2>{description && <p id={`${titleId}-description`}>{description}</p>}</div><IconButton icon={X} label={t('common.close')} onClick={onClose} /></div>{children}
    </m.div>
  </m.div>}</AnimatePresence>, document.body)
}

export function ActionMenu({ actions, label }: { actions: { label: string; icon?: LucideIcon; onClick: () => void; danger?: boolean }[]; label: string }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const dismiss = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); root.current?.querySelector('button')?.focus() } }
    document.addEventListener('click', dismiss)
    document.addEventListener('keydown', escape)
    root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
    return () => { document.removeEventListener('click', dismiss); document.removeEventListener('keydown', escape) }
  }, [open])
  return <div className="action-menu" ref={root}><IconButton icon={MoreHorizontal} label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)} />
    <AnimatePresence>{open && <m.div role="menu" className="dropdown" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} onKeyDown={event => {
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
      event.preventDefault()
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'))
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
      buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus()
    }}>{actions.map(({ label: text, icon: Icon, onClick, danger }) => <button key={text} role="menuitem" className={danger ? 'text-danger' : ''} onClick={() => { setOpen(false); onClick() }}>{Icon && <Icon size={16} aria-hidden="true" />}{text}</button>)}</m.div>}</AnimatePresence>
  </div>
}

export function Amount({ value, currency, compact = false }: { value: number; currency?: Currency; compact?: boolean }) {
  const { preferences } = usePreferences()
  const { locale } = useI18n()
  return <>{formatMoney(value, currency ?? preferences.currency, locale, compact)}</>
}

export function FilterSearch({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  const { t } = useI18n()
  return <div className="filter-search"><SearchX size={17} aria-hidden="true" /><input type="search" aria-label={placeholder} placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)} />{value && <IconButton icon={X} label={t('common.clear')} onClick={() => onChange('')} />}</div>
}

export function CheckButton({ checked, onClick, label, disabled }: { checked: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return <button type="button" className={`check-button ${checked ? 'checked' : ''}`} aria-label={label} aria-pressed={checked} onClick={onClick} disabled={disabled}>{checked && <Check size={13} strokeWidth={3} aria-hidden="true" />}</button>
}

export function PageSkeleton() {
  const { t } = useI18n()
  return <div className="skeleton-page" aria-busy="true" aria-label={t('app.loading')}><div className="skeleton skeleton-heading" /><div className="skeleton skeleton-subheading" /><div className="stat-grid">{[1, 2, 3, 4].map(key => <div className="skeleton skeleton-stat" key={key} />)}</div><div className="skeleton-grid"><div className="skeleton skeleton-panel" /><div className="skeleton skeleton-panel" /></div></div>
}

export function SelectChevron({ children }: { children: ReactNode }) {
  return <div className="select-wrap">{Children.map(children, child => isValidElement(child) ? child : null)}<ChevronDown size={15} aria-hidden="true" /></div>
}
