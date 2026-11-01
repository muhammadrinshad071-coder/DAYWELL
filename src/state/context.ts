import { createContext, useContext } from 'react'
import type { Preferences, Workspace } from '../core/models'

export type ToastTone = 'success' | 'error' | 'info'
export interface ConfirmOptions { title: string; description: string; confirmLabel?: string; danger?: boolean }

export const PreferencesContext = createContext<{
  preferences: Preferences
  setPreferences: (patch: Partial<Preferences>) => boolean
  preferenceError: boolean
} | null>(null)

export const FeedbackContext = createContext<{
  toast: (message: string, tone?: ToastTone) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
} | null>(null)

export const DataContext = createContext<{
  data: Workspace
  status: 'loading' | 'ready' | 'error'
  saving: boolean
  storageError: boolean
  mutate: (mutation: (draft: Workspace) => void, success?: string) => Promise<boolean>
  restore: (data: Workspace) => Promise<boolean>
  refresh: () => Promise<void>
} | null>(null)

export const ClockContext = createContext(new Date())
export const useClock = () => useContext(ClockContext)

export const PWAContext = createContext<{
  install: (() => Promise<void>) | null
  installed: boolean
  offlineReady: boolean
  needRefresh: boolean
  update: () => Promise<void>
  dismissUpdate: () => void
} | null>(null)
export function usePWA() {
  const context = useContext(PWAContext)
  if (!context) throw new Error('PWAProvider is required')
  return context
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) throw new Error('PreferencesProvider is required')
  return context
}
export function useFeedback() {
  const context = useContext(FeedbackContext)
  if (!context) throw new Error('FeedbackProvider is required')
  return context
}
export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('DataProvider is required')
  return context
}
