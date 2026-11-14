import type { Language } from '../types/health';

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flagCodes: readonly string[]; // ISO 3166-1 alpha-2 lowercase codes for flag-icons SVG
  fullyTranslated: boolean;
}

// Alphabetical A-Z list with SVG country codes from flag-icons (never emoji)
export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [
  {
    code: 'ar',
    name: 'Arabic (Standard)',
    nativeName: 'العربية',
    flagCodes: ['eg', 'sa', 'ma', 'ae'],
    fullyTranslated: true,
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    flagCodes: ['bd', 'in'],
    fullyTranslated: true,
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flagCodes: ['gb', 'us', 'ca', 'au'],
    fullyTranslated: true,
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flagCodes: ['fr', 'ca', 'be', 'ch'],
    fullyTranslated: true,
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flagCodes: ['in'],
    fullyTranslated: true,
  },
  {
    code: 'zh',
    name: 'Mandarin Chinese',
    nativeName: '中文',
    flagCodes: ['cn', 'tw'],
    fullyTranslated: true,
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flagCodes: ['br', 'pt'],
    fullyTranslated: true,
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flagCodes: ['ru', 'kz'],
    fullyTranslated: true,
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flagCodes: ['es', 'mx', 'ar', 'co'],
    fullyTranslated: true,
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    flagCodes: ['pk', 'in'],
    fullyTranslated: true,
  },
  {
    code: 'wo',
    name: 'Wolof',
    nativeName: 'Wolof',
    flagCodes: ['sn'],
    fullyTranslated: true,
  },
] as const;

export function getLanguageOption(code: Language): LanguageOption {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[2];
}

export function normalizeLanguage(raw: string | undefined | null): Language {
  if (!raw) return 'en';
  const found = SUPPORTED_LANGUAGES.find((l) => l.code === raw);
  return found ? found.code : 'en';
}
