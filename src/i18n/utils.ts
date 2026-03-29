import en from './en.json';
import fr from './fr.json';

export type Locale = 'en' | 'fr';

const translations = { en, fr } as const;

type TranslationTree = typeof en;

/** Get a nested translation value by dot-separated key */
export function t(locale: Locale, key: string): string {
  const parts = key.split('.');
  let current: unknown = translations[locale];
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key; // fallback to key if not found
    }
  }
  return typeof current === 'string' ? current : key;
}

/** Extract locale from URL pathname */
export function getLocaleFromPath(pathname: string): Locale {
  const segment = pathname.split('/')[1];
  if (segment === 'fr') return 'fr';
  return 'en';
}

/** Get the alternate locale path (for language toggle) */
export function getAlternatePath(pathname: string, currentLocale: Locale): string {
  const targetLocale: Locale = currentLocale === 'en' ? 'fr' : 'en';
  return pathname.replace(`/${currentLocale}`, `/${targetLocale}`);
}

export { translations };
export type { TranslationTree };
