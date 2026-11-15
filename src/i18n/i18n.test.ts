import test from 'node:test';
import assert from 'node:assert/strict';
import { ar } from './ar.ts';
import { bn } from './bn.ts';
import { en } from './en.ts';
import { es } from './es.ts';
import { fr } from './fr.ts';
import { hi } from './hi.ts';
import { pt } from './pt.ts';
import { ru } from './ru.ts';
import { ur } from './ur.ts';
import { wo } from './wo.ts';
import { zh } from './zh.ts';
import { SUPPORTED_LANGUAGES } from '../data/languages.ts';
import { addDaysToIso, formatLocaleDate, formatLocaleNumber, interpolateTemplate } from './format.ts';
import type { Language } from '../types/health.ts';

const ALL_DICTS: Record<Language, typeof en> = {
  ar,
  bn,
  en,
  es,
  fr,
  hi,
  pt,
  ru,
  ur,
  wo,
  zh,
};

function collectLeafPaths(obj: unknown, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof obj === 'string') {
    out.set(prefix, obj);
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      for (const [k, v] of collectLeafPaths(item, `${prefix}.${idx}`)) {
        out.set(k, v);
      }
    });
    return out;
  }
  if (obj && typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj)) {
      const next = prefix ? `${prefix}.${key}` : key;
      for (const [k, v] of collectLeafPaths(val, next)) {
        out.set(k, v);
      }
    }
  }
  return out;
}

test('all 11 supported languages are marked fullyTranslated and provide complete non-empty keys', () => {
  const enLeaves = collectLeafPaths(en);
  assert.equal(SUPPORTED_LANGUAGES.length, 11);

  for (const lang of SUPPORTED_LANGUAGES) {
    assert.equal(lang.fullyTranslated, true, `${lang.code} should be marked fullyTranslated`);
    const dict = ALL_DICTS[lang.code];
    assert.ok(dict, `Missing dictionary for ${lang.code}`);
    const leaves = collectLeafPaths(dict);
    assert.equal(leaves.size, enLeaves.size, `Leaf count mismatch for ${lang.code}`);

    for (const [key] of enLeaves) {
      const translated = leaves.get(key);
      assert.equal(typeof translated, 'string', `Missing key ${key} in ${lang.code}`);
      assert.ok(translated!.trim().length > 0, `Empty translation for ${key} in ${lang.code}`);
    }
  }
});

test('non-French dictionaries do not leak French monitor labels and non-English dictionaries translate key headers', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    const dict = ALL_DICTS[lang.code];
    if (lang.code !== 'fr') {
      assert.notEqual(
        dict.dashboard.monitor.layersBtn,
        'Calques',
        `French string 'Calques' leaked into ${lang.code}`
      );
      assert.notEqual(
        dict.settings.sexOptions.female,
        'Femme',
        `French sex option leaked into ${lang.code}`
      );
    }
    if (lang.code !== 'en') {
      assert.notEqual(
        dict.dashboard.monitor.layersBtn,
        'Layers',
        `English string 'Layers' untranslated in ${lang.code}`
      );
      assert.notEqual(
        dict.settings.sexOptions.female,
        'Female',
        `English sex option 'Female' leaked into ${lang.code}`
      );
    }
  }
});

test('i18n format helpers handle date arithmetic, template interpolation, and all 11 locales', () => {
  assert.equal(addDaysToIso('2026-10-16', 60), '2026-12-15');
  assert.equal(addDaysToIso('2026-10-16', 0), '2026-10-16');
  assert.equal(
    interpolateTemplate('Days {{start}}–{{end}} · avg {{avg}} h', { start: 26, end: 28, avg: 5.9 }),
    'Days 26–28 · avg 5.9 h'
  );

  for (const lang of SUPPORTED_LANGUAGES) {
    const formattedNum = formatLocaleNumber(14.2, lang.code);
    assert.ok(formattedNum.length > 0);
    const formattedDate = formatLocaleDate('2026-11-13', lang.code);
    assert.ok(formattedDate.length > 0);
  }
});

