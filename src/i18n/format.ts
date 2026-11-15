import type { Language } from '../types/health.ts';

const LOCALE_MAP: Record<Language, string> = {
  ar: 'ar-EG',
  bn: 'bn-BD',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  hi: 'hi-IN',
  pt: 'pt-PT',
  ru: 'ru-RU',
  ur: 'ur-PK',
  wo: 'wo-SN',
  zh: 'zh-CN',
};

export function getIntlLocale(language: Language): string {
  const preferred = LOCALE_MAP[language] || 'en-US';
  if (language === 'wo') {
    try {
      const supported = Intl.DateTimeFormat.supportedLocalesOf(['wo-SN', 'wo']);
      return supported[0] ?? 'fr-SN';
    } catch {
      return 'fr-SN';
    }
  }
  return preferred;
}

export function formatLocaleDate(
  dateInput: string | Date,
  language: Language,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  const d = typeof dateInput === 'string'
    ? new Date(dateInput.length === 10 ? `${dateInput}T00:00:00Z` : dateInput)
    : dateInput;
  if (Number.isNaN(d.getTime())) return String(dateInput);
  try {
    return new Intl.DateTimeFormat(getIntlLocale(language), {
      timeZone: 'UTC',
      ...options,
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      ...options,
    }).format(d);
  }
}

export function formatLocaleTime(
  dateInput: string | Date,
  language: Language,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return String(dateInput);
  try {
    return new Intl.DateTimeFormat(getIntlLocale(language), {
      timeZone: 'UTC',
      ...options,
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      ...options,
    }).format(d);
  }
}

export function formatLocaleDateTime(dateInput: string | Date, language: Language): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return String(dateInput);
  try {
    return new Intl.DateTimeFormat(getIntlLocale(language), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }
}

export function formatLocaleNumber(
  value: number,
  language: Language,
  options?: Intl.NumberFormatOptions
): string {
  if (!Number.isFinite(value)) return String(value);
  try {
    return new Intl.NumberFormat(getIntlLocale(language), options).format(value);
  } catch {
    return new Intl.NumberFormat('en-US', options).format(value);
  }
}

export function addDaysToIso(startDateIso: string, days: number): string {
  const ms = Date.parse(startDateIso.length === 10 ? `${startDateIso}T00:00:00Z` : startDateIso);
  if (!Number.isFinite(ms)) return startDateIso;
  const end = new Date(ms + Math.max(0, days) * 86400000);
  return end.toISOString().slice(0, 10);
}

export function interpolateTemplate(
  template: string,
  params: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key) =>
    key in params ? String(params[key]) : ''
  );
}
