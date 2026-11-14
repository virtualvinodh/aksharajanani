import { Character, CharacterSet, GlyphData, UnifiedRenderContext } from '../types';
import { getUnifiedPaths } from '../services/glyphRenderService';

/** The ways a letter can be built from other letters. */
const sourcesOf = (c: Character): string[] => [
    ...(c.link || []), ...(c.composite || []), ...(c.position || []), ...(c.kern || []),
];

/**
 * Letters built from any of the letters being deleted (F36): linked (கி), copied as a starting
 * point (ஆ), or a letter plus an accent (á). The deleted letters themselves are left out.
 */
export const findDependents = (sets: CharacterSet[] | null | undefined, deletedNames: Set<string>): Character[] => {
    const all = (sets || []).flatMap(set => set.characters);
    // Combination-only shapes built from a deleted letter go with it (planDetach), so letters
    // built from *those* are dependents too: follow the chain until nothing new turns up.
    const gone = new Set(deletedNames);
    const found = new Map<string, Character>();
    for (let changed = true; changed;) {
        changed = false;
        for (const c of all) {
            if (gone.has(c.name) || found.has(c.name)) continue;
            if (sourcesOf(c).some(n => gone.has(n))) {
                found.set(c.name, c);
                if (c.glyphClass === 'virtual') { gone.add(c.name); changed = true; }
            }
        }
    }
    return [...found.values()];
};

/** Dependents a person sees in the grid: combination-only shapes ("virtual") are not letters. */
export const visibleDependents = (deps: Character[]): Character[] => deps.filter(c => c.glyphClass !== 'virtual' && !c.hidden);

export interface DetachPlan {
    /** Each kept dependent's current look, saved as its own drawing. */
    glyphUpdates: [number, GlyphData][];
    /** Kept dependents that had no drawing of their own before (Undo removes the saved one). */
    newlyDrawn: number[];
    /** Their fields before, for Undo. */
    fieldRestores: Map<number, Partial<Character>>;
    /** Combination-only shapes that can't exist without the deleted letter: deleted with it. */
    removed: number[];
}

/**
 * Before deleting letters, turn everything built from them into separate drawings that keep
 * their current look, so nothing is left greyed out waiting for a letter that no longer exists.
 * Must be called while the deleted letters' drawings are still in `ctx`.
 */
export const planDetach = (deps: Character[], ctx: UnifiedRenderContext): DetachPlan => {
    const plan: DetachPlan = { glyphUpdates: [], newlyDrawn: [], fieldRestores: new Map(), removed: [] };
    deps.forEach(c => {
        if (c.unicode === undefined) return;
        if (c.glyphClass === 'virtual') { plan.removed.push(c.unicode); return; }
        plan.fieldRestores.set(c.unicode, {
            link: c.link, composite: c.composite, compositeTransform: c.compositeTransform,
            sourceLink: c.sourceLink, sourceLinkType: c.sourceLinkType, position: c.position, kern: c.kern, gpos: c.gpos,
        });
        const paths = getUnifiedPaths(c, ctx);
        if (paths.length > 0) {
            if (!ctx.glyphDataMap.has(c.unicode)) plan.newlyDrawn.push(c.unicode);
            plan.glyphUpdates.push([c.unicode, { paths: JSON.parse(JSON.stringify(paths)) }]);
        }
    });
    return plan;
};

/** The character without any of its "built from" fields. */
export const withoutSources = (c: Character): Character => {
    const n = { ...c };
    delete n.link; delete n.composite; delete n.compositeTransform; delete n.sourceLink; delete n.sourceLinkType;
    delete n.position; delete n.kern; delete n.gpos;
    return n;
};
