'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { translations, type Locale, type TranslationKey } from '@/config/i18n';

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('fr');

  useEffect(() => {
    const saved = localStorage.getItem('ged-locale') as Locale | null;
    if (saved) setLocale(saved);
  }, []);

  const handleSet = useCallback((l: Locale) => {
    setLocale(l);
    localStorage.setItem('ged-locale', l);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[locale][key] ?? translations.fr[key] ?? key,
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
