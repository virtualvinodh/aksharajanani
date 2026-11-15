import { Character, GlyphData, Path, ProjectData } from '../types';
import { isGlyphDrawn } from './glyphUtils';

/** How many drawn letters a project card previews. */
export const PREVIEW_LETTERS = 5;

/**
 * What the start page needs to list a project (F47, MASTER_LIST 81): its name, language and
 * date, plus the outlines of a few drawn letters for the preview. Stored next to each project
 * and updated with it, so the list never has to read whole projects (drawings of every letter).
 */
export interface ProjectSummary {
    projectId: number;
    name: string;
    scriptId: string;
    /** For languages the app doesn't ship (custom scripts), the name key stored in the project. */
    scriptNameKey?: string;
    savedAt?: string;
    strokeThickness: number;
    preview: { unicode: number; name: string; paths: Path[] }[];
}

/** The first few drawn letters: vowels first if the language has them, else the first set with any. */
export const previewCharacters = (project: Pick<ProjectData, 'glyphs' | 'characterSets'>, max = PREVIEW_LETTERS): Character[] => {
    const glyphs = new Map<number, GlyphData>((project.glyphs || []) as [number, GlyphData][]);
    const sets = project.characterSets || [];
    const drawnIn = (chars: Character[]) => chars.filter(c => !c.hidden && c.unicode !== undefined && isGlyphDrawn(glyphs.get(c.unicode)));

    const vowels = sets.find(s => s.nameKey === 'vowels');
    if (vowels) {
        const drawn = drawnIn(vowels.characters);
        if (drawn.length > 0) return drawn.slice(0, max);
    }
    for (const set of sets) {
        if (set.nameKey === 'vowels') continue;
        const drawn = drawnIn(set.characters);
        if (drawn.length > 0) return drawn.slice(0, max);
    }
    return [];
};

export const buildProjectSummary = (project: ProjectData & { projectId: number }): ProjectSummary => {
    const glyphs = new Map<number, GlyphData>((project.glyphs || []) as [number, GlyphData][]);
    return {
        projectId: project.projectId,
        name: project.name || project.settings?.fontName || '',
        scriptId: project.scriptId ?? "",
        scriptNameKey: project.scriptConfig?.nameKey,
        savedAt: project.savedAt,
        strokeThickness: project.settings?.strokeThickness ?? 25,
        preview: previewCharacters(project).map(c => ({ unicode: c.unicode!, name: c.name, paths: glyphs.get(c.unicode!)!.paths })),
    };
};
