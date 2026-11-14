import { describe, it, expect } from 'vitest';
import { findDependents } from './deleteHelpers';
import { Character, CharacterSet } from '../types';

const set = (characters: Character[]): CharacterSet[] => [{ nameKey: 'x', characters }];

describe('findDependents', () => {
    it('finds letters built from the deleted letter', () => {
        const chars: Character[] = [
            { name: 'a', unicode: 97 },
            { name: 'á', unicode: 225, position: ['a', '´'] },
            { name: 'b', unicode: 98 },
        ];
        expect(findDependents(set(chars), new Set(['a'])).map(c => c.name)).toEqual(['á']);
    });

    it('follows combination-only shapes that are removed with it', () => {
        const chars: Character[] = [
            { name: 'W', unicode: 0xE101, glyphClass: 'base', position: ['V', 'm2'] },
            { name: 'A', unicode: 65 },
            { name: 'V', unicode: 0xE100, glyphClass: 'virtual', position: ['A', 'm'] },
        ];
        const names = findDependents(set(chars), new Set(['A'])).map(c => c.name).sort();
        expect(names).toEqual(['V', 'W']);
    });
});
