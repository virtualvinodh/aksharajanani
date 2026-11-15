
import React, { useMemo } from 'react';
import { Step, Placement } from 'react-joyride';
import { renderFormattedText } from '../../utils/formattedText';
import { toolTourTarget, COMPACT_TOOLBAR_QUERY } from '../drawing/compactToolbar';
import { TourId } from './tours';

/**
 * The tutorial (in the practice project) is a short core, "Step 1 of 10": draw two letters, try
 * them, see how to get the font. Every other step lives in a tour of its own, started from
 * Help → Tours (row 62). Each tour starts from the letters grid.
 */
export const useTutorialSteps = (
    translations: Record<string, string> | null,
    isLargeScreen: boolean
): Record<TourId, Step[]> => {
    return useMemo(() => {
        const empty = { core: [], tools: [], shapes: [], builtLetters: [], accents: [], spacing: [], share: [] } as Record<TourId, Step[]>;
        if (!translations) return empty;

        // Tutorial strings use simple markdown (e.g. **bold**); render it as real formatting.
        const richText = (key: string) => React.createElement('div', null, renderFormattedText(translations[key]));
        const titled = (titleKey: string, key: string) => React.createElement('div', null,
            React.createElement('h3', { className: "font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400" }, translations[titleKey]),
            React.createElement('p', null, renderFormattedText(translations[key]))
        );
        const compact = typeof window !== 'undefined' && !!window.matchMedia?.(COMPACT_TOOLBAR_QUERY).matches;
        const side = (isLargeScreen ? 'right' : 'bottom') as Placement;
        const toolSide = (isLargeScreen ? 'left' : 'top') as Placement;
        const canvasSide = (isLargeScreen ? 'right' : 'top') as Placement;

        const tour = (id: TourId, steps: Step[]): Step[] =>
            steps.map(s => ({ disableBeacon: true, ...s, data: { isTutorial: true, translations, tour: id, ...(s.data || {}) } }));
        const draw = (key: string): Step => ({ target: '[data-tour="drawing-canvas"]', content: richText(key), placement: canvasSide, spotlightClicks: true, disableOverlayClose: true });
        const openLetter = (name: string, key: string, advanceOn: string): Step => ({ target: `[data-tour="grid-item-${name}"]`, content: richText(key), spotlightClicks: true, hideFooter: true, data: { advanceOn } });
        const nextLetter = (key: string, advanceOn: string): Step => ({ target: '[data-tour="header-next"]', content: richText(key), spotlightClicks: true, hideFooter: true, data: { advanceOn } });
        const tool = (tourName: string, key: string): Step => ({ target: toolTourTarget(tourName), content: richText(key), placement: toolSide });

        // 1. The core: ten steps, the same on every screen size.
        const core = tour('core', [
            { target: 'body', content: titled('welcomeTitle', 'welcomeContent'), placement: 'center' as Placement },
            openLetter('A', 'clickFirstChar', 'selected-A'),
            draw('drawContent'),
            nextLetter('clickNextForA', 'selected-a'),
            draw('drawLowerA'),
            { target: '[data-tour="header-back"]', content: richText('clickBackToDashboard'), spotlightClicks: true, hideFooter: true, data: { advanceOn: 'back-to-dashboard' } },
            { target: '[data-tour="header-test"]', content: richText('clickTest'), spotlightClicks: true, hideFooter: true, data: { advanceOn: 'test-modal-open' } },
            { target: '[data-tour="test-page-input"]', content: richText('testPageInput'), placement: 'bottom' as Placement },
            { target: '[data-tour="test-page-close"]', content: richText('closeTestPage'), spotlightClicks: true, hideFooter: true, data: { advanceOn: 'test-modal-close' } },
            { target: '[data-tour="header-export"]', content: richText('coreExportAndFinish'), placement: 'bottom' as Placement },
        ]);

        // 2. Drawing tools.
        const tools = tour('tools', [
            openLetter('A', 'tourOpenAnyLetter', 'selected-A'),
            ...(isLargeScreen ? [{ target: '[data-tour="split-view-resizer"]', content: richText('splitViewIntro'), placement: 'right' as Placement, styles: { spotlight: { borderRadius: '8px' } } }] : []),
            { target: '[data-tour="main-toolbar"]', content: richText('toolbarIntro'), placement: side },
            tool('toolbar-pen', 'toolbarPenContent'),
            { target: '[data-tour="main-toolbar"]', content: richText('toolbarActionsIntro'), placement: side },
            ...(compact ? [{ target: '[data-tour="tool-more"]', content: richText('moreToolsTour'), placement: 'top' as Placement }] : []),
            tool('tool-select', 'toolSelect'),
            tool('tool-pan', 'toolPan'),
            tool('tool-calligraphy', 'toolCalligraphy'),
            tool('tool-eraser', 'toolEraser'),
            tool('tool-slice', 'toolSlice'),
            tool('action-undo', 'actionUndo'),
            tool('action-redo', 'actionRedo'),
            tool('action-cut', 'actionCut'),
            tool('action-copy', 'actionCopy'),
            tool('action-paste', 'actionPaste'),
            tool('action-group', 'actionGroup'),
            tool('action-ungroup', 'actionUngroup'),
            tool('action-trace-photo', 'tracePhotoTour'),
            tool('action-fit-view', 'fitViewTour'),
        ]);

        // 3. Shape tools and a letter's own space.
        const shapes = tour('shapes', [
            openLetter('T', 'clickNextForT', 'selected-T'),
            { target: '[data-tour="main-toolbar"]', content: richText('selectLineTool'), spotlightClicks: true, placement: side },
            draw('drawT'),
            { target: '[data-tour="drawing-canvas"]', content: richText('explainBearings'), placement: 'top' as Placement },
            { target: '[data-tour="drawing-canvas"]', content: richText('dragLSB'), placement: 'top' as Placement, spotlightClicks: true, disableOverlayClose: true },
            { target: '[data-tour="drawing-canvas"]', content: richText('dragRSB'), placement: 'top' as Placement, spotlightClicks: true, disableOverlayClose: true },
        ]);

        // 4. Letters made from other letters: a starting point (E from F) and a linked letter (from e).
        const builtLetters = tour('builtLetters', [
            openLetter('F', 'selectCharF', 'selected-F'),
            draw('drawCharF'),
            nextLetter('clickNextForComposite', 'selected-E'),
            { target: 'body', content: richText('compositeExplanation'), placement: 'center' as Placement },
            draw('drawComposite'),
            { target: '[data-tour="header-reset"]', content: richText('compositeTools'), placement: 'bottom' as Placement },
            nextLetter('clickNextForLowerE', 'selected-e'),
            draw('drawLowerE'),
            nextLetter('clickNextForLinked', 'selected-combining'),
            { target: 'body', content: richText('linkedExplanation'), placement: 'center' as Placement },
            { target: '[data-tour="linked-source-strip"]', content: richText('linkedStripNav'), placement: 'top' as Placement },
            { target: '[data-tour="drawing-canvas"]', content: richText('transformLinked'), placement: canvasSide, spotlightClicks: true },
            { target: '[data-tour="header-unlink"]', content: richText('unlinkExpl'), placement: 'bottom' as Placement, spotlightClicks: true, disableOverlayClose: true, hideFooter: true, data: { advanceOn: 'unlinked-combining' } },
            { target: '[data-tour="header-relink"]', content: richText('relinkExpl'), placement: 'bottom' as Placement, spotlightClicks: true, hideFooter: true, data: { advanceOn: 'relinked-combining' } },
            { target: '[data-tour="header-prev"]', content: richText('clickPrevForModification'), spotlightClicks: true, hideFooter: true, data: { advanceOn: 'selected-e' } },
            draw('modifyLowerE'),
            nextLetter('clickNextToVerify', 'selected-combining'),
            { target: '[data-tour="drawing-canvas"]', content: richText('verifyLink'), placement: canvasSide },
        ]);

        // 5. Accents: letters placed automatically, then the Positioning screen.
        const accents = tour('accents', [
            openLetter('n', 'clickNextForN', 'selected-n'),
            draw('drawN'),
            nextLetter('clickNextForTilde', 'selected-tilde'),
            draw('drawTilde'),
            nextLetter('clickNextForMacron', 'selected-macron'),
            draw('drawMacron'),
            nextLetter('clickNextForNTilde', 'selected-ntilde'),
            { target: '[data-tour="positioning-canvas"]', content: richText('positioningConcept'), placement: 'top' as Placement },
            { target: '[data-tour="related-pairs-strip"]', content: richText('positioningStripIntro'), placement: 'top' as Placement },
            { target: '[data-tour="positioning-canvas"]', content: richText('positioningDrag'), placement: 'top' as Placement, spotlightClicks: true },
            { target: '[data-tour="strip-item-n̄"]', content: richText('positioningStripNavToNBar'), placement: 'top' as Placement, spotlightClicks: true, hideFooter: true, data: { advanceOn: 'selected-nbar' } },
            { target: '[data-tour="positioning-canvas"]', content: richText('smartClassExpl'), placement: 'top' as Placement },
            { target: '[data-tour="header-detach-pos"]', content: richText('detachExpl'), placement: 'bottom' as Placement },
            { target: '[data-tour="positioning-canvas"]', content: richText('positioningTryDragLocked'), placement: 'top' as Placement, spotlightClicks: true },
            { target: '[data-tour="positioning-canvas"]', content: richText('positioningExplainLock'), placement: 'top' as Placement },
            { target: '[data-tour="strip-link-toggle"]', content: richText('positioningClickUnlink'), placement: 'top' as Placement, spotlightClicks: true },
            { target: '[data-tour="strip-link-toggle"]', content: richText('positioningConfirmOverride'), placement: 'top' as Placement },
            { target: '[data-tour="positioning-canvas"]', content: richText('positioningDragOverride'), placement: 'top' as Placement, spotlightClicks: true },
            { target: '[data-tour="positioning-canvas"]', content: richText('positioningOverrideFinish'), placement: 'top' as Placement },
            { target: '[data-tour="header-back"]', content: richText('explainBack'), spotlightClicks: true, hideFooter: true, data: { advanceOn: 'back-to-dashboard' } },
            { target: 'body', content: richText('threePillarsIntro'), placement: 'center' as Placement },
            { target: '[data-tour="nav-positioning"]', content: richText('positioningNav'), spotlightClicks: true, hideFooter: true, data: { advanceOn: 'workspace-positioning' } },
            { target: 'body', content: richText('positioningIntro'), placement: 'center' as Placement },
            { target: '[data-tour="positioning-view-toggle"]', content: richText('positioningViews'), placement: 'bottom' as Placement },
            { target: '[data-tour="start-positioning-rule-A-ͤ"]', content: richText('startPositioning'), spotlightClicks: true, hideFooter: true },
            { target: '[data-tour="combo-card-Aͤ"]', content: richText('positioningPreviewCard'), placement: 'top' as Placement },
            { target: '[data-tour="accept-pos-Aͤ"]', content: richText('positioningAccept'), spotlightClicks: true, hideFooter: true, data: { advanceOn: 'accepted-A-combining' } },
            { target: '[data-tour="combo-card-Eͤ"]', content: richText('positioningEdit'), spotlightClicks: true, hideFooter: true },
            { target: '[data-tour="positioning-editor-page"]', content: richText('positioningEditor') },
        ]);

        // 6. Spacing: overall spacing, then pair fixes.
        const spacing = tour('spacing', [
            { target: '[data-tour="nav-kerning"]', content: richText('kerningNav'), spotlightClicks: true, hideFooter: true, data: { advanceOn: 'workspace-kerning' } },
            { target: '[data-tour="spacing-defaults"]', content: richText('spacingStripTour'), placement: 'bottom' as Placement },
            { target: '[data-tour="kerning-tabs"]', content: richText('kerningIntroAndViews'), placement: 'bottom' as Placement },
            { target: '[data-tour="pair-card-Te"]', content: richText('kerningManualEdit'), spotlightClicks: true, hideFooter: true },
            { target: '[data-tour="kerning-canvas"]', content: richText('kerningEditor'), placement: 'top' as Placement, spotlightClicks: true, hideFooter: true, data: { advanceOn: 'kerned-Te-action' } },
            { target: '[data-tour="header-back"]', content: richText('kerningClickBack'), placement: 'bottom' as Placement, spotlightClicks: true, hideFooter: true, data: { advanceOn: 'kerning-editor-closed' } },
            { target: '[data-tour="tab-spaced"]', content: richText('kerningSpacedTab'), placement: 'bottom' as Placement },
            { target: '[data-tour="auto-kern-btn"]', content: richText('kerningAutoTools'), placement: 'bottom' as Placement },
            { target: '[data-tour="tab-all"]', content: richText('kerningAllPairsTab'), placement: 'bottom' as Placement },
        ]);

        // 7. Picture, compare, settings and export.
        const share = tour('share', [
            { target: '[data-tour="header-creator"]', content: richText('explainCreator'), placement: 'bottom' as Placement },
            { target: '[data-tour="header-compare"]', content: richText('explainCompare'), placement: 'bottom' as Placement },
            { target: '[data-tour="header-settings"]', content: richText('explainSettings'), placement: 'bottom' as Placement },
            { target: '[data-tour="header-export"]', content: richText('explainExport'), placement: 'bottom' as Placement },
            { target: 'body', content: richText('finalCongratulations'), placement: 'center' as Placement },
        ]);

        return { core, tools, shapes, builtLetters, accents, spacing, share };
    }, [translations, isLargeScreen]);
};
