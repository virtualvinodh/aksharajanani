import { describe, it, expect } from 'vitest';
import { nextFreeName, styleInfo, postScriptName, fontNames, fontFileName } from './fontNaming';

describe('nextFreeName', () => {
    it('keeps a name nobody uses', () => {
        expect(nextFreeName('My Tamil font', ['My English font'])).toBe('My Tamil font');
    });
    it('numbers a taken name, one above the highest', () => {
        expect(nextFreeName('My Tamil font', ['My Tamil font'])).toBe('My Tamil font 2');
        expect(nextFreeName('My Tamil font', ['My Tamil font', 'My Tamil font 2', 'my tamil font 5'])).toBe('My Tamil font 6');
    });
    it('treats "X 3" as X when asked for X 3', () => {
        expect(nextFreeName('My Tamil font 3', ['My Tamil font', 'My Tamil font 3'])).toBe('My Tamil font 4');
    });
    it('works for names in other alphabets', () => {
        expect(nextFreeName('எனது தமிழ் எழுத்துரு', ['எனது தமிழ் எழுத்துரு'])).toBe('எனது தமிழ் எழுத்துரு 2');
    });
});

describe('styleInfo', () => {
    it('defaults to Regular, weight 400', () => {
        expect(styleInfo('')).toMatchObject({ style: 'Regular', weightClass: 400, isRibbi: true });
        expect(styleInfo(undefined).style).toBe('Regular');
    });
    it('knows the usual weights', () => {
        expect(styleInfo('Bold')).toMatchObject({ weightClass: 700, bold: true, isRibbi: true });
        expect(styleInfo('bold italic')).toMatchObject({ style: 'Bold Italic', weightClass: 700, italic: true, isRibbi: true });
        expect(styleInfo('Light').weightClass).toBe(300);
        expect(styleInfo('SemiBold').weightClass).toBe(600);
        expect(styleInfo('Extra Bold').weightClass).toBe(800);
        expect(styleInfo('Medium')).toMatchObject({ weightClass: 500, isRibbi: false });
    });
});

describe('postScriptName', () => {
    it('is plain ASCII with one hyphen', () => {
        expect(postScriptName('My Tamil font', 'Regular')).toBe('MyTamilfont-Regular');
        expect(postScriptName('Café Script', 'Bold')).toBe('CafeScript-Bold');
    });
    it('gives names in other alphabets a stable, distinct code', () => {
        const a = postScriptName('எனது தமிழ் எழுத்துரு', 'Regular');
        const b = postScriptName('பாட்டியின் கையெழுத்து', 'Regular');
        expect(a).toMatch(/^Font[0-9A-F]{6}-Regular$/);
        expect(a).not.toBe(b);
        expect(postScriptName('எனது தமிழ் எழுத்துரு', 'Regular')).toBe(a);
    });
    it('keeps the English part of a mixed name', () => {
        expect(postScriptName('Meena தமிழ்', 'Regular')).toMatch(/^Meena[0-9A-F]{6}-Regular$/);
    });
    it('is at most 63 characters', () => {
        expect(postScriptName('A'.repeat(100), 'Regular').length).toBeLessThanOrEqual(63);
    });
});

describe('fontNames', () => {
    it('Regular: family and style, no typographic names', () => {
        const n = fontNames('Priya Hand', 'Regular');
        expect(n).toMatchObject({
            family: 'Priya Hand', subfamily: 'Regular', fullName: 'Priya Hand Regular',
            postScriptName: 'PriyaHand-Regular', weightClass: 400,
        });
        expect(n.typographicFamily).toBeUndefined();
    });
    it('Light: style moves into the family for older apps, with typographic names', () => {
        expect(fontNames('Priya Hand', 'Light')).toMatchObject({
            family: 'Priya Hand Light', subfamily: 'Regular',
            typographicFamily: 'Priya Hand', typographicSubfamily: 'Light', weightClass: 300,
        });
    });
});

describe('fontFileName', () => {
    it('is the font name and version, keeping other alphabets', () => {
        expect(fontFileName('My Tamil font', '1.003')).toBe('My Tamil font 1.003.otf');
        expect(fontFileName('எனது எழுத்துரு', '1.000')).toBe('எனது எழுத்துரு 1.000.otf');
    });
    it('replaces characters files can\'t have', () => {
        expect(fontFileName('A/B: "C"?', '1.000')).toBe('A_B_ _C__ 1.000.otf');
    });
    it('uses the local date and time without a version', () => {
        expect(fontFileName('X', null, new Date(2026, 10, 15, 0, 20))).toBe('X 2026-11-15 00.20.otf');
    });
});
