import React, { createContext, useContext, useEffect } from 'react';
import { ar } from './ar';
import { bn } from './bn';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { hi } from './hi';
import { pt } from './pt';
import { ru } from './ru';
import { ur } from './ur';
import { zh } from './zh';
import { getLanguageOption } from '../data/languages';
import type { Language } from '../types/health';

export type Dict = typeof en;

export const DICTS: Record<Language, Dict> = {
  ar,
  bn,
  en,
  es,
  fr,
  hi,
  pt,
  ru,
  ur,
  zh,
};

export function getTextDirection(language: Language): 'rtl' | 'ltr' {
  return language === 'ar' || language === 'ur' ? 'rtl' : 'ltr';
}

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
  dict: Dict;
  isTranslationInProgress: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function resolvePath(obj: unknown, path: string): string {
  const parts = path.split('.');
  let curr: unknown = obj;
  for (const part of parts) {
    if (curr && typeof curr === 'object' && part in curr) {
      curr = (curr as Record<string, unknown>)[part];
    } else {
      return path;
    }
  }
  return typeof curr === 'string' ? curr : path;
}

export const I18nProvider: React.FC<{
  language: Language;
  setLanguage: (lang: Language) => void;
  children: React.ReactNode;
}> = ({ language, setLanguage, children }) => {
  const dict = DICTS[language] || en;
  const langMeta = getLanguageOption(language);
  const isTranslationInProgress = !langMeta.fullyTranslated;

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = getTextDirection(language);
  }, [language]);

  const t = (path: string): string => {
    const val = resolvePath(dict, path);
    if (val === path && language !== 'en') {
      return resolvePath(en, path);
    }
    return val;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, dict, isTranslationInProgress }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return ctx;
}
