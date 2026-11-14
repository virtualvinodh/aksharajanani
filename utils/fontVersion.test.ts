import { describe, it, expect } from 'vitest';
import { normalizeFontVersion, nextFontVersion, DEFAULT_FONT_VERSION } from './fontVersion';

describe('font version', () => {
    it('starts at 1.000 when there is none or it is unusable', () => {
        expect(normalizeFontVersion(undefined)).toBe(DEFAULT_FONT_VERSION);
        expect(normalizeFontVersion('')).toBe('1.000');
        expect(normalizeFontVersion('abc')).toBe('1.000');
        expect(normalizeFontVersion('0')).toBe('1.000');
        expect(normalizeFontVersion('40000')).toBe('1.000');
    });
    it('writes three decimals', () => {
        expect(normalizeFontVersion('1.2')).toBe('1.200');
        expect(normalizeFontVersion(' 1.0010 ')).toBe('1.001');
        expect(normalizeFontVersion('Version 2.5')).toBe('2.500');
        expect(normalizeFontVersion(3)).toBe('3.000');
    });
    it('goes up by 0.001 per export', () => {
        expect(nextFontVersion(undefined)).toBe('1.001');
        expect(nextFontVersion('1.001')).toBe('1.002');
        expect(nextFontVersion('1.999')).toBe('2.000');
        expect(nextFontVersion('1.2')).toBe('1.201');
    });
});
