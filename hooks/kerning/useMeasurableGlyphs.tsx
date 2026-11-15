import React, { createContext, useContext, useMemo, useRef } from 'react';
import { GlyphData } from '../../types';
import { useGlyphData } from '../../contexts/GlyphDataContext';
import { useProject } from '../../contexts/ProjectContext';
import { usePositioning } from '../../contexts/PositioningContext';
import { useRules } from '../../contexts/RulesContext';
import { useSettings } from '../../contexts/SettingsContext';
import { BuiltGlyphsState, computeBuiltGlyphs, dependentsIndex } from '../../services/builtGlyphsCache';

const MeasurableGlyphsContext = createContext<Map<number, GlyphData> | null>(null);

/**
 * Glyph data for Spacing and the editors: every letter's own drawing, plus the built shape of
 * letters the app makes (placed accents, linked and composite letters) that have no drawing of
 * their own (K20). Worked out once for the whole app and updated incrementally after each edit
 * (MASTER_LIST 110), instead of from scratch in every screen that needs it.
 */
export const MeasurableGlyphsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { glyphDataMap, version: glyphVersion } = useGlyphData();
    const { allCharsByName, characterSets, markAttachmentRules, positioningRules } = useProject();
    const { markPositioningMap } = usePositioning();
    const { state: rulesState } = useRules();
    const { settings, metrics } = useSettings();
    const state = useRef<BuiltGlyphsState | null>(null);
    const index = useMemo(() => dependentsIndex(allCharsByName), [allCharsByName]);

    const groups = rulesState.fontRules?.groups;
    const strokeThickness = settings?.strokeThickness || 15;
    const value = useMemo(() => {
        state.current = computeBuiltGlyphs(state.current, {
            glyphDataMap,
            allCharsByName,
            markPositioningMap,
            characterSets: characterSets || [],
            groups: groups || {},
            metrics: metrics || undefined,
            markAttachmentRules,
            strokeThickness,
            positioningRules,
        }, [allCharsByName, markPositioningMap, characterSets, groups, metrics, markAttachmentRules, strokeThickness, positioningRules], index);
        return state.current.result;
    // glyphDataMap is updated in place; glyphVersion says when.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [glyphDataMap, glyphVersion, allCharsByName, markPositioningMap, characterSets, groups, metrics, markAttachmentRules, strokeThickness, positioningRules, index]);

    return <MeasurableGlyphsContext.Provider value={value}>{children}</MeasurableGlyphsContext.Provider>;
};

export const useMeasurableGlyphs = (): Map<number, GlyphData> => {
    const value = useContext(MeasurableGlyphsContext);
    if (!value) throw new Error('useMeasurableGlyphs must be used within a MeasurableGlyphsProvider');
    return value;
};
