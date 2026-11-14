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
