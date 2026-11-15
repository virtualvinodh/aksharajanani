import { describe, it, expect } from 'vitest';
import { mentionsGroup, findGroupUsages, findLookupUsages, countLookupRules } from './ruleUsage';

const rules = {
    groups: { virama: ['್'], ottuG: ['$ottu'], ottuPlus: ['$ottuG', 'ಕ'] },
    lookups: { lookup_a: { context: { 'ೕ': { replace: ['@ottuG'], left: ['ೕ'] } } }, lookup_b: { liga: { a: ['x', 'y'], b: ['z'] } } },
    knd2: {
        blwf: { liga: { '್ರ': ['್', 'ರ'] } },
        psts: { children: [{ type: 'lookup', name: 'lookup_b' }], single: { '$virama': 'x' } },
    },
};

describe('rule usage', () => {
    it('matches $name and @name, not longer names', () => {
        expect(mentionsGroup(['@ottuG'], 'ottuG')).toBe(true);
        expect(mentionsGroup({ '$virama': 'x' }, 'virama')).toBe(true);
        expect(mentionsGroup(['$ottuGx'], 'ottuG')).toBe(false);
        expect(mentionsGroup(['[$ottu $virama]'], 'ottu')).toBe(true);
        expect(mentionsGroup(['ottu'], 'ottu')).toBe(false);
    });

    it('lists features, lookups, other groups and extra sources', () => {
        // Shown with @ (F49), whichever prefix the data uses.
        expect(findGroupUsages('ottuG', rules)).toEqual(['lookup_a', '@ottuPlus']);
        expect(findGroupUsages('virama', rules, [{ label: 'Positioning', value: [{ base: ['$virama'] }] }])).toEqual(['psts', 'Positioning']);
        expect(findGroupUsages('unused', rules)).toEqual([]);
    });

    it('finds features that list a lookup and counts its rules', () => {
        expect(findLookupUsages('lookup_b', rules)).toEqual(['psts']);
        expect(findLookupUsages('lookup_a', rules)).toEqual([]);
        expect(countLookupRules(rules.lookups.lookup_b)).toBe(2);
    });
});
