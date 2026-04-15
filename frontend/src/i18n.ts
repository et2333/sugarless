import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import language resources
import zhTranslation from './locales/zh.json';
import enTranslation from './locales/en.json';

const resources = {
  zh: {
    translation: zhTranslation
  },
  en: {
    translation: enTranslation
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: 'en', // Force default language to English
    debug: false,
    
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
      // Disable automatic language detection from browser
      convertDetectedLanguage: (lng: string) => {
        // Force English if Chinese is detected
        if (lng.startsWith('zh')) {
          return 'en';
        }
        return lng;
      },
    },

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    react: {
      useSuspense: false,
    }
  });

export default i18n;
