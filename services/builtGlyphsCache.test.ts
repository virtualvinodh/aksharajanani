import { describe, it, expect } from 'vitest';
import { computeBuiltGlyphs, dependentsIndex } from './builtGlyphsCache';
import { Character, GlyphData, Path, UnifiedRenderContext } from '../types';

const g = (id: string): GlyphData => ({ paths: [{ id, type: 'pen', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] } as Path] });
const chars: Character[] = [
    { name: 'k', unicode: 1 },
    { name: 'i', unicode: 2, glyphClass: 'mark' },
    { name: 'ki', unicode: 3, position: ['k', 'i'] },
    { name: 'kii', unicode: 4, link: ['ki', 'i'] },
    { name: 'm', unicode: 5 },
    { name: 'mi', unicode: 6, position: ['m', 'i'] },
];
const byName = new Map(chars.map(c => [c.name, c]));
const index = dependentsIndex(byName);
const ctx = (map: Map<number, GlyphData>): UnifiedRenderContext => ({ glyphDataMap: map, allCharsByName: byName, strokeThickness: 15 });

/** A stand-in builder: a built letter's shape names the parts it was made from. */
const calls: string[][] = [];
const build = (list: Iterable<Character>, c: UnifiedRenderContext) => {
    const map = new Map(c.glyphDataMap); const names: string[] = [];
    for (let pass = 0; pass < 4; pass++) for (const ch of list) {
        const parts = ch.position ?? ch.link ?? ch.composite;
        if (!parts || map.has(ch.unicode!)) continue;
        if (parts.every(p => map.has(byName.get(p)!.unicode!))) {
            map.set(ch.unicode!, g(parts.map(p => map.get(byName.get(p)!.unicode!)!.paths[0].id).join('+')));
            names.push(ch.name);
        }
    }
    calls.push(names);
    return map;
};
const id = (s: ReturnType<typeof computeBuiltGlyphs>, u: number) => s.result.get(u)?.paths[0].id;

describe('computeBuiltGlyphs', () => {
    it('rebuilds only letters built from the changed letter, and matches a full rebuild', () => {
        const deps = ['same'];
        const drawings = new Map([[1, g('k1')], [2, g('i1')], [5, g('m1')]]);
        let s = computeBuiltGlyphs(null, ctx(drawings), deps, index, build);
        expect(id(s, 4)).toBe('k1+i1+i1');

        calls.length = 0;
        const edited = new Map(drawings); edited.set(1, g('k2')); // redraw k
        s = computeBuiltGlyphs(s, ctx(edited), deps, index, build);
        expect(calls[0].sort()).toEqual(['ki', 'kii']); // mi is untouched
        expect(id(s, 3)).toBe('k2+i1');
        expect(id(s, 4)).toBe('k2+i1+i1');
        expect(id(s, 6)).toBe('m1+i1');
        const full = computeBuiltGlyphs(null, ctx(edited), deps, index, build);
        [3, 4, 6].forEach(u => expect(id(s, u)).toBe(id(full, u)));
    });

    it('reuses the result when no drawing changed, and rebuilds everything when other things change', () => {
        const drawings = new Map([[1, g('k1')], [2, g('i1')], [5, g('m1')]]);
        const s1 = computeBuiltGlyphs(null, ctx(drawings), ['a'], index, build);
        const s2 = computeBuiltGlyphs(s1, ctx(new Map(drawings)), ['a'], index, build);
        expect(s2.result).toBe(s1.result);
        calls.length = 0;
        computeBuiltGlyphs(s2, ctx(drawings), ['b'], index, build);
        expect(calls[0].sort()).toEqual(['ki', 'kii', 'mi']);
    });

    it('a built letter drawn by hand, then cleared, is built again', () => {
        const drawings = new Map([[1, g('k1')], [2, g('i1')], [3, g('own')]]);
        let s = computeBuiltGlyphs(null, ctx(drawings), [], index, build);
        expect(id(s, 3)).toBe('own');
        const cleared = new Map(drawings); cleared.delete(3);
        s = computeBuiltGlyphs(s, ctx(cleared), [], index, build);
        expect(id(s, 3)).toBe('k1+i1');
    });

    it('removing a part un-builds what was built from it', () => {
        const drawings = new Map([[1, g('k1')], [2, g('i1')]]);
        let s = computeBuiltGlyphs(null, ctx(drawings), [], index, build);
        const noI = new Map(drawings); noI.delete(2);
        s = computeBuiltGlyphs(s, ctx(noI), [], index, build);
        expect(s.result.has(3)).toBe(false);
        expect(s.result.has(4)).toBe(false);
    });
});
