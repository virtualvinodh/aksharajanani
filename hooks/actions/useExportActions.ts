
import { shouldShowUseYourFont } from '../../components/UseYourFontModal';
import React, { useState, useCallback, useRef } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { useGlyphData } from '../../contexts/GlyphDataContext';
import { useKerning } from '../../contexts/KerningContext';
import { useSettings } from '../../contexts/SettingsContext';
import { usePositioning } from '../../contexts/PositioningContext';
import { useRules } from '../../contexts/RulesContext';
import { useLayout } from '../../contexts/LayoutContext';
import { useLocale } from '../../contexts/LocaleContext';
import { exportToOtf } from '../../services/fontService';
import * as dbService from '../../services/dbService';
import { ProjectData } from '../../types';
import { useProgressCalculators } from '../useProgressCalculators';
import { simpleHash } from '../../utils/stringUtils';
import { marksAreAccents } from '../../utils/marksWording';
import { nextFontVersion, normalizeFontVersion } from '../../utils/fontVersion';
import { fontFileName } from '../../utils/fontNaming';
import { findRulesWithMissingGroups } from '../../services/ruleGroupCheck';
import type { FontFileFormat } from '../../services/pythonFontService';

export type ExportingType = 'export' | 'test' | 'create' | null;

interface UseExportActionsProps {
    getProjectState: () => Omit<ProjectData, 'projectId' | 'savedAt'> | null;
    projectId: number | undefined;
    projectName: string;
    setIsAnimatingExport: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useExportActions = ({
    getProjectState, projectId, projectName, setIsAnimatingExport,
}: UseExportActionsProps) => {
    
    const { t } = useLocale();
    const layout = useLayout();
    const { settings, metrics, dispatch: settingsDispatch } = useSettings();
    const { characterSets, allCharsByUnicode, allCharsByName, isEditMode, baseFontBinary } = useProject();
    const { glyphDataMap, version: glyphVersion } = useGlyphData();
    const { kerningMap, suggestedKerningMap, ignoredPairs } = useKerning();
    const { markPositioningMap } = usePositioning();
    const { state: rulesState } = useRules();
    const { fontRules, isFeaEditMode, manualFeaCode } = rulesState;
    const { positioningRules, markAttachmentRules, recommendedKerning, guideFont, script } = useProject();

    const [exportingType, setExportingType] = useState<ExportingType>(null);
    const [feaErrorState, setFeaErrorState] = useState<{ error: string, blob: Blob } | null>(null);
    const [testPageFont, setTestPageFont] = useState<{ blob: Blob | null, feaError: string | null }>({ blob: null, feaError: null });
    
    // State for Creator Page (mirroring Test Page pattern)
    const [creatorFont, setCreatorFont] = useState<{ blob: Blob | null, feaError: string | null }>({ blob: null, feaError: null });

    const { drawingProgress, positioningProgress, kerningProgress } = useProgressCalculators({ 
        characterSets, glyphDataMap, markPositioningMap, recommendedKerning, 
        allCharsByName, fontRules, kerningMap, positioningRules, glyphVersion 
    });

    /** Downloads the font as "<font name> <version>.otf" (local date and time without a version; row 40). */
    const downloadFontBlob = useCallback((blob: Blob, fontName: string, version?: string | null, format: FontFileFormat = 'otf'): string => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fontFileName(fontName, version).replace(/\.otf$/i, `.${format}`);
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        return a.download;
    }, []);

    const handleSaveProject = useCallback(async () => {
        const projectState = getProjectState();
        if (!settings || !projectState) return;

        const projectDataWithTimestamp: ProjectData = {
            ...projectState,
            projectId,
            savedAt: new Date().toISOString(),
        };
        const jsonString = JSON.stringify(projectDataWithTimestamp, null, 2);
        
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const safeFileName = projectName.replace(/[^a-z0-9\- ]/gi, '_').trim();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `${safeFileName}_${timestamp}.json`;
        
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        
        layout.showNotification(t('projectSavedAsJson'));
    }, [settings, getProjectState, projectId, layout, t, projectName]);
    
    // NEW: Export as Template (Structure only, no paths)
    const handleSaveTemplate = useCallback(async () => {
        const projectState = getProjectState();
        if (!settings || !projectState) return;

        // Create a clean copy
        const templateData: ProjectData = { ...projectState };
        
        // 1. Strip Glyph Paths
        templateData.glyphs = templateData.glyphs.map(([unicode, _]) => [unicode, { paths: [] }]);
        
        // 2. Reset Positioning Vectors
        templateData.markPositioning = []; 
        
        // 3. Reset Kerning
        templateData.kerning = [];
        
        // 4. Ensure Metadata & Config
        // Explicitly include guideFont and map custom sample text
        if (guideFont) {
            templateData.guideFont = guideFont;
        }
        if (settings.customSampleText) {
            // We store sample text in the script config structure for templates
            // This allows new projects created from this template to pick it up.
        }

        // 5. Clean DB IDs
        delete templateData.projectId;
        delete templateData.savedAt;
        templateData.name = `${projectName} Template`;

        const jsonString = JSON.stringify(templateData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const safeFileName = projectName.replace(/[^a-z0-9\- ]/gi, '_').trim();
        a.download = `${safeFileName}_Template.json`;
        
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        layout.showNotification(t('templateSaved'));

    }, [settings, getProjectState, projectName, layout, guideFont, t]);

    /**
     * The built font, from the cache when nothing changed. The version number goes up after every
     * download, so it's kept out of the "did anything change" hash: Test and Creator can reuse the
     * font just exported. A download needs a font built with the current version (`forDownload`).
     */
    const getCachedOrGeneratedFont = useCallback(async (forDownload = false): Promise<{ blob: Blob; feaError: string | null } | null> => {
        const projectState = getProjectState();

        if (!projectState || !settings || !metrics || !characterSets) {
            layout.showNotification(t('projectNotReady'), 'error');
            return null;
        }
    
        const version = projectState.settings?.fontVersion ?? '';
        const projectString = JSON.stringify({ ...projectState, settings: projectState.settings && { ...projectState.settings, fontVersion: undefined } });
        const contentHash = simpleHash(projectString);
        const currentHash = `${contentHash}|${version}`;
        let feaError: string | null = null;
        let fontBlob: Blob | null = null;

        // Any failure (worker, Pyodide/CDN, IndexedDB) must surface as an error and resolve to null;
        // an uncaught rejection here previously left the export spinner running forever.
        try {
            if (projectId) {
                try {
                    const cachedData = await dbService.getFontCache(projectId);
                    if (cachedData && (forDownload ? cachedData.hash === currentHash : String(cachedData.hash).split('|')[0] === String(contentHash))) {
                        fontBlob = cachedData.fontBinary;
                    }
                } catch (cacheError) {
                    console.warn('Font cache read failed; regenerating.', cacheError);
                }
            }

            if (!fontBlob) {
                // MERGE KERNING: Use suggested values as base, overwrite with manual values
                const effectiveKerningMap = new Map(suggestedKerningMap);
                kerningMap.forEach((value, key) => {
                    effectiveKerningMap.set(key, value);
                });
                // Ensure ignored pairs are NOT in the export
                ignoredPairs.forEach(key => effectiveKerningMap.delete(key));

                const result = await exportToOtf(
                    glyphDataMap, settings, t, fontRules, metrics, characterSets, 
                    effectiveKerningMap, markPositioningMap, allCharsByUnicode, 
                    positioningRules, markAttachmentRules, isFeaEditMode, manualFeaCode, 
                    layout.showNotification, isEditMode, baseFontBinary
                );
                fontBlob = result.blob;
                feaError = result.feaError;
                if (projectId && fontBlob && !feaError) {
                    try {
                        await dbService.setFontCache(projectId, currentHash, fontBlob);
                    } catch (cacheError) {
                        console.warn('Font cache write failed.', cacheError);
                    }
                }
            }
        } catch (error) {
            console.error('Font generation failed:', error);
            const message = error instanceof Error ? error.message : String(error);
            layout.showNotification(t('errorFontGeneration', { error: message }), 'error');
            return null;
        }

        if (!fontBlob) return null;
        return { blob: fontBlob, feaError: feaError };
    }, [getProjectState, projectId, settings, metrics, characterSets, glyphDataMap, t, fontRules, kerningMap, suggestedKerningMap, ignoredPairs, markPositioningMap, allCharsByUnicode, positioningRules, markAttachmentRules, isFeaEditMode, manualFeaCode, layout.showNotification, isEditMode, baseFontBinary]);

    /** Builds the font and downloads it: OTF by default, or WOFF2/TTF from the ⋮ menu (row 92). */
    const performExport = useCallback(async (format: FontFileFormat = 'otf') => {
        setExportingType('export');
        layout.showNotification(t('exportingNotice'), 'info');
        setFeaErrorState(null);
        
        try {
            // Resolves to null after notifying the user of the specific failure.
            const result = await getCachedOrGeneratedFont(true);
            if (result) {
                const { blob, feaError } = result;
                if (feaError) {
                    setFeaErrorState({ error: feaError, blob });
                    layout.openModal('feaError');
                } else {
                    let fileName: string;
                    if (format === 'otf') {
                        fileName = downloadFontBlob(blob, settings?.fontName || projectName, isEditMode ? null : normalizeFontVersion(settings?.fontVersion));
                    } else {
                        const { convertFont } = await import('../../services/pythonFontService');
                        const converted = await convertFont(blob, format);
                        fileName = downloadFontBlob(converted, settings?.fontName || projectName, isEditMode ? null : normalizeFontVersion(settings?.fontVersion), format);
                    }
                    // The next export gets the next version number (1.000 → 1.001), so a reinstalled font is seen as newer.
                    // (Not for an imported font being edited: its own name table and version are kept.)
                    if (!isEditMode) settingsDispatch({ type: 'UPDATE_SETTINGS', payload: prev => prev && { ...prev, fontVersion: nextFontVersion(prev.fontVersion) } });
                    // Say how to use the file (UX §8): Windows, Mac, Word, Canva, phone, web. The dialog also
                    // reminds people to keep a backup, since the project lives only in this browser.
                    // Rules that use a group that no longer exists were left out of the font: say so (F50).
                    const missing = findRulesWithMissingGroups(fontRules, characterSets);
                    const warning = missing.rules > 0
                        ? t('exportRulesLeftOut', { count: missing.rules, groups: missing.groups.join(', ') })
                        : undefined;
                    if (format === 'otf' && shouldShowUseYourFont()) {
                        layout.closeNotification(); // the "building your font" message would cover the dialog
                        // The same font as WOFF2 (websites) or TTF (older apps), from the file just
                        // downloaded: rebuilding would give the next version number (M11).
                        const onOtherFormat = async (format: FontFileFormat) => {
                            const { convertFont } = await import('../../services/pythonFontService');
                            const converted = await convertFont(blob, format);
                            const url = URL.createObjectURL(converted);
                            const a = document.createElement('a');
                            a.href = url; a.download = fileName.replace(/\.otf$/i, `.${format}`);
                            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                            return a.download;
                        };
                        layout.openModal('useYourFont', { fileName, warning, onOtherFormat });
                    }
                    else layout.showNotification([t('fontExportedSuccess'), warning, t('backupReminderAfterExport')].filter(Boolean).join(' '), 'success', { duration: warning ? 15000 : 8000 });
                }
            }
        } finally {
            setExportingType(null);
        }
    }, [getCachedOrGeneratedFont, downloadFontBlob, layout, t, projectName, settingsDispatch, fontRules, characterSets, isEditMode, settings?.fontName, settings?.fontVersion]);

    // Shared logic to check for completeness and warn if necessary
    const checkAndExecute = useCallback((onProceed: () => void) => {
        if (drawingProgress.completed === 0) {
            layout.showNotification(t('errorNoGlyphs'), 'error');
            return;
        }

        // How much is left in each step, so the warning can say it in numbers. Placing and spacing
        // count only what can be done now, with every letter drawn (row 104): with 3 letters drawn,
        // "2020 marks haven't been checked" was mostly about letters that don't exist yet.
        const remaining = {
            drawing: Math.max(0, drawingProgress.total - drawingProgress.completed),
            positioning: positioningProgress.pendingReady,
            kerning: kerningProgress.pendingReady,
            accents: marksAreAccents(script),
        };

        const shouldWarn = remaining.drawing > 0 || remaining.positioning > 0 || remaining.kerning > 0;

        if (shouldWarn) {
            layout.openModal('incompleteWarning', {
                status: remaining,
                onConfirm: () => {
                    layout.closeModal();
                    onProceed();
                }
            });
        } else {
            onProceed();
        }
    }, [drawingProgress, positioningProgress, kerningProgress, settings, layout, t, script]);

    const buildAndDownload = useCallback((format: FontFileFormat = 'otf') => {
        // Start building right away. The letters animation is progress feedback for
        // slow builds only: it appears if the font is not ready within 300ms (a cached
        // font exports instantly) and never holds up the download.
        const showAnimation = window.setTimeout(() => setIsAnimatingExport(true), 300);
        void performExport(format).finally(() => {
            window.clearTimeout(showAnimation);
            setIsAnimatingExport(false);
        });
    }, [performExport, setIsAnimatingExport]);
    // After the name question the font must be built with the new name, i.e. by the next render's
    // buildAndDownload, not the one this click started with.
    const latestBuild = useRef(buildAndDownload);
    latestBuild.current = buildAndDownload;

    // Called from buttons too, so anything that isn't a format name (a click event) means OTF.
    const startExportProcess = useCallback((formatArg?: unknown) => {
        const format: FontFileFormat = formatArg === 'woff2' || formatArg === 'ttf' ? formatArg : 'otf';
        checkAndExecute(() => {
            // The first export asks what the font should be called (row 40); an imported font keeps its own name.
            if (settings && !settings.fontNameAsked && !isEditMode) {
                layout.openModal('fontNamePrompt', {
                    onDone: () => { layout.closeModal(); window.setTimeout(() => latestBuild.current(format), 0); },
                    onCancel: layout.closeModal,
                });
            } else buildAndDownload(format);
        });
    }, [checkAndExecute, buildAndDownload, settings, isEditMode, layout]);

    const handleTestClick = useCallback(async () => {
        // Like Export and Create: with nothing drawn there is nothing to try (F23).
        if (drawingProgress.completed === 0) {
            layout.showNotification(t('errorNoGlyphs'), 'error');
            return;
        }
        setExportingType('test');
        layout.showNotification(t('exportingNotice'), 'info');
        let result: Awaited<ReturnType<typeof getCachedOrGeneratedFont>> = null;
        try {
            // Resolves to null after notifying the user of the specific failure.
            result = await getCachedOrGeneratedFont();
        } finally {
            setExportingType(null);
        }
        if (result) {
            setTestPageFont(result);
            layout.closeNotification(); // "Building your font…" is done
            layout.openModal('testPage');
        }
    }, [getCachedOrGeneratedFont, layout, t, drawingProgress.completed]);
    
    // New handler moved from useAppActions
    const handleCreatorClick = useCallback(() => {
        const proceedToCreator = async () => {
            setExportingType('create');
            layout.showNotification(t('exportingNotice'), 'info');
            try {
                const result = await getCachedOrGeneratedFont();
                // Resolves to null after notifying the user of the specific failure.
                if (result) {
                    setCreatorFont(result);
                    layout.closeNotification(); // "Building your font…" is done
                    layout.setCurrentView('creator');
                }
            } finally {
                setExportingType(null);
            }
        };

        // Creator Studio only previews the font, so an unfinished font is fine here; the
        // "tasks incomplete" warning is for exporting a font file. It still needs some glyphs.
        if (drawingProgress.completed === 0) {
            layout.showNotification(t('errorNoGlyphs'), 'error');
            return;
        }
        void proceedToCreator();
    }, [getCachedOrGeneratedFont, layout, t, drawingProgress.completed]);

    return {
        exportingType,
        feaErrorState,
        testPageFont,
        creatorFont, // Exposed
        startExportProcess,
        performExport,
        handleSaveProject,
        handleSaveTemplate,
        handleTestClick,
        handleCreatorClick, // Exposed
        downloadFontBlob,
        getCachedOrGeneratedFont
    };
};
