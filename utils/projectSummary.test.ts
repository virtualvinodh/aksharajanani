import { describe, it, expect } from 'vitest';
import { buildProjectSummary, previewCharacters, PREVIEW_LETTERS } from './projectSummary';
import { GlyphData, ProjectData } from '../types';

const stroke = (x: number): GlyphData => ({ paths: [{ id: `p${x}`, type: 'pen', points: [{ x, y: 100 }, { x: x + 50, y: 300 }] }] } as GlyphData);

const project = (sets: ProjectData['characterSets'], drawn: number[]): ProjectData & { projectId: number } => ({
    projectId: 7,
    name: 'My Tamil font',
    scriptId: 'tamil',
    savedAt: '2026-11-15T10:00:00.000Z',
    settings: { fontName: 'Font', strokeThickness: 30 } as ProjectData['settings'],
    characterSets: sets,
    glyphs: drawn.map(u => [u, stroke(u)] as [number, GlyphData]),
} as ProjectData & { projectId: number });

describe('previewCharacters', () => {
    it('prefers drawn vowels', () => {
        const p = project([
            { nameKey: 'consonants', characters: [{ name: 'க', unicode: 2965 }] },
            { nameKey: 'vowels', characters: [{ name: 'அ', unicode: 2949 }, { name: 'ஆ', unicode: 2950 }] },
        ], [2965, 2950]);
        expect(previewCharacters(p).map(c => c.name)).toEqual(['ஆ']);
    });

    it('falls back to the first set with drawn letters, skipping hidden ones', () => {
        const p = project([
            { nameKey: 'vowels', characters: [{ name: 'அ', unicode: 2949 }] },
            { nameKey: 'consonants', characters: [{ name: 'X', unicode: 1, hidden: true }, { name: 'க', unicode: 2965 }] },
        ], [1, 2965]);
        expect(previewCharacters(p).map(c => c.name)).toEqual(['க']);
    });

    it(`keeps at most ${PREVIEW_LETTERS} letters`, () => {
        const chars = Array.from({ length: 9 }, (_, i) => ({ name: `L${i}`, unicode: 100 + i }));
        const p = project([{ nameKey: 'letters', characters: chars }], chars.map(c => c.unicode));
        expect(previewCharacters(p)).toHaveLength(PREVIEW_LETTERS);
    });

    it('is empty when nothing is drawn', () => {
        expect(previewCharacters(project([{ nameKey: 'vowels', characters: [{ name: 'அ', unicode: 2949 }] }], []))).toEqual([]);
    });
});

describe('buildProjectSummary', () => {
    it('keeps only what the start page needs', () => {
        const s = buildProjectSummary(project([{ nameKey: 'vowels', characters: [{ name: 'அ', unicode: 2949 }] }], [2949]));
        expect(s).toMatchObject({ projectId: 7, name: 'My Tamil font', scriptId: 'tamil', savedAt: '2026-11-15T10:00:00.000Z', strokeThickness: 30 });
        expect(s.preview).toHaveLength(1);
        expect(s.preview[0].paths).toHaveLength(1);
        expect(Object.keys(s)).not.toContain('glyphs');
    });

    it('falls back to the font name when the project has no name', () => {
        const p = { ...project([], []), name: undefined };
        expect(buildProjectSummary(p).name).toBe('Font');
    });
});
