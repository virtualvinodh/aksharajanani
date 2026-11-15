import { simpleHash } from './stringUtils';

/**
 * Names for the font and its files (MASTER_LIST 40; F1, F12, F25, M10).
 *
 * - The font's family name follows the project name unless the person unticks "Same as project
 *   name" (settings.fontNameFollowsProject; missing means it follows).
 * - The style defaults to "Regular" (weight 400). Styles beyond Regular/Bold/Italic/Bold Italic get
 *   the usual naming: name ID 1 "Family Light" + 2 "Regular", and 16 "Family" + 17 "Light".
 * - The PostScript name (name ID 6) must be plain ASCII letters and digits. A name in another
 *   alphabet ("எனது தமிழ் எழுத்துரு") gets a short code made from the name, so two such fonts
 *   don't clash when installed.
 */

/**
 * `base` if no project uses it yet, otherwise `base N` with N one above the highest number in use
 * ("My Tamil font", "My Tamil font 2", "My Tamil font 3"). Comparison ignores case and spacing at
 * the ends.
 */
export const nextFreeName = (base: string, existing: Iterable<string>): string => {
    const clean = base.trim().replace(/\s+\d+$/, '') || base.trim();
    const key = clean.toLocaleLowerCase();
    let highest = 0;
    for (const raw of existing) {
        const name = (raw ?? '').trim().toLocaleLowerCase();
        if (name === key) highest = Math.max(highest, 1);
        else if (name.startsWith(key + ' ')) {
            const rest = name.slice(key.length + 1);
            if (/^\d+$/.test(rest)) highest = Math.max(highest, parseInt(rest, 10));
        }
    }
    return highest === 0 ? clean : `${clean} ${highest + 1}`;
};

const RIBBI = new Map([['regular', 'Regular'], ['bold', 'Bold'], ['italic', 'Italic'], ['bold italic', 'Bold Italic']]);

const WEIGHTS: [RegExp, number][] = [
    [/\b(hairline|thin)\b/, 100],
    [/\b(extra|ultra)[\s-]?light\b/, 200],
    [/\blight\b/, 300],
    [/\b(semi|demi)[\s-]?bold\b/, 600],
    [/\b(extra|ultra)[\s-]?bold\b/, 800],
    [/\b(black|heavy)\b/, 900],
    [/\bmedium\b/, 500],
    [/\bbold\b/, 700],
];

export interface StyleInfo {
    /** As typed, tidied; "Regular" when empty. */
    style: string;
    weightClass: number;
    bold: boolean;
    italic: boolean;
    /** Regular, Bold, Italic or Bold Italic: the four styles apps group under one family name. */
    isRibbi: boolean;
}

export const styleInfo = (raw: string | undefined): StyleInfo => {
    const style = (raw ?? '').trim().replace(/\s+/g, ' ') || 'Regular';
    const lower = style.toLowerCase();
    const italic = /\b(italic|oblique)\b/.test(lower);
    const weightClass = WEIGHTS.find(([re]) => re.test(lower))?.[1] ?? 400;
    return { style: RIBBI.get(lower) ?? style, weightClass, bold: weightClass === 700, italic, isRibbi: RIBBI.has(lower) };
};

/** Plain ASCII letters and digits from a name (é → e). */
const asciiOnly = (s: string): string => s.normalize('NFKD').replace(/[^A-Za-z0-9]/g, '');

/** True when the name has letters outside plain English letters (after removing accents). */
const hasOtherLetters = (s: string): boolean => /[^\x20-\x7E]/.test(s.normalize('NFKD').replace(/\p{M}/gu, ''));

/** The PostScript name (name ID 6): "MyTamilfont-Regular", at most 63 ASCII letters and digits plus one hyphen. */
export const postScriptName = (family: string, style: string): string => {
    let fam = asciiOnly(family);
    if (hasOtherLetters(family) || fam.length < 2) fam = `${fam || 'Font'}${simpleHash(family.trim()).slice(0, 6).toUpperCase()}`;
    const sty = asciiOnly(style) || 'Regular';
    return `${fam.slice(0, 62 - sty.length)}-${sty}`;
};

export interface FontNames {
    /** Name ID 1 and 2: what older apps (Word on Windows) group by. */
    family: string;
    subfamily: string;
    /** Name ID 16 and 17, only when the style isn't Regular/Bold/Italic/Bold Italic. */
    typographicFamily?: string;
    typographicSubfamily?: string;
    /** Name ID 4. */
    fullName: string;
    /** Name ID 6. */
    postScriptName: string;
    weightClass: number;
    bold: boolean;
    italic: boolean;
}

export const fontNames = (rawFamily: string | undefined, rawStyle: string | undefined): FontNames => {
    const family = (rawFamily ?? '').trim().replace(/\s+/g, ' ') || 'My font';
    const s = styleInfo(rawStyle);
    const ps = postScriptName(family, s.style);
    const base = { fullName: `${family} ${s.style}`, postScriptName: ps, weightClass: s.weightClass, bold: s.bold, italic: s.italic };
    if (s.isRibbi) return { family, subfamily: s.style, ...base };
    return {
        family: `${family} ${s.style}`, subfamily: s.italic ? 'Italic' : 'Regular',
        typographicFamily: family, typographicSubfamily: s.style, ...base,
    };
};

/**
 * The downloaded file's name: the font name (keeping letters of any language) and its version,
 * e.g. "My Tamil font 1.003.otf". The version goes up with every download, so files don't
 * overwrite each other and sort in order. Without a version (an imported font being edited keeps
 * its own), the local date and time is used instead.
 */
export const fontFileName = (fontName: string, version?: string | null, now: Date = new Date()): string => {
    const safe = fontName.normalize('NFC').replace(/[^\p{L}\p{M}\p{N} ._()-]/gu, '_').replace(/\s+/g, ' ').replace(/^[.\s]+|[.\s]+$/g, '') || 'My font';
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = version || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}`;
    return `${safe} ${stamp}.otf`;
};
