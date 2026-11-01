import { useCallback } from 'react'
import { usePreferences } from '../state/context'
import { en, type TranslationKey } from './translations/en'

const previews: Record<'hi' | 'ml', Partial<Record<TranslationKey, string>>> = {
  hi: { 'nav.dashboard': 'अवलोकन', 'nav.planner': 'दैनिक योजनाकार', 'nav.reminders': 'अनुस्मारक', 'nav.settings': 'सेटिंग्स', 'common.today': 'आज', 'common.cancel': 'रद्द करें', 'common.save': 'सहेजें' },
  ml: { 'nav.dashboard': 'അവലോകനം', 'nav.planner': 'ദൈനംദിന ആസൂത്രണം', 'nav.reminders': 'ഓർമ്മപ്പെടുത്തലുകൾ', 'nav.settings': 'ക്രമീകരണങ്ങൾ', 'common.today': 'ഇന്ന്', 'common.cancel': 'റദ്ദാക്കുക', 'common.save': 'സേവ് ചെയ്യുക' },
}

export function translate(key: TranslationKey, language: 'en' | 'hi' | 'ml', values: Record<string, string | number> = {}): string {
  const text: string = language === 'en' ? en[key] : previews[language][key] ?? en[key]
  return text.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match))
}

export function useI18n() {
  const { preferences } = usePreferences()
  const t = useCallback((key: TranslationKey, values?: Record<string, string | number>) => translate(key, preferences.language, values), [preferences.language])
  const categoryLabel = useCallback((category: string) => {
    const key = `category.${category}` as TranslationKey
    return key in en ? t(key) : category
  }, [t])
  return { t, categoryLabel, locale: preferences.language === 'en' ? 'en-IN' : `${preferences.language}-IN` }
}
