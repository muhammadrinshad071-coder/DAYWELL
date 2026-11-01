import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router-dom'

const subscribeOnline = (callback: () => void) => {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => { window.removeEventListener('online', callback); window.removeEventListener('offline', callback) }
}
export const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)

const subscribeTheme = (callback: () => void) => {
  const media = matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
export const useSystemDark = () => useSyncExternalStore(subscribeTheme, () => matchMedia('(prefers-color-scheme: dark)').matches, () => false)

export function useEditorQuery(onNew: () => void, onFocus: (id: string) => void) {
  const [params, setParams] = useSearchParams()
  const handlers = useRef({ onNew, onFocus })
  useEffect(() => { handlers.current = { onNew, onFocus } }, [onNew, onFocus])
  useEffect(() => {
    if (params.get('new')) handlers.current.onNew()
    else if (params.get('focus')) handlers.current.onFocus(params.get('focus')!)
    else return
    const cleaned = new URLSearchParams(params)
    cleaned.delete('new'); cleaned.delete('focus')
    setParams(cleaned, { replace: true })
  }, [params, setParams])
}
