import { Character, CharacterDefinition, MarkAttachmentRules, ScriptConfig } from '../types';
import { appUrl } from '../utils/appUrl';
import { toGroupRef } from '../utils/groupRef';

/** Where a combining mark sits on its letter (from data/languages.json, built by tools/data/build_languages.py). */
export type MarkPosition = 'above' | 'aboveRight' | 'below' | 'belowAttached' | 'overlay' | 'kanaVoiced';

export interface LanguageEntry {
    /** CLDR locale, e.g. "nb" or "sr-Latn". */
    code: string;
    /** English name, e.g. "Norwegian Bokmål" or "Serbian (Latin)". */
    name: string;
    /** The language's name for itself, e.g. "norsk bokmål". */
    native?: string;
    /** Other names people search by, e.g. "Norwegian". */
    also?: string[];
    /** ISO 15924 code of its writing system, e.g. "Latn". */
    script: string;
    /** Letters the language uses (one code point each). */
    letters: string;
    /** Letters seen only in names and borrowed words. */
    more?: string;
    /** Punctuation beyond the app's basic set. */
    punct?: string;
    /** The language has capital letters. */
    caps?: boolean;
    /** Article 1 of the Universal Declaration of Human Rights in this language. */
    sample?: string;
}

export interface WritingSystemInfo {
    name: string;
    /** OpenType script tag. */
    ot?: string;
    /** Noto font shown behind the drawing area. */
    font?: { fontName: string; fontUrl: string };
    /** Letters join or combine into new shapes, which this picker doesn't build. */
    complex?: boolean;
    rtl?: boolean;
}

export interface LanguageData {
    scripts: Record<string, WritingSystemInfo>;
    marks: Record<string, MarkPosition>;
    languages: LanguageEntry[];
}

let dataPromise: Promise<LanguageData> | null = null;

export const loadLanguageData = (): Promise<LanguageData> => {
    if (!dataPromise) {
        dataPromise = fetch(appUrl('data/languages.json'))
            .then(res => {
                if (!res.ok) throw new Error(`Could not load the language list (${res.status})`);
                return res.json() as Promise<LanguageData>;
            })
            .catch(err => {
                dataPromise = null; // let the next attempt retry
                throw err;
            });
    }
    return dataPromise;
};

export const splitChars = (s?: string): string[] => Array.from(s ?? '');

const isMark = (ch: string) => /^[\p{Mn}\p{Me}]$/u.test(ch);

/** Lower-case, without accents, for matching "bokmal" to "Bokmål". */
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** "Serbian (Latin)" → "Serbian": the letters shown next to each entry tell the variants apart. */
export const displayName = (lang: LanguageEntry): string =>
    lang.code.includes('-') ? lang.name.replace(/\s*\([^)]*\)$/, '') : lang.name;

/** Languages matching the query, best matches first. */
export const searchLanguages = (data: LanguageData, query: string): LanguageEntry[] => {
    const q = fold(query.trim());
    if (!q) return data.languages;
    const scored: { lang: LanguageEntry; score: number }[] = [];
    for (const lang of data.languages) {
        const names = [lang.name, lang.native ?? '', ...(lang.also ?? [])].map(fold);
        let score = Infinity;
        for (const [i, n] of names.entries()) {
            const primary = i === 0 ? 0 : 1;
            if (n === q) score = Math.min(score, primary);
            else if (n.startsWith(q)) score = Math.min(score, 2 + primary);
            else if (n.split(/[\s,()-]+/).some(w => w.startsWith(q))) score = Math.min(score, 4 + primary);
            else if (n.includes(q)) score = Math.min(score, 6 + primary);
        }
        if (score === Infinity && lang.code.toLowerCase() === q) score = 1;
        if (score === Infinity && fold(data.scripts[lang.script]?.name ?? '').startsWith(q)) score = 8;
        if (score !== Infinity) scored.push({ lang, score });
    }
    return scored.sort((a, b) => a.score - b.score || a.lang.name.localeCompare(b.lang.name)).map(s => s.lang);
};

/** Capital forms of the given letters that aren't already listed (Turkish i → İ, ı → I). */
export const capitalsFor = (letters: string[], code: string): string[] => {
    const have = new Set(letters);
    const out: string[] = [];
    for (const l of letters) {
        let up: string;
        try { up = l.toLocaleUpperCase(code); } catch { up = l.toUpperCase(); }
        if (up !== l && Array.from(up).length === 1 && !have.has(up)) {
            have.add(up);
            out.push(up);
        }
    }
    return out;
};

/** [point on the letter, point on the mark, x, y] for the app's mark attachment rules. */
type AttachmentRule = MarkAttachmentRules[string][string];
const ATTACHMENT: Record<MarkPosition, AttachmentRule> = {
    above: ['topCenter', 'bottomCenter', '0', '-30'],
    aboveRight: ['topRight', 'bottomLeft', '-20', '40'],
    below: ['bottomCenter', 'topCenter', '0', '30'],
    belowAttached: ['bottomCenter', 'topCenter'],
    overlay: ['center', 'center'],
    // Japanese ゛ ゜ tuck into the letter's top-right corner (row 12). In Noto Sans JP the mark starts
    // ~0.21 of the letter's height inside its right edge and ends ~0.16 below its top, but Noto also
    // shrinks the letter; with the letter unchanged, that much overlap runs into ぐ ぽ ポ, so this
    // goes about two thirds of the way (0.13 and 0.12 for kana ~450 units tall).
    kanaVoiced: ['topRight', 'bottomLeft', '-60', '55'],
};

export const LANGUAGE_LETTERS_SET = 'languageLetters';
export const LANGUAGE_MARKS_SET = 'languageMarks';
export const LANGUAGE_PUNCTUATION_SET = 'languagePunctuation';

export interface LanguageSets {
    definitions: CharacterDefinition[];
    /** Shapes the user draws. */
    drawCount: number;
    /** Letters built from a drawn letter and a drawn mark. */
    builtCount: number;
}

/**
 * Turns the chosen characters into the app's character sets. A letter with an accent (å, ệ)
 * is built from its plain letter and the accent, the way the German and Spanish sets do it,
 * so the user draws each accent once; its base and accent are added if missing.
 */
export const buildLanguageSets = (chosen: string[], punctuation: string[], marks: Record<string, MarkPosition>): LanguageSets => {
    const letters = new Map<string, Character>();
    const markChars = new Map<string, Character>();

    const positionOf = (mark: string): MarkPosition => marks[mark] ?? 'above';

    const addMark = (mark: string) => {
        if (!markChars.has(mark)) markChars.set(mark, { name: mark, unicode: mark.codePointAt(0)!, glyphClass: 'mark', advWidth: 0 });
    };

    const addLetter = (ch: string) => {
        if (letters.has(ch) || markChars.has(ch)) return;
        if (isMark(ch)) return addMark(ch);
        const parts = Array.from(ch.normalize('NFD'));
        if (parts.length >= 2 && !isMark(parts[0]) && parts.slice(1).every(isMark)) {
            const mark = parts[parts.length - 1];
            // ệ = ẹ + ̂ : the letter with all but the last mark, if that is a single character.
            let base = parts.length === 2 ? parts[0] : parts.slice(0, -1).join('').normalize('NFC');
            if (Array.from(base).length === 1) {
                // A mark above i or j replaces its dot (í is ı + ́), as in the Spanish set.
                const above = positionOf(mark).startsWith('above');
                if (above && base === 'i') base = 'ı';
                if (above && base === 'j') base = 'ȷ';
                addLetter(base);
                addMark(mark);
                letters.set(ch, { name: ch, unicode: ch.codePointAt(0)!, glyphClass: 'ligature', position: [base, mark], liga: [base, mark] });
                return;
            }
        }
        letters.set(ch, { name: ch, unicode: ch.codePointAt(0)!, glyphClass: 'base' });
    };

    chosen.forEach(addLetter);

    const definitions: CharacterDefinition[] = [];
    const letterList = [...letters.values()];
    if (letterList.length) definitions.push({ nameKey: LANGUAGE_LETTERS_SET, characters: letterList });
    if (markChars.size) definitions.push({ nameKey: LANGUAGE_MARKS_SET, characters: [...markChars.values()] });
    const punct = punctuation.filter(p => !letters.has(p) && !markChars.has(p));
    if (punct.length) {
        definitions.push({ nameKey: LANGUAGE_PUNCTUATION_SET, characters: punct.map((p): Character => ({ name: p, unicode: p.codePointAt(0)!, glyphClass: 'base' })) });
    }
    if (markChars.size && letterList.length) {
        // Every mark is placed on every letter; the user fine-tunes pairs in the positioning step.
        const rules: Record<string, AttachmentRule> = {};
        for (const m of markChars.keys()) rules[m] = ATTACHMENT[positionOf(m)];
        definitions.push({ markAttachment: { [toGroupRef(LANGUAGE_LETTERS_SET)]: rules } });
    }

    const builtCount = letterList.filter(c => c.glyphClass === 'ligature').length;
    return { definitions, builtCount, drawCount: letterList.length - builtCount + markChars.size + punct.length };
};

/** A plain-ASCII font name, e.g. "Norwegian Bokmål" → "NorwegianBokmalSimple" (like "germanSimple"). */
export const fontNameFor = (lang: LanguageEntry): string => {
    const ascii = displayName(lang).normalize('NFD').replace(/[^A-Za-z0-9]/g, '');
    return `${ascii || 'My'}Simple`;
};

/** A ready-to-start script for this language, based on the app's Latin template (metrics, grid, test page). */
export const buildLanguageScript = (
    lang: LanguageEntry,
    data: LanguageData,
    template: ScriptConfig,
    letterSets: CharacterDefinition[],
    extraSets: CharacterDefinition[],
): ScriptConfig => {
    const ws = data.scripts[lang.script];
    const tag = ws?.ot || 'DFLT';
    return {
        ...template,
        id: `lang_${lang.code}`,
        nameKey: displayName(lang),
        languagesKey: undefined,
        region: undefined,
        sampleText: lang.sample ?? '',
        guideFont: ws?.font ? { ...ws.font, stylisticSet: '' } : template.guideFont,
        characterSetData: [...letterSets, ...extraSets],
        rulesData: { [tag]: { liga: {} } },
        defaults: { ...template.defaults, fontName: fontNameFor(lang) },
    };
};

/** Writing systems the app already has a ready-made set for, by ISO 15924 code. */
const BUILT_IN_BY_SCRIPT: Record<string, string> = {
    Taml: 'tamil', Mlym: 'malayalam', Telu: 'telugu', Knda: 'kannada', Deva: 'devanagari', Guru: 'gurmukhi',
    Sinh: 'sinhala', Thai: 'thai', Laoo: 'lao', Hebr: 'hebrew', Grek: 'greek', Cyrl: 'cyrillic',
};
/** Languages written in the Latin alphabet that have their own ready-made set. */
const BUILT_IN_BY_LANGUAGE: Record<string, string> = { en: 'latin', es: 'spanish', fr: 'french', pt: 'portuguese', de: 'german' };

/** The language's letters that a ready-made set doesn't have (S28: e.g. Kazakh ғ һ in Cyrillic). */
export const lettersMissingFrom = (lang: LanguageEntry, setLetters: Set<string>): string[] =>
    splitChars(lang.letters).filter(c => !setLetters.has(c));

/** The app's own set for this language, if it has one. */
export const builtInScriptFor = (lang: LanguageEntry, scripts: ScriptConfig[]): ScriptConfig | undefined => {
    const id = BUILT_IN_BY_LANGUAGE[lang.code.split('-')[0]] ?? (lang.script !== 'Latn' ? BUILT_IN_BY_SCRIPT[lang.script] : undefined);
    return id ? scripts.find(s => s.id === id) : undefined;
};
