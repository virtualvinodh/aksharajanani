import { describe, it, expect } from 'vitest';
import { marksAreAccents } from './marksWording';

describe('marksAreAccents', () => {
    it('European languages and Sanskrit in English letters have accents', () => {
        expect(marksAreAccents({ id: 'spanish', region: 'europe' })).toBe(true);
        expect(marksAreAccents({ id: 'latin_indic', region: 'southAsia' })).toBe(true);
    });
    it('Indian and other scripts have combining marks', () => {
        expect(marksAreAccents({ id: 'tamil', region: 'southAsia' })).toBe(false);
        expect(marksAreAccents({ id: 'thai', region: 'southeastAsia' })).toBe(false);
    });
    it('languages from the language list go by their alphabet', () => {
        expect(marksAreAccents({ id: 'lang_nb', rulesData: { latn: { liga: {} } } })).toBe(true);
        expect(marksAreAccents({ id: 'lang_ja', rulesData: { kana: { liga: {} } } })).toBe(false);
    });
});
