import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
    LanguageData, buildLanguageSets, buildLanguageScript, builtInScriptFor, capitalsFor, displayName,
    lettersMissingFrom, searchLanguages, splitChars, LANGUAGE_LETTERS_SET, LANGUAGE_MARKS_SET,
} from './languageService';
import { Character, CharacterSet, ScriptConfig } from '../types';

const data: LanguageData = JSON.parse(readFileSync(join(__dirname, '../data/languages.json'), 'utf-8'));
const lang = (code: string) => data.languages.find(l => l.code === code)!;
const setOf = (defs: ReturnType<typeof buildLanguageSets>['definitions'], key: string) =>
    (defs.find(d => 'nameKey' in d && d.nameKey === key) as CharacterSet | undefined)?.characters ?? [];
const byName = (chars: Character[], name: string) => chars.find(c => c.name === name);

describe('language list (data/languages.json)', () => {
    it('has Norwegian, Georgian and Amharic with their letters and a sample sentence', () => {
        expect(splitChars(lang('nb').letters)).toEqual(expect.arrayContaining(['æ', 'ø', 'å']));
        expect(lang('ka').letters).toContain('ქ');
        expect(lang('am').letters).toContain('ሀ');
        expect(lang('nb').sample).toMatch(/^Alle mennesker er født frie/);
        expect(data.scripts.Geor.font?.fontUrl).toMatch(/NotoSansGeorgian/);
    });

    it('leaves out writing systems with thousands of characters (Japanese is kept as kana only)', () => {
        expect(data.languages.find(l => l.code === 'zh' || l.code === 'ko')).toBeUndefined();
        expect(splitChars(lang('ja').letters)).toHaveLength(174);
    });
});

describe('searchLanguages', () => {
    it('finds a language by English name, its own name, another name, or without accents', () => {
        expect(searchLanguages(data, 'Norwegian')[0].code).toMatch(/^(nb|nn)$/);
        expect(searchLanguages(data, 'norsk').map(l => l.code)).toContain('nn');
        expect(searchLanguages(data, 'Kiswahili')[0].code).toBe('sw');
        expect(searchLanguages(data, 'bokmal')[0].code).toBe('nb');
        expect(searchLanguages(data, 'ქართ')[0].code).toBe('ka');
    });

    it('puts exact and prefix matches first', () => {
        expect(searchLanguages(data, 'Tamil')[0].code).toBe('ta');
    });
});

describe('capitalsFor', () => {
    it('follows the language\'s own rules (Turkish i → İ)', () => {
        expect(capitalsFor(['a', 'å'], 'nb')).toEqual(['A', 'Å']);
        expect(capitalsFor(['i', 'ı'], 'tr')).toEqual(['İ', 'I']);
        expect(capitalsFor(['ß'], 'de')).toEqual([]); // SS is two letters
    });
});

describe('buildLanguageSets', () => {
    it('builds accented letters from the plain letter and the accent', () => {
        const { definitions, builtCount } = buildLanguageSets(['a', 'å', 'é'], [], data.marks);
        const letters = setOf(definitions, LANGUAGE_LETTERS_SET);
        expect(byName(letters, 'å')).toMatchObject({ glyphClass: 'ligature', position: ['a', '̊'], liga: ['a', '̊'] });
        expect(byName(letters, 'e')).toMatchObject({ glyphClass: 'base' }); // added for é
        expect(setOf(definitions, LANGUAGE_MARKS_SET).map(c => c.name)).toEqual(['̊', '́']);
        expect(builtCount).toBe(2);
    });

    it('puts accents above i and j on the dotless forms, as the Spanish set does', () => {
        const letters = setOf(buildLanguageSets(['í'], [], data.marks).definitions, LANGUAGE_LETTERS_SET);
        expect(byName(letters, 'í')?.position).toEqual(['ı', '́']);
    });

    it('stacks a second mark on the letter that has the first (ệ = ẹ + ̂)', () => {
        const letters = setOf(buildLanguageSets(['ệ'], [], data.marks).definitions, LANGUAGE_LETTERS_SET);
        expect(byName(letters, 'ệ')?.position).toEqual(['ẹ', '̂']);
        expect(byName(letters, 'ẹ')?.position).toEqual(['e', '̣']);
    });

    it('places marks above, below or attached, from where Unicode puts them', () => {
        const defs = buildLanguageSets(['ç', 'ọ', 'ô'], [], data.marks).definitions;
        const rules = (defs.find(d => 'markAttachment' in d) as { markAttachment: Record<string, Record<string, string[]>> }).markAttachment[`@${LANGUAGE_LETTERS_SET}`];
        expect(rules['̧']).toEqual(['bottomCenter', 'topCenter']);
        expect(rules['̣'].slice(0, 2)).toEqual(['bottomCenter', 'topCenter']);
        expect(rules['̂'].slice(0, 2)).toEqual(['topCenter', 'bottomCenter']);
    });

    it('builds voiced kana from the plain kana and ゛ or ゜, at its top right', () => {
        const ja = lang('ja');
        expect(ja.letters).not.toMatch(/\p{sc=Han}/u); // kana only
        const { definitions, builtCount } = buildLanguageSets(splitChars(ja.letters), [], data.marks);
        const letters = setOf(definitions, LANGUAGE_LETTERS_SET);
        expect(byName(letters, 'が')?.position).toEqual(['か', '゙']);
        expect(byName(letters, 'パ')?.position).toEqual(['ハ', '゚']);
        expect(builtCount).toBe(53);
        const rules = (definitions.find(d => 'markAttachment' in d) as { markAttachment: Record<string, Record<string, string[]>> }).markAttachment[`@${LANGUAGE_LETTERS_SET}`];
        expect(rules['゙'].slice(0, 2)).toEqual(['topRight', 'bottomLeft']);
        // Tucked into the letter's top-right corner, close to Noto Sans JP (row 12).
        expect(rules['゙']).toEqual(['topRight', 'bottomLeft', '-60', '55']);
        expect(rules['゚']).toEqual(rules['゙']);
        expect(searchLanguages(data, 'hiragana')[0].code).toBe('ja');
    });

    it('keeps letters without a plain form (Georgian, Amharic) as letters to draw', () => {
        const { definitions, drawCount, builtCount } = buildLanguageSets(splitChars(lang('am').letters), [], data.marks);
        expect(builtCount).toBe(0);
        expect(drawCount).toBe(setOf(definitions, LANGUAGE_LETTERS_SET).length);
    });
});

describe('buildLanguageScript', () => {
    const template = { id: 'latin', nameKey: 'scriptEnglish', defaults: { fontName: 'RomanSimple' }, metrics: {}, grid: {}, testPage: {} } as unknown as ScriptConfig;

    it('names the font after the language and uses its guide font, sample and script tag', () => {
        const { definitions } = buildLanguageSets(splitChars(lang('ka').letters), [], data.marks);
        const script = buildLanguageScript(lang('ka'), data, template, definitions, []);
        expect(script.id).toBe('lang_ka');
        expect(script.nameKey).toBe('Georgian');
        expect(script.defaults.fontName).toBe('GeorgianSimple');
        expect(script.guideFont.fontName).toBe('Noto Sans Georgian');
        expect(script.sampleText).toBe(lang('ka').sample);
        expect(Object.keys(script.rulesData)).toEqual(['geor']);
    });

    it('drops the writing-system part of variant names', () => {
        expect(displayName(lang('sr-Latn'))).toBe('Serbian');
    });
});

describe('lettersMissingFrom', () => {
    it('lists the letters a ready-made set lacks (S28)', () => {
        const cyrillic = new Set(splitChars('абвгдеёжзийклмнопрстуфхцчшщъыьэюяәіңөұүқ'));
        expect(lettersMissingFrom(lang('kk-Cyrl'), cyrillic)).toEqual(['ғ', 'һ']);
        expect(lettersMissingFrom(lang('ru'), cyrillic)).toEqual([]);
    });
});

describe('builtInScriptFor', () => {
    const scripts = ['latin', 'german', 'devanagari', 'cyrillic'].map(id => ({ id } as ScriptConfig));
    it('points to the ready-made set when there is one', () => {
        expect(builtInScriptFor(lang('de'), scripts)?.id).toBe('german');
        expect(builtInScriptFor(lang('hi'), scripts)?.id).toBe('devanagari');
        expect(builtInScriptFor(lang('nb'), scripts)).toBeUndefined();
    });
});
