import { useEffect, useRef, useState } from 'react'
import { FileText, Trash2 } from 'lucide-react'
import { attachmentSize, DOCUMENT_FILE_ACCEPT, readDocumentFile, type DocumentAttachment } from '../../core/attachments'
import { useI18n } from '../../core/i18n'
import { Button, Field, FormError } from '../../components/ui'

export default function AttachmentField({ value, onChange, onBusy, disabled }: { value?: DocumentAttachment; onChange: (file?: DocumentAttachment) => void; onBusy: (busy: boolean) => void; disabled: boolean }) {
  const { t } = useI18n()
  const [error, setError] = useState('')
  const request = useRef(0)
  useEffect(() => () => { request.current++ }, [])
  return <div className="form-full attachment-field">
    <Field label={t('documents.file')} optional hint={t('documents.fileHelp')}><input type="file" accept={DOCUMENT_FILE_ACCEPT} disabled={disabled} onChange={async event => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      const current = ++request.current
      setError('')
      onBusy(true)
      try { const attachment = await readDocumentFile(file); if (request.current === current) onChange(attachment) }
      catch (cause) { if (request.current === current) setError(t(cause instanceof Error && cause.message === 'attachment-size' ? 'documents.fileSizeError' : 'documents.fileTypeError')) }
      finally { if (request.current === current) onBusy(false) }
    }} /></Field>
    {value && <div className="attachment-summary"><FileText size={18} aria-hidden="true" /><div><strong>{value.name}</strong><span>{attachmentSize(value.size)}</span></div><Button variant="ghost" size="small" icon={Trash2} disabled={disabled} onClick={() => { onChange(undefined); setError('') }}>{t('documents.removeFile')}</Button></div>}
    <FormError message={error} />
  </div>
}
