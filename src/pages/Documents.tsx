import { useState } from 'react'
import { CalendarDays, CheckCheck, CircleAlert, Download, FileText, LockKeyhole, Pencil, Plus, Trash2 } from 'lucide-react'
import { attachmentSize, downloadDocumentFile, MAX_WORKSPACE_ATTACHMENT_BYTES } from '../core/attachments'
import AttachmentField from './documents/AttachmentField'
import { documentStatus } from '../core/calculations'
import { documentCategories } from '../core/categories'
import { dateKey, daysBetween, displayDate } from '../core/dates'
import { useI18n } from '../core/i18n'
import { documentSchema, entity, type PersonalDocument } from '../core/models'
import { removeRecord, saveRecord } from '../core/operations'
import { useClock, useData, useFeedback, usePreferences } from '../state/context'
import { useEditorQuery } from '../state/hooks'
import { useFormCommit } from '../state/useFormCommit'
import { ActionMenu, Badge, Button, Card, EmptyState, Field, FilterSearch, FormActions, FormError, Modal, PageHeader, StatCard } from '../components/ui'

function DocumentForm({ record, close }: { record?: PersonalDocument; close: () => void }) {
  const { t, categoryLabel } = useI18n()
  const { data, mutate } = useData()
  const { busy, error, submit, setError } = useFormCommit()
  const [readingFile, setReadingFile] = useState(false)
  const [draft, setDraft] = useState<PersonalDocument>(() => record ?? { ...entity(), name: '', category: 'identity', description: '', reminderDays: 30, notes: '' })
  const patch = (value: Partial<PersonalDocument>) => setDraft(current => ({ ...current, ...value }))
  return <form onSubmit={event => {
    event.preventDefault()
    if (busy || readingFile) return
    if (data.documents.reduce((sum, item) => sum + (item.id === draft.id ? 0 : item.attachment?.size ?? 0), draft.attachment?.size ?? 0) > MAX_WORKSPACE_ATTACHMENT_BYTES) { setError(t('documents.fileTotalError')); return }
    void submit(event, documentSchema, () => draft, value => mutate(data => saveRecord(data, 'documents', value), t('common.saved')), close)
  }}>
    <div className="form-grid">
      <Field className="form-full" label={t('common.name')}><input required maxLength={140} placeholder={t('documents.namePlaceholder')} value={draft.name} onChange={event => patch({ name: event.target.value })} /></Field>
      <Field label={t('common.category')}><select value={draft.category} onChange={event => patch({ category: event.target.value })}>{[...new Set([...documentCategories, draft.category])].map(category => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></Field>
      <Field label={t('documents.reminderDays')}><input required type="number" min="0" max="365" step="1" value={draft.reminderDays} onChange={event => patch({ reminderDays: Number(event.target.value) })} /></Field>
      <Field label={t('documents.issueDate')} optional><input type="date" min="1900-01-01" max="2200-12-31" value={draft.issueDate ?? ''} onChange={event => patch({ issueDate: event.target.value || undefined })} /></Field>
      <Field label={t('documents.expiryDate')} optional><input type="date" min={draft.issueDate ?? '1900-01-01'} max="2200-12-31" value={draft.expiryDate ?? ''} onChange={event => patch({ expiryDate: event.target.value || undefined })} /></Field>
      <Field className="form-full" label={t('common.description')} optional><textarea maxLength={3000} value={draft.description} onChange={event => patch({ description: event.target.value })} /></Field>
      <Field className="form-full" label={t('common.notes')} optional><textarea maxLength={3000} value={draft.notes} onChange={event => patch({ notes: event.target.value })} /></Field>
      <AttachmentField value={draft.attachment} onChange={attachment => patch({ attachment })} onBusy={setReadingFile} disabled={busy || readingFile} />
    </div><FormError message={error} /><FormActions onCancel={close} busy={busy || readingFile} label={t(record ? 'common.save' : 'documents.create')} />
  </form>
}

export default function Documents() {
  const { data, mutate } = useData()
  const { preferences } = usePreferences()
  const { confirm, toast } = useFeedback()
  const { t, categoryLabel, locale } = useI18n()
  const today = dateKey(useClock())
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [editing, setEditing] = useState<PersonalDocument>()
  const [open, setOpen] = useState(false)
  const create = () => { setEditing(undefined); setOpen(true) }
  const edit = (document: PersonalDocument) => { setEditing(document); setOpen(true) }
  const download = (document: PersonalDocument) => {
    if (!document.attachment) return
    try { downloadDocumentFile(document.attachment) }
    catch { toast(t('documents.downloadError'), 'error') }
  }
  useEditorQuery(create, id => { const document = data.documents.find(record => record.id === id); if (document) edit(document) })
  const documents = data.documents.filter(document => (status === 'all' || documentStatus(document, today) === status) && (category === 'all' || document.category === category) && [document.name, document.description, document.notes, categoryLabel(document.category), document.attachment?.name].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999'))
  const remove = async (document: PersonalDocument) => { if (await confirm({ title: t('common.deleteTitle', { name: document.name }), description: t('common.deleteDetail'), danger: true })) await mutate(draft => removeRecord(draft, 'documents', document.id), t('common.deleted')) }
  return <><PageHeader eyebrow={t('nav.documents')} title={t('documents.title')} description={t('documents.subtitle')} action={<Button icon={Plus} onClick={create}>{t('documents.new')}</Button>} />
    <div className="stat-grid stat-grid-3"><StatCard label={t('documents.totalMetric')} value={data.documents.length} icon={FileText} /><StatCard label={t('documents.alertMetric')} value={data.documents.filter(document => ['expired', 'renewSoon'].includes(documentStatus(document, today))).length} icon={CircleAlert} accent="amber" /><StatCard label={t('documents.valid')} value={data.documents.filter(document => documentStatus(document, today) === 'valid').length} icon={CheckCheck} accent="emerald" /></div>
    <div className="notice mb-5"><LockKeyhole size={17} aria-hidden="true" /><p>{t('documents.privacy')}</p></div>
    <div className="toolbar"><FilterSearch value={query} onChange={setQuery} placeholder={t('documents.search')} /><div className="toolbar-group"><select aria-label={t('planner.status')} value={status} onChange={event => setStatus(event.target.value)}><option value="all">{t('common.all')}</option>{(['expired', 'renewSoon', 'valid', 'noExpiry'] as const).map(value => <option value={value} key={value}>{t(`documents.${value}`)}</option>)}</select><select aria-label={t('common.category')} value={category} onChange={event => setCategory(event.target.value)}><option value="all">{t('common.all')} · {t('common.category')}</option>{[...new Set([...documentCategories, ...data.documents.map(document => document.category)])].map(value => <option value={value} key={value}>{categoryLabel(value)}</option>)}</select></div></div>
    {documents.length ? <div className="document-grid">{documents.map(document => { const state = documentStatus(document, today); const tone = state === 'expired' ? 'danger' : state === 'renewSoon' ? 'amber' : state === 'valid' ? 'emerald' : 'neutral'; return <Card className="card-padded document-card" key={document.id}><div className="card-heading"><span className="icon-tile indigo"><FileText size={20} aria-hidden="true" /></span><ActionMenu label={`${t('common.actions')}: ${document.name}`} actions={[{ label: t('common.edit'), icon: Pencil, onClick: () => edit(document) }, { label: t('common.delete'), icon: Trash2, danger: true, onClick: () => { void remove(document) } }]} /></div><Badge tone={tone}>{t(`documents.${state}`)}</Badge><h3>{document.name}</h3><p className="document-category">{categoryLabel(document.category)}</p>{document.description && <p className="document-description">{document.description}</p>}<div className="document-dates">{document.issueDate && <span><CalendarDays size={13} aria-hidden="true" />{t('documents.issuedOn', { date: displayDate(document.issueDate, preferences.dateFormat, locale) })}</span>}{document.expiryDate ? <><span className={state === 'expired' ? 'text-danger' : ''}><CalendarDays size={13} aria-hidden="true" />{t('documents.expiresOn', { date: displayDate(document.expiryDate, preferences.dateFormat, locale) })}</span>{state !== 'expired' && <small>{t('documents.expiresIn', { count: daysBetween(today, document.expiryDate) })}</small>}</> : <span>{t('documents.noExpiry')}</span>}</div>{document.attachment && <p className="document-file-name"><FileText size={14} aria-hidden="true" /><span>{document.attachment.name} &middot; {attachmentSize(document.attachment.size)}</span></p>}<div className="record-actions">{document.attachment && <Button variant="secondary" size="small" icon={Download} aria-label={`${t('documents.downloadFile')}: ${document.name}`} onClick={() => download(document)}>{t('documents.downloadFile')}</Button>}<Button variant="secondary" size="small" icon={Pencil} onClick={() => edit(document)}>{t(state === 'expired' || state === 'renewSoon' ? 'documents.renew' : 'common.edit')}</Button></div></Card> })}</div> : <Card><EmptyState icon={FileText} title={t(data.documents.length ? 'common.noResults' : 'documents.empty')} description={t(data.documents.length ? 'common.noResultsDetail' : 'documents.emptyDetail')} action={<Button icon={Plus} onClick={() => data.documents.length ? (setQuery(''), setStatus('all'), setCategory('all')) : create()}>{t(data.documents.length ? 'common.clearFilters' : 'documents.new')}</Button>} /></Card>}
    <Modal open={open} title={t(editing ? 'documents.edit' : 'documents.new')} onClose={() => setOpen(false)}>{open && <DocumentForm record={editing} close={() => setOpen(false)} />}</Modal>
  </>
}
