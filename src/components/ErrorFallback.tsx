import { CircleAlert, RefreshCw } from 'lucide-react'
import { useI18n } from '../core/i18n'
import { Button, EmptyState } from './ui'

export default function ErrorFallback() {
  const { t } = useI18n()
  return <div className="fatal-error"><EmptyState icon={CircleAlert} title={t('error.pageTitle')} description={t('error.pageDetail')} action={<Button icon={RefreshCw} onClick={() => location.reload()}>{t('error.reload')}</Button>} /></div>
}
