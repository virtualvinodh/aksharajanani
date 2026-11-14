import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { findRulesWithMissingGroups } from './ruleGroupCheck';

describe('rules that use a missing group', () => {
    it('finds them and counts the rules', () => {
        const rules = {
            groups: { virama: ['्'] },
            lookups: { lookup_a: { context: { x: { replace: ['@gone'], left: ['a'] } } } },
            dev2: {
                akhn: { lookupflags: { UseMarkFilteringSet: '@virama' }, liga: { 'क्ष': ['क', '$virama', 'ष'], 'y': ['$alsoGone', 'z'] } },
                abvs: { single: { b: ['$vowels'] } },
            },
        };
        const sets = [{ nameKey: 'vowels', characters: [] }];
        expect(findRulesWithMissingGroups(rules, sets as any)).toEqual({ groups: ['alsoGone', 'gone'], rules: 2 });
    });
    it('finds none in the ready-made scripts', () => {
        const scripts = JSON.parse(readFileSync('scripts.json', 'utf8'));
        const list = Array.isArray(scripts) ? scripts : scripts.scripts;
        for (const s of list) {
            const f = `data/rules_${s.id}.json`, c = `data/characters_${s.id}.json`;
            if (!existsSync(f) || !existsSync(c)) continue;
            const sets = JSON.parse(readFileSync(c, 'utf8')).filter((d: any) => 'characters' in d);
            expect([s.id, findRulesWithMissingGroups(JSON.parse(readFileSync(f, 'utf8')), sets)]).toEqual([s.id, { groups: [], rules: 0 }]);
        }
    });
});
