import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from '../locales/fr/common.json';
import en from '../locales/en/common.json';

const resources = {
  fr: { translation: fr },
  en: { translation: en },
};

const storedLanguage = typeof window !== 'undefined' ? window.localStorage.getItem('preferredLanguage') : null;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: storedLanguage ?? undefined,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export function t(key: string, options?: Record<string, unknown>) {
  return i18n.t(key, options);
}

export function changeLanguage(language: string) {
  return i18n.changeLanguage(language);
}

export function getCurrentLanguage() {
  return i18n.language?.startsWith('en') ? 'en' : 'fr';
}

export default i18n;
