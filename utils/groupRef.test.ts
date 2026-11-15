import { describe, it, expect } from 'vitest';
import { isGroupRef, groupRefName, toGroupRef, normalizeGroupRef } from './groupRef';
import { renameGroupInState } from '../services/refactoringService';

describe('group references (F49)', () => {
    it('reads @name and the older $name alike, but not the bare characters', () => {
        expect(isGroupRef('@vowels')).toBe(true);
        expect(isGroupRef('$vowels')).toBe(true);
        expect(isGroupRef('@')).toBe(false);
        expect(isGroupRef('$')).toBe(false); // the dollar sign is a letter in English fonts
        expect(isGroupRef('a')).toBe(false);
        expect(groupRefName('$vowels')).toBe('vowels');
    });

    it('writes and shows @', () => {
        expect(toGroupRef('consonants')).toBe('@consonants');
        expect(normalizeGroupRef('$consonants')).toBe('@consonants');
        expect(normalizeGroupRef('க')).toBe('க');
    });

    it('renames a group wherever it is used, whichever prefix the rules use', () => {
        const state = {
            characterSets: [], groups: { old: ['a'], other: ['$old', 'b'] },
            positioningRules: [{ base: ['$old'], mark: ['@old'] }] as any,
            markAttachmentRules: null, markAttachmentClasses: null, baseAttachmentClasses: null, recommendedKerning: null,
            fontRules: { groups: {}, latn: { liga: { x: ['$old', 'c'] } } },
        };
        const out = renameGroupInState(state, 'old', 'new', 'group');
        expect(out.groups).toEqual({ new: ['a'], other: ['@new', 'b'] });
        expect(out.positioningRules![0].base).toEqual(['@new']);
        expect(out.positioningRules![0].mark).toEqual(['@new']);
        expect(out.fontRules.latn.liga.x).toEqual(['@new', 'c']);
    });
});
