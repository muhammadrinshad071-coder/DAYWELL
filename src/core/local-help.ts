export const serviceTypes = ['groceries', 'hospital', 'pharmacy', 'fuel', 'repair'] as const
export type ServiceType = typeof serviceTypes[number]
const queries: Record<ServiceType, string> = { groceries: 'grocery shops', hospital: 'hospitals', pharmacy: 'pharmacies', fuel: 'fuel stations', repair: 'repair services' }

export interface LocalBusiness {
  id: string
  name: string
  address: string
  coordinates?: { latitude: number; longitude: number }
  sourceUrl: string
}

export interface LocalSearchProvider {
  search(service: ServiceType, location: string, signal?: AbortSignal): Promise<LocalBusiness[]>
}

// A search hand-off, not invented results or an unconfigured API call.
export function mapSearchUrl(service: ServiceType, location: string): string {
  if (!location.trim()) throw new Error('location-required')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${queries[service]} near ${location.trim()}`)}`
}
