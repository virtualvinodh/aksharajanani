import { ScriptConfig } from '../types';

/** OpenType script tags of alphabets whose marks people call accents (é, ά, й). */
const ACCENT_TAGS = new Set(['latn', 'grek', 'cyrl']);

/**
 * Whether marks on letters are "accents" (European languages, Sanskrit in English letters) or
 * "combining marks" (Indian and other scripts: vowel signs, virama, tone marks) in plain-word
 * messages (row 104).
 */
export const marksAreAccents = (script: Pick<ScriptConfig, 'id' | 'region' | 'rulesData'> | null | undefined): boolean => {
    if (!script) return true;
    if (script.region === 'europe' || script.id === 'latin_indic') return true;
    if (script.region) return false;
    // Languages from the language list have no region; their rules say which alphabet they use.
    const tags = Object.keys((script.rulesData as Record<string, unknown> | undefined) ?? {}).map(t => t.toLowerCase());
    return tags.length === 0 || tags.some(t => ACCENT_TAGS.has(t));
};
