import { useState, type FormEvent } from 'react'
import { ArrowUpRight, Fuel, HeartPulse, LocateFixed, MapPin, Navigation, Pill, ShoppingBasket, Wrench, type LucideIcon } from 'lucide-react'
import { useI18n } from '../core/i18n'
import { mapSearchUrl, serviceTypes, type ServiceType } from '../core/local-help'
import { useFeedback, usePreferences } from '../state/context'
import { useOnline } from '../state/hooks'
import { Badge, Button, Card, Field, PageHeader } from '../components/ui'
import Contacts from './local/Contacts'

const icons: Record<ServiceType, LucideIcon> = { groceries: ShoppingBasket, hospital: HeartPulse, pharmacy: Pill, fuel: Fuel, repair: Wrench }
const accents: Record<ServiceType, string> = { groceries: 'emerald', hospital: 'violet', pharmacy: 'indigo', fuel: 'amber', repair: 'indigo' }

export default function LocalHelp() {
  const { preferences, setPreferences } = usePreferences()
  const { toast } = useFeedback()
  const { t } = useI18n()
  const online = useOnline()
  const [area, setArea] = useState(preferences.location)
  const [locating, setLocating] = useState(false)
  const save = (event: FormEvent) => {
    event.preventDefault()
    if (area.trim() && setPreferences({ location: area.trim() })) toast(t('local.saved'))
  }
  const locate = () => {
    if (!navigator.geolocation) { toast(t('local.locationError'), 'error'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(position => {
      const location = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
      setArea(location)
      if (setPreferences({ location })) toast(t('local.saved'))
      setLocating(false)
    }, () => { setLocating(false); toast(t('local.locationError'), 'error') }, { timeout: 10_000, maximumAge: 60_000, enableHighAccuracy: false })
  }
  return <><PageHeader eyebrow={t('nav.local')} title={t('local.title')} description={t('local.subtitle')} />
    <Contacts />
    <Card className="local-location-card"><div className="local-location-copy"><div className="card-heading"><div><h2>{t('local.location')}</h2><p>{t('local.enterLocation')}</p></div>{preferences.location && <Badge tone="emerald"><MapPin size={11} aria-hidden="true" />{preferences.location}</Badge>}</div><form onSubmit={save}><Field label={t('local.location')}><input required maxLength={200} placeholder={t('local.locationPlaceholder')} value={area} onChange={event => setArea(event.target.value)} /></Field><div className="local-location-actions"><Button type="submit" icon={CheckLocation}>{t('local.saveLocation')}</Button><Button variant="secondary" icon={LocateFixed} busy={locating} onClick={locate}>{t(locating ? 'local.locating' : 'local.useLocation')}</Button></div></form></div><div className="local-map-art" aria-hidden="true"><div className="map-road map-road-one" /><div className="map-road map-road-two" /><div className="map-road map-road-three" /><span className="map-park" /><span className="map-building" /><span className="map-building map-building-two" /><div className="map-pin"><MapPin size={38} strokeWidth={1.7} /></div><span className="map-ring" /></div></Card>
    <div className="notice mt-5 mb-5"><Navigation size={17} aria-hidden="true" /><div><strong>{t('local.notConfigured')}</strong><p>{t('local.serviceHelp')}</p></div></div>
    {!online && <div className="notice notice-amber mb-5">{t('local.offline')}</div>}
    <div className="local-service-grid">{serviceTypes.map(service => { const Icon = icons[service]; return <Card className="card-padded service-card" key={service}><span className={`icon-tile ${accents[service]}`}><Icon size={23} strokeWidth={1.7} aria-hidden="true" /></span><h2>{t(`local.${service}`)}</h2><p>{t(`local.${service}Detail`)}</p>{online && preferences.location ? <a className="btn btn-secondary" href={mapSearchUrl(service, preferences.location)} target="_blank" rel="noopener noreferrer" aria-label={`${t('local.searchMaps')}: ${t(`local.${service}`)}`}>{t('local.searchMaps')}<ArrowUpRight size={15} aria-hidden="true" /></a> : <Button variant="secondary" disabled>{t(online ? 'local.enterLocation' : 'local.offline')}</Button>}</Card> })}</div><p className="local-external-note"><ArrowUpRight size={14} aria-hidden="true" />{t('local.external')}</p>
  </>
}

const CheckLocation = MapPin
