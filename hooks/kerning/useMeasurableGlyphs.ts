import { useMemo } from 'react';
import { GlyphData } from '../../types';
import { useGlyphData } from '../../contexts/GlyphDataContext';
import { useProject } from '../../contexts/ProjectContext';
import { usePositioning } from '../../contexts/PositioningContext';
import { useRules } from '../../contexts/RulesContext';
import { useSettings } from '../../contexts/SettingsContext';
import { withBuiltGlyphs } from '../../services/glyphRenderService';

/**
 * Glyph data for Spacing: every letter's own drawing, plus the built shape of letters the app
 * makes (placed accents, linked and composite letters) that have no drawing of their own (K20).
 * Without it, Tamil's suggested pairs with கீ, கி or க் were hidden and never spaced.
 */
export const useMeasurableGlyphs = (): Map<number, GlyphData> => {
    const { glyphDataMap, version: glyphVersion } = useGlyphData();
    const { allCharsByName, characterSets, markAttachmentRules, positioningRules } = useProject();
    const { markPositioningMap } = usePositioning();
    const { state: rulesState } = useRules();
    const { settings, metrics } = useSettings();

    return useMemo(() => withBuiltGlyphs(allCharsByName.values(), {
        glyphDataMap,
        allCharsByName,
        markPositioningMap,
        characterSets: characterSets || [],
        groups: rulesState.fontRules?.groups || {},
        metrics: metrics || undefined,
        markAttachmentRules,
        strokeThickness: settings?.strokeThickness || 15,
        positioningRules,
    // glyphDataMap is updated in place; glyphVersion says when.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [glyphDataMap, glyphVersion, allCharsByName, markPositioningMap, characterSets, rulesState.fontRules, metrics, markAttachmentRules, settings?.strokeThickness, positioningRules]);
};
