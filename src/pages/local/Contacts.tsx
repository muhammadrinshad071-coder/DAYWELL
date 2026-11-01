import { useState } from 'react'
import { ArrowUpRight, MapPin, Pencil, Phone, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useI18n } from '../../core/i18n'
import { contactSchema, entity, type LocalContact } from '../../core/models'
import { removeRecord, saveRecord } from '../../core/operations'
import { useData, useFeedback } from '../../state/context'
import { useEditorQuery, useOnline } from '../../state/hooks'
import { useFormCommit } from '../../state/useFormCommit'
import { ActionMenu, Badge, Button, Card, EmptyState, Field, FilterSearch, FormActions, FormError, Modal } from '../../components/ui'

function ContactForm({ record, close }: { record?: LocalContact; close: () => void }) {
  const { t } = useI18n()
  const { mutate } = useData()
  const { busy, error, submit } = useFormCommit()
  const [draft, setDraft] = useState<LocalContact>(() => record ?? { ...entity(), name: '', category: t('local.defaultCategory'), phone: '', address: '', emergency: false, notes: '' })
  const patch = (value: Partial<LocalContact>) => setDraft(current => ({ ...current, ...value }))
  return <form onSubmit={event => { void submit(event, contactSchema, () => draft, value => mutate(data => saveRecord(data, 'contacts', value), t('common.saved')), close) }}>
    <div className="form-grid">
      <Field className="form-full" label={t('common.name')}><input required maxLength={140} value={draft.name} onChange={event => patch({ name: event.target.value })} /></Field>
      <Field label={t('common.category')}><input required maxLength={60} value={draft.category} onChange={event => patch({ category: event.target.value })} /></Field>
      <Field label={t('local.phone')} hint={t('local.phoneHelp')}><input type="tel" required={!draft.address.trim()} maxLength={30} value={draft.phone} onChange={event => patch({ phone: event.target.value })} /></Field>
      <Field className="form-full" label={t('local.address')} optional><textarea maxLength={500} value={draft.address} onChange={event => patch({ address: event.target.value })} /></Field>
      <Field className="form-full" label={t('common.notes')} optional><textarea maxLength={3000} value={draft.notes} onChange={event => patch({ notes: event.target.value })} /></Field>
      <label className="checkbox-label form-full"><input type="checkbox" checked={draft.emergency} onChange={event => patch({ emergency: event.target.checked })} />{t('local.emergencyContact')}</label>
    </div>
    <FormError message={error} /><FormActions onCancel={close} busy={busy} label={t(record ? 'common.save' : 'local.saveContact')} />
  </form>
}

export default function Contacts() {
  const { data, mutate } = useData()
  const { confirm } = useFeedback()
  const { t } = useI18n()
  const online = useOnline()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [emergencyOnly, setEmergencyOnly] = useState(false)
  const [editing, setEditing] = useState<LocalContact>()
  const [open, setOpen] = useState(false)
  const create = () => { setEditing(undefined); setOpen(true) }
  const edit = (record: LocalContact) => { setEditing(record); setOpen(true) }
  useEditorQuery(create, id => { const record = data.contacts.find(contact => contact.id === id); if (record) edit(record) })
  const contacts = data.contacts.filter(record => (category === '' || record.category === category) && (!emergencyOnly || record.emergency) && [record.name, record.category, record.phone, record.address, record.notes].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => Number(b.emergency) - Number(a.emergency) || a.name.localeCompare(b.name))
  const clear = () => { setQuery(''); setCategory(''); setEmergencyOnly(false) }
  const remove = async (record: LocalContact) => {
    if (await confirm({ title: t('common.deleteTitle', { name: record.name }), description: t('common.deleteDetail'), danger: true }))
      await mutate(draft => removeRecord(draft, 'contacts', record.id), t('common.deleted'))
  }
  return <section className="saved-contacts" aria-labelledby="saved-contacts-heading">
    <div className="section-heading"><div><h2 id="saved-contacts-heading">{t('local.contacts')}</h2><p>{t('local.contactsDetail')}</p></div><Button icon={Plus} onClick={create}>{t('local.newContact')}</Button></div>
    <div className="toolbar"><FilterSearch value={query} onChange={setQuery} placeholder={t('local.contactSearch')} /><div className="toolbar-group"><select aria-label={t('local.contactCategory')} value={category} onChange={event => setCategory(event.target.value)}><option value="">{t('common.all')} · {t('common.category')}</option>{[...new Set(data.contacts.map(record => record.category))].sort().map(value => <option key={value} value={value}>{value}</option>)}</select><label className="checkbox-label"><input type="checkbox" checked={emergencyOnly} onChange={event => setEmergencyOnly(event.target.checked)} />{t('local.emergencyOnly')}</label></div></div>
    {contacts.length ? <div className="document-grid">{contacts.map(record => <Card key={record.id} className="card-padded contact-card">
      <div className="card-heading"><span className={`icon-tile ${record.emergency ? 'amber' : 'emerald'}`}>{record.emergency ? <ShieldCheck size={20} aria-hidden="true" /> : <Phone size={20} aria-hidden="true" />}</span><ActionMenu label={`${t('common.actions')}: ${record.name}`} actions={[{ label: t('common.edit'), icon: Pencil, onClick: () => edit(record) }, { label: t('common.delete'), icon: Trash2, danger: true, onClick: () => { void remove(record) } }]} /></div>
      <div className="contact-badges"><Badge>{record.category}</Badge>{record.emergency && <Badge tone="amber">{t('local.emergencyContact')}</Badge>}</div>
      <h3>{record.name}</h3>
      {record.phone && <p className="contact-phone">{record.phone}</p>}
      {record.address && <p className="contact-address"><MapPin size={14} aria-hidden="true" />{record.address}</p>}
      {record.notes && <p className="contact-notes">{record.notes}</p>}
      <div className="record-actions">{record.phone && <a className="btn btn-primary btn-small" href={`tel:${record.phone.replace(/[^+\d]/g, '')}`} aria-label={`${t('local.call')}: ${record.name}`}><Phone size={15} aria-hidden="true" />{t('local.call')}</a>}{record.address && online && <a className="btn btn-secondary btn-small" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(record.address)}`} target="_blank" rel="noopener noreferrer" aria-label={`${t('local.showAddress')}: ${record.name}`} title={t('local.addressPrivacy')}><ArrowUpRight size={15} aria-hidden="true" />{t('local.showAddress')}</a>}<Button variant="ghost" size="small" icon={Pencil} aria-label={`${t('common.edit')}: ${record.name}`} onClick={() => edit(record)}>{t('common.edit')}</Button></div>
    </Card>)}</div> : <Card><EmptyState icon={Phone} title={t(data.contacts.length ? 'common.noResults' : 'local.contactsEmpty')} description={t(data.contacts.length ? 'common.noResultsDetail' : 'local.contactsEmptyDetail')} action={<Button icon={Plus} onClick={data.contacts.length ? clear : create}>{t(data.contacts.length ? 'common.clearFilters' : 'local.newContact')}</Button>} /></Card>}
    <Modal open={open} title={t(editing ? 'local.editContact' : 'local.newContact')} description={t('local.contactHelp')} onClose={() => setOpen(false)}>{open && <ContactForm record={editing} close={() => setOpen(false)} />}</Modal>
  </section>
}
