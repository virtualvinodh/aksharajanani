import opentype from 'opentype.js';

/**
 * Which characters a built font actually has, so the Test page and Creator can show the
 * letters that aren't drawn yet as missing instead of quietly using another font (UX §7, F23).
 */
export const readFontCharacters = async (fontBlob: Blob): Promise<Set<number>> => {
    const font = opentype.parse(await fontBlob.arrayBuffer());
    const map = (font.tables as any)?.cmap?.glyphIndexMap as Record<string, number> | undefined;
    const codes = new Set<number>();
    if (map) for (const [code, glyph] of Object.entries(map)) if (glyph > 0) codes.add(Number(code));
    return codes;
};

export interface TextRun { text: string; missing: boolean }

// Characters that never need a drawing of their own: spaces, joiners, variation selectors, controls.
const NEEDS_NO_GLYPH = /[\s​-‏⁠︀-️­\p{Cc}]/u;

const graphemes = (text: string): string[] => {
    const Segmenter = (Intl as any).Segmenter;
    if (Segmenter) return Array.from(new Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (s: any) => s.segment as string);
    return Array.from(text);
};

/** A cluster (letter with its signs) is missing when any of its characters isn't in the font. */
export const isClusterMissing = (cluster: string, available: Set<number>): boolean => {
    for (const ch of cluster) {
        if (NEEDS_NO_GLYPH.test(ch)) continue;
        if (!available.has(ch.codePointAt(0)!)) return true;
    }
    return false;
};

/**
 * Splits text into runs of drawn and not-drawn letters. Whole clusters are kept together so
 * a letter and its vowel sign are never split, and neighbouring drawn letters stay in one run
 * (so the font's joining and spacing still apply inside it).
 */
export const splitByCoverage = (text: string, available: Set<number>): TextRun[] => {
    const runs: TextRun[] = [];
    for (const cluster of graphemes(text)) {
        const missing = isClusterMissing(cluster, available);
        const last = runs[runs.length - 1];
        if (last && last.missing === missing) last.text += cluster;
        else runs.push({ text: cluster, missing });
    }
    return runs;
};

/** The distinct letters in the text that aren't drawn yet, in the order they appear. */
export const missingLetters = (text: string, available: Set<number>): string[] => {
    const seen = new Set<string>();
    for (const cluster of graphemes(text)) if (isClusterMissing(cluster, available)) seen.add(cluster);
    return [...seen];
};
