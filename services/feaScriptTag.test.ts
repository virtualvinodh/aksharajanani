import { describe, it, expect } from 'vitest';
import { inferScriptTag, generateFea } from './feaService';
import { Character, FontMetrics } from '../types';

const ch = (name: string): Character => ({ name, unicode: name.codePointAt(0) } as Character);
const basics = [...'0123456789.,!?'].map(ch);

describe('script tag for rules that name none (E14)', () => {
    it('picks the alphabet most letters belong to', () => {
        expect(inferScriptTag([...'אבגדה'].map(ch).concat(basics))).toBe('hebr');
        expect(inferScriptTag([...'กขคง'].map(ch))).toBe('thai');
        expect(inferScriptTag([...'ກຂຄງ'].map(ch))).toBe('lao');
        expect(inferScriptTag([...'ΑΒΓαβγ'].map(ch))).toBe('grek');
        expect(inferScriptTag([...'АБВабв'].map(ch))).toBe('cyrl');
        expect(inferScriptTag([...'abcāṭḍ'].map(ch))).toBe('latn');
        expect(inferScriptTag(basics)).toBeUndefined();
    });

    it('declares Hebrew next to DFLT so HarfBuzz applies the features to Hebrew text', () => {
        const chars = new Map([...'אב'].map(c => [c.codePointAt(0)!, ch(c)] as [number, Character]));
        const fea = generateFea({}, new Map(), new Map(), chars, 'Test', null, new Map(), {} as FontMetrics, [], null, 15);
        expect(fea).toMatch(/^languagesystem DFLT dflt;\nlanguagesystem hebr dflt;\n/);
    });

    it('keeps a script the rules name', () => {
        const chars = new Map([...'കഖ'].map(c => [c.codePointAt(0)!, ch(c)] as [number, Character]));
        const fea = generateFea({ mlm2: {} }, new Map(), new Map(), chars, 'Test', null, new Map(), {} as FontMetrics, [], null, 15);
        expect(fea).toMatch(/^languagesystem DFLT dflt;\nlanguagesystem mlm2 dflt;\n/);
    });
});
