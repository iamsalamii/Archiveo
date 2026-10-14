'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { translations, type Locale, type TranslationKey } from '@/config/i18n';

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey | string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('fr');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ged-locale') as Locale | null;
      if (saved && (saved === 'fr' || saved === 'en')) {
        setLocale(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSet = useCallback((l: Locale) => {
    setLocale(l);
    try {
      localStorage.setItem('ged-locale', l);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey | string, fallback?: string): string => {
      const currentDict = (translations[locale] || {}) as Record<string, string>;
      if (currentDict[key]) return currentDict[key];
      const frDict = (translations.fr || {}) as Record<string, string>;
      if (frDict[key]) return frDict[key];
      return fallback ?? key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale: handleSet, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
