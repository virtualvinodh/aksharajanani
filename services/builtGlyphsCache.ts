import { Character, GlyphData, UnifiedRenderContext } from '../types';
import { isGlyphDrawn } from '../utils/glyphUtils';
import { withBuiltGlyphs } from './glyphRenderService';

/**
 * The glyph data Spacing and the editors measure letters by (each letter's own drawing, plus the
 * built shape of letters the app makes), kept up to date incrementally (MASTER_LIST 110).
 *
 * Rebuilding every built letter after each saved stroke froze the page for ~0.7 s per stroke in a
 * Kannada project on a phone-speed CPU. Now only the letters built from the changed letters
 * (directly or through other built letters) are rebuilt; everything else is reused. Any change
 * other than drawings (positions, rules, metrics, pen…) still rebuilds everything.
 */
export interface BuiltGlyphsState {
    /** The drawings the result was made from (object identity tells what changed). */
    own: Map<number, GlyphData>;
    result: Map<number, GlyphData>;
    /** Everything else the result depends on, compared item by item. */
    deps: readonly unknown[];
}

type Builder = (characters: Iterable<Character>, ctx: UnifiedRenderContext) => Map<number, GlyphData>;

const isBuilt = (c: Character) => !!(c.position || c.link || c.composite);
const partsOf = (c: Character): string[] => c.position ?? c.link ?? c.composite ?? [];

/** For each letter, the letters built directly from it. */
export const dependentsIndex = (chars: Map<string, Character>): Map<string, string[]> => {
    const index = new Map<string, string[]>();
    chars.forEach(c => {
        if (!isBuilt(c)) return;
        partsOf(c).forEach(part => {
            const list = index.get(part);
            if (list) list.push(c.name); else index.set(part, [c.name]);
        });
    });
    return index;
};

const sameDeps = (a: readonly unknown[], b: readonly unknown[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export const computeBuiltGlyphs = (
    prev: BuiltGlyphsState | null,
    ctx: UnifiedRenderContext,
    deps: readonly unknown[],
    index: Map<string, string[]>,
    build: Builder = withBuiltGlyphs,
): BuiltGlyphsState => {
    const own = new Map(ctx.glyphDataMap);
    if (!prev || !sameDeps(prev.deps, deps)) {
        return { own, result: build(ctx.allCharsByName.values(), ctx), deps };
    }

    // Letters whose own drawing changed (added, replaced or removed).
    const changed = new Set<number>();
    own.forEach((data, u) => { if (prev.own.get(u) !== data) changed.add(u); });
    prev.own.forEach((_, u) => { if (!own.has(u)) changed.add(u); });
    if (changed.size === 0) return { own, result: prev.result, deps };

    const nameOf = new Map<number, string>();
    ctx.allCharsByName.forEach(c => { if (c.unicode !== undefined) nameOf.set(c.unicode, c.name); });

    // Everything built from them, through any number of steps.
    const affected = new Set<string>();
    const queue: string[] = [];
    changed.forEach(u => { const n = nameOf.get(u); if (n) queue.push(n); });
    while (queue.length) {
        const name = queue.pop()!;
        for (const dep of index.get(name) ?? []) {
            if (!affected.has(dep)) { affected.add(dep); queue.push(dep); }
        }
    }

    const start = new Map(prev.result);
    changed.forEach(u => { const d = own.get(u); if (d) start.set(u, d); else start.delete(u); });
    const rebuild: Character[] = [];
    affected.forEach(name => {
        const c = ctx.allCharsByName.get(name);
        if (!c || c.unicode === undefined || !isBuilt(c) || isGlyphDrawn(own.get(c.unicode))) return;
        start.delete(c.unicode);
        rebuild.push(c);
    });
    // A changed letter that lost its own drawing may need building itself.
    changed.forEach(u => {
        const n = nameOf.get(u); const c = n ? ctx.allCharsByName.get(n) : undefined;
        if (c && isBuilt(c) && !isGlyphDrawn(own.get(u)) && !affected.has(c.name)) rebuild.push(c);
    });

    return { own, result: rebuild.length ? build(rebuild, { ...ctx, glyphDataMap: start }) : start, deps };
};
