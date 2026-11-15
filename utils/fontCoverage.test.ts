import { describe, it, expect } from 'vitest';
import { splitByCoverage, missingLetters, isClusterMissing } from './fontCoverage';

const has = (s: string) => new Set(Array.from(s, c => c.codePointAt(0)!));

describe('fontCoverage', () => {
    it('groups drawn and missing letters into runs, keeping spaces with their neighbours', () => {
        expect(splitByCoverage('Hello World', has('Helo'))).toEqual([
            { text: 'Hello ', missing: false },
            { text: 'W', missing: true },
            { text: 'o', missing: false },
            { text: 'r', missing: true },
            { text: 'l', missing: false },
            { text: 'd', missing: true },
        ]);
    });

    it('treats a Tamil letter with an undrawn vowel sign as missing, as one cluster', () => {
        const font = has('கம');
        expect(isClusterMissing('கா', font)).toBe(true);
        expect(isClusterMissing('க', font)).toBe(false);
        expect(splitByCoverage('காம', font)).toEqual([{ text: 'கா', missing: true }, { text: 'ம', missing: false }]);
    });

    it('lists each missing letter once', () => {
        expect(missingLetters('abcabc x', has('a'))).toEqual(['b', 'c', 'x']);
    });

    it('does not count spaces, line breaks or joiners as missing', () => {
        expect(missingLetters('a \n‍a', has('a'))).toEqual([]);
    });

    it('names only the parts that are not drawn, not the whole cluster (नमस्ते with न म स drawn)', () => {
        const font = has('नमस');
        expect(missingLetters('नमस्ते', font)).toEqual(['्', 'त', 'े']);
        // The grey box still keeps the letter and its signs together.
        expect(splitByCoverage('नमस्ते', font)).toEqual([{ text: 'नम', missing: false }, { text: 'स्ते', missing: true }]);
    });

    it('names undrawn Tamil vowel signs on their own', () => {
        expect(missingLetters('கா கி', has('க'))).toEqual(['ா', 'ி']);
    });
});
