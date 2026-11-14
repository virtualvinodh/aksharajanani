
import { GlyphData, Character, MarkPositioningMap, KerningMap, FontMetrics } from '../types';
import UnicodeProperties from 'unicode-properties';

/**
 * Determines if a character should be exported even if it has no drawn paths.
 * This includes whitespace, control characters (Cc), format characters (Cf), and glyphs with 'null' in their name.
 */
export const shouldExportEmpty = (unicode: number | undefined, name?: string): boolean => {
    if (name?.toLowerCase().includes('null')) return true;
    if (unicode === undefined) return false;
    
    const category = UnicodeProperties.getCategory(unicode);
    const isSeparator = category && category.startsWith('Z');
    return isSeparator || category === 'Cf' || category === 'Cc';
};

// Conventional widths of the fixed-width Unicode spaces, as fractions of the em.
// Spaces not listed (no-break space, figure and punctuation space…) use the font's space width.
const SPACE_EM_FRACTIONS: Record<number, number> = {
    0x2000: 1 / 2, // en quad
    0x2001: 1,     // em quad
    0x2002: 1 / 2, // en space
    0x2003: 1,     // em space
    0x2004: 1 / 3, // three-per-em space
    0x2005: 1 / 4, // four-per-em space
    0x2006: 1 / 6, // six-per-em space
    0x2009: 1 / 5, // thin space
    0x200A: 1 / 10, // hair space
    0x202F: 1 / 5, // narrow no-break space
    0x205F: 4 / 18, // medium mathematical space
    0x3000: 1,     // ideographic space
};

const parseWidth = (value: number | string | undefined): number | undefined => {
    if (value === undefined || value === '') return undefined;
    const n = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
};

/**
 * Advance width for a glyph that has no outline (spaces, format and control characters, and in
 * edit mode any undrawn glyph). Returns undefined when the default advance width should be used.
 * - A width stored on the character (e.g. read from an imported font) wins.
 * - Format characters (zero-width space, joiners, marks like U+2060) and controls are 0,
 *   except tab and carriage return, which take the space width.
 * - Spaces get their conventional em fraction, or the font's space width.
 */
export const getBlankAdvanceWidth = (unicode: number, char: Pick<Character, 'advWidth'> | undefined, metrics: Pick<FontMetrics, 'unitsPerEm' | 'spaceAdvanceWidth'>): number | undefined => {
    const own = parseWidth(char?.advWidth);
    if (own !== undefined) return own;

    const category = UnicodeProperties.getCategory(unicode);
    if (category === 'Zs') {
        const fraction = SPACE_EM_FRACTIONS[unicode];
        return fraction !== undefined ? Math.round(metrics.unitsPerEm * fraction) : metrics.spaceAdvanceWidth;
    }
    if (unicode === 0x09 || unicode === 0x0D) return metrics.spaceAdvanceWidth;
    if (category === 'Cf' || category === 'Cc' || category === 'Zl' || category === 'Zp') return 0;
    return undefined;
};

/**
 * Checks if a glyph has been drawn, considering both freehand points and vector outlines.
 * @param glyphData The glyph data to check.
 * @returns True if the glyph has any drawable content, false otherwise.
 */
export const isGlyphDrawn = (glyphData: GlyphData | undefined): boolean => {
  if (!glyphData || !glyphData.paths || glyphData.paths.length === 0) {
    return false;
  }
  // A glyph is considered drawn if any of its paths have either freehand points or vector segment groups.
  return glyphData.paths.some(
    p => (p.points?.length || 0) > 0 || (p.segmentGroups?.length || 0) > 0
  );
};

/**
 * Checks if a glyph can be rendered visually.
 * - If it's a base glyph, checks if it is drawn.
 * - If it's a constructed glyph (link/position/kern), checks if ALL its components are drawn.
 */
export const isGlyphRenderable = (
    char: Character,
    glyphDataMap: Map<number, GlyphData>,
    allCharsByName: Map<string, Character>,
    visited = new Set<string>(),
    memo = new Map<string, boolean>()
): boolean => {
    if (memo.has(char.name)) return memo.get(char.name)!;

    // Prevent infinite recursion
    if (visited.has(char.name)) return false;
    const nextVisited = new Set(visited);
    nextVisited.add(char.name);

    let result = false;

    // 1. If it has direct drawing data, it is renderable.
    if (char.unicode !== undefined && isGlyphDrawn(glyphDataMap.get(char.unicode))) {
        result = true;
    } else {
        // 2. Helper to check a list of component names
        const areComponentsReady = (names: string[]): boolean => {
            return names.every(name => {
                const comp = allCharsByName.get(name);
                return comp && isGlyphRenderable(comp, glyphDataMap, allCharsByName, nextVisited, memo);
            });
        };

        // 3. Check specific construction types
        if (char.position) result = areComponentsReady(char.position);
        else if (char.kern) result = areComponentsReady(char.kern);
        else if (char.link) result = areComponentsReady(char.link);
        else if (char.composite) result = areComponentsReady(char.composite);
        // 4. Special Case: Whitespace, Control, and Format characters are always "renderable" (though invisible)
        else if (shouldExportEmpty(char.unicode, char.name)) result = true;
    }

    memo.set(char.name, result);
    return result;
};

/**
 * Generates an AGL-compliant glyph name from a Unicode codepoint for font export.
 * @param unicode The decimal Unicode codepoint.
 * @returns The glyph name string (e.g., 'space', 'uni0041', 'u1F600').
 */
export const getGlyphExportNameByUnicode = (unicode: number): string => {
    if (unicode === 32) return 'space';
    const hex = unicode.toString(16).toUpperCase();
    if (unicode < 0x10000) {
        // BMP characters are named uniXXXX
        return `uni${hex.padStart(4, '0')}`;
    } else {
        // SMP characters are named uXXXXX...
        return `u${hex}`;
    }
};

/**
 * Checks if a glyph is "complete" based on a broader definition that includes
 * being manually drawn, being an "accepted" positioned/kerned pair, or
 * being a linked/composite glyph whose source components are drawn.
 * @param character The character to check.
 * @param glyphDataMap The map of all glyph drawing data.
 * @param markPositioningMap The map of manually positioned pairs.
 * @param kerningMap The map of manually kerned pairs.
 * @param allCharsByName A map of all characters by name for component lookups.
 * @returns True if the glyph is considered complete.
 */
export const isGlyphComplete = (
    character: Character | undefined,
    glyphDataMap: Map<number, GlyphData>,
    markPositioningMap: MarkPositioningMap,
    kerningMap: KerningMap,
    allCharsByName: Map<string, Character>,
    visited = new Set<string>(),
    memo = new Map<string, boolean>()
): boolean => {
    if (!character) return false;

    if (memo.has(character.name)) return memo.get(character.name)!;

    // Prevent infinite recursion
    if (visited.has(character.name)) return false;
    const nextVisited = new Set(visited);
    nextVisited.add(character.name);

    let result = false;

    // 1. Manually drawn in the editor (a copy of another letter saved unchanged isn't finished yet)
    if (character.unicode !== undefined && !character.unfinishedCopy && isGlyphDrawn(glyphDataMap.get(character.unicode))) {
        result = true;
    }
    
    // 2. An accepted (saved) positioned pair
    if (!result && character.position) {
        const base = allCharsByName.get(character.position[0]);
        const mark = allCharsByName.get(character.position[1]);
        if (base?.unicode !== undefined && mark?.unicode !== undefined) {
            if (markPositioningMap.has(`${base.unicode}-${mark.unicode}`)) {
                result = true;
            }
        }
    }
    
    // 3. An accepted (saved) kerned pair
    if (!result && character.kern) {
        const left = allCharsByName.get(character.kern[0]);
        const right = allCharsByName.get(character.kern[1]);
        if (left?.unicode !== undefined && right?.unicode !== undefined) {
            if (kerningMap.has(`${left.unicode}-${right.unicode}`)) {
                result = true;
            }
        }
    }
    
    // 4. A linked or composite glyph whose source components are drawn. Not a copy of a single
    // letter (ஆ from அ): it looks exactly like its source until something is added (UX §5).
    if (!result && !isSingleCopyTemplate(character)) {
        const components = character.link || character.composite;
        if (components) {
             result = components.every(name => {
                const comp = allCharsByName.get(name);
                return comp && isGlyphComplete(comp, glyphDataMap, markPositioningMap, kerningMap, allCharsByName, nextVisited, memo);
            });
        }
    }

    memo.set(character.name, result);
    return result;
};

/**
 * True when the copy can't be a finished letter: started from exactly one other letter, as is.
 * A copy that is resized or moved (Kannada ್ಖ, Telugu ్ష: a smaller letter below the line) is a
 * finished form of its own, so it doesn't count.
 */
export const isSingleCopyTemplate = (c: Pick<Character, 'composite' | 'link' | 'position' | 'kern' | 'compositeTransform'>): boolean =>
    !!c.composite && c.composite.length === 1 && !c.link && !c.position && !c.kern && !hasTransform(c.compositeTransform);

const hasTransform = (list: Character['compositeTransform']): boolean =>
    !!list && list.some(t => !!t && (
        [t.scale, t.scaleX, t.scaleY].some(v => v !== undefined && v !== 1) ||
        [t.rotation, t.x, t.y].some(v => v !== undefined && v !== 0)));

/** Same outlines, ignoring ids and tiny rounding differences. */
export const sameShape = (a: GlyphData['paths'], b: GlyphData['paths']): boolean => {
    const r = (n: number) => Math.round(n * 10) / 10;
    const key = (paths: GlyphData['paths']) => JSON.stringify(paths.map(p => [
        p.type, p.angle ?? null,
        (p.points || []).map(pt => [r(pt.x), r(pt.y)]),
        (p.segmentGroups || []).map(g => g.map(s => [r(s.point.x), r(s.point.y), r(s.handleIn.x), r(s.handleIn.y), r(s.handleOut.x), r(s.handleOut.y)])),
    ]));
    return a.length === b.length && key(a) === key(b);
};
