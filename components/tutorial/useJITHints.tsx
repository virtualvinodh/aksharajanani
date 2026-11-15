
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { CallBackProps, STATUS, EVENTS, ACTIONS, Step, Placement } from 'react-joyride';
import { useProject } from '../../contexts/ProjectContext';
import { useGlyphData } from '../../contexts/GlyphDataContext';
import { useLayout } from '../../contexts/LayoutContext';
import { isGlyphDrawn } from '../../utils/glyphUtils';
import { renderFormattedText } from '../../utils/formattedText';
import { toolTourTarget } from '../drawing/compactToolbar';

/** The first element matching `selector` that is fully on screen (a hint must point at something visible). */
const firstOnScreen = (selector: string): HTMLElement | null => {
    const el = Array.from(document.querySelectorAll<HTMLElement>(selector)).find(e => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth;
    });
    return el ?? null;
};

/** The element a step points at, if it is still on the page and has a size. */
const resolveTarget = (target: Step['target']): Element | null => {
    if (target === 'body') return document.body;
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el || !(el as Element).isConnected) return null;
    const r = (el as Element).getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? el as Element : null;
};

/** A dialog is open (one of the app's, or a page like Help): no tip may appear over it. */
const dialogOpen = (): boolean => !!document.querySelector('[role="dialog"][aria-modal="true"], #mobile-nav-drawer');

export const useJITHints = (
    translations: Record<string, string> | null,
    isLargeScreen: boolean
) => {
    const { script } = useProject();
    const { glyphDataMap, version } = useGlyphData();
    const { selectedCharacter, activeModal, workspace, currentView, isNavDrawerOpen, isMetricsSelectionMode } = useLayout();
    // In the middle of something else (choosing several letters, a menu or dialog open): no tips.
    const isBusy = isMetricsSelectionMode || isNavDrawerOpen;
    
    const [run, setRun] = useState(false);
    const [steps, setSteps] = useState<Step[]>([]);

    // Tips that shouldn't block the screen: no dark overlay, and clicking anywhere outside the
    // tip (the canvas, Back, another glyph…) just ends it.
    const nonBlocking = (list: Step[]): Step[] =>
        list.map(step => ({ ...step, disableOverlay: true, data: { ...step.data, nonBlocking: true } }));
    // Every just-in-time tip is non-blocking (U14): a tip must never swallow a stroke or a click.
    const shownSteps = useMemo(() => nonBlocking(steps), [steps]);

    // Tips shouldn't arrive one on top of the other: after one closes, wait a little before the next.
    const TIP_GAP_MS = 8000;
    const lastTipEndedAt = useRef(0);
    // The Test and Export hints are for the moment someone comes back to the grid after drawing,
    // not for opening a project that already has letters (row 113): track that moment.
    const drawnWhenEditorOpened = useRef<number | null>(null);
    const [drewSinceOpen, setDrewSinceOpen] = useState(false);
    const [gapTick, setGapTick] = useState(0);
    const wasRunning = useRef(false);
    useEffect(() => {
        if (wasRunning.current && !run) lastTipEndedAt.current = Date.now();
        wasRunning.current = run;
    }, [run]);
    const isNonBlockingRun = run && steps.length > 0;
    const [stepIndex, setStepIndex] = useState(0);
    const currentTargetRef = useRef<Step['target'] | null>(null);
    currentTargetRef.current = steps[stepIndex]?.target ?? null;
    useEffect(() => {
        if (!isNonBlockingRun) return;
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Element | null;
            if (target?.closest?.('[data-tutorial-tooltip]')) return;
            // Using the thing the tip points at (dragging a spacing line, a tool) keeps the tip.
            const pointed = currentTargetRef.current ? resolveTarget(currentTargetRef.current) : null;
            if (pointed && pointed !== document.body && target && pointed.contains(target)) return;
            setRun(false);
            setSteps([]);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => document.removeEventListener('pointerdown', onPointerDown, true);
    }, [isNonBlockingRun]);

    useEffect(() => {
        if (isNonBlockingRun && isBusy) { setRun(false); setSteps([]); }
    }, [isNonBlockingRun, isBusy]);

    // A tip whose target went away (the grid re-rendered, a panel closed) would float loose in
    // the middle of the screen. Point it at a fresh card, or hide it (unseen, so it comes back).
    useEffect(() => {
        if (!isNonBlockingRun) return;
        const timer = setInterval(() => {
            const step = steps[stepIndex];
            if (!step || resolveTarget(step.target)) return;
            if (step.data?.storageKey === 'hint_grid_select_seen') {
                const card = firstOnScreen('.tutorial-glyph-item');
                if (card) { setSteps(list => list.map((s, i) => i === stepIndex ? { ...s, target: card } : s)); return; }
            }
            setRun(false);
            setSteps([]);
        }, 500);
        return () => clearInterval(timer);
    }, [isNonBlockingRun, steps, stepIndex]);

    const isTutorialActive = script?.id === 'tutorial';

    // Calculate total drawn glyphs for JIT logic
    const drawnCount = useMemo(() => {
        let count = 0;
        glyphDataMap.forEach((data) => {
            if (isGlyphDrawn(data)) count++;
        });
        return count;
    }, [glyphDataMap, version]);

    // Opening a letter remembers how many were drawn; coming back with more drawn is the moment
    // for the Test/Export hints. Once shown, they stay seen (their own storage keys).
    // (On a phone the letter is saved as the editor closes, so the count can rise just after.)
    useEffect(() => {
        if (selectedCharacter) {
            if (drawnWhenEditorOpened.current === null) drawnWhenEditorOpened.current = drawnCount;
        } else if (drawnWhenEditorOpened.current !== null && drawnCount > drawnWhenEditorOpened.current) {
            setDrewSinceOpen(true);
            drawnWhenEditorOpened.current = null;
        }
    }, [selectedCharacter, drawnCount]);

    // Triggers
    useEffect(() => {
        if (!translations || isTutorialActive || activeModal || run || isMetricsSelectionMode) return;
        // Right after another tip: look again once the gap is over (otherwise the hint was lost
        // until something else changed, e.g. the Test hint after the phone's first-stroke tip).
        const sinceLastTip = Date.now() - lastTipEndedAt.current;
        if (sinceLastTip < TIP_GAP_MS) {
            const retry = window.setTimeout(() => setGapTick(n => n + 1), TIP_GAP_MS - sinceLastTip + 50);
            return () => window.clearTimeout(retry);
        }
        
        // Global Header Hints: Test & Export. Only on the grid, never while a letter is open: they
        // used to arrive mid-letter and eat the next strokes (U14).
        const isHeaderVisible = !['creator', 'settings', 'comparison', 'rules'].includes(currentView);
        const canShowHeaderHints = isHeaderVisible && !selectedCharacter && !isNavDrawerOpen && drewSinceOpen;

        if (canShowHeaderHints) {
            const exportUnseen = drawnCount >= 3 && !localStorage.getItem('hint_export_seen');
            const testUnseen = drawnCount > 0 && !localStorage.getItem('hint_test_seen');
            
            if (exportUnseen) {
                 const exportBtn = document.querySelector('[data-tour="header-export"]');
                 if (exportBtn) {
                     const timer = setTimeout(() => {
                        if (dialogOpen()) return;
                        setSteps([{
                            target: '[data-tour="header-export"]',
                            content: (
                                <div>
                                    <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintExportTitle}</h3>
                                    <p>{renderFormattedText(translations.hintExportContent)}</p>
                                </div>
                            ),
                            placement: 'bottom',
                            disableBeacon: true,
                            spotlightClicks: true,
                            data: { isTutorial: false, storageKey: 'hint_export_seen', translations }
                        }]);
                        setStepIndex(0);
                        setRun(true);
                    }, 2500);
                    return () => clearTimeout(timer);
                 }
            } else if (testUnseen) {
                 const testBtn = document.querySelector('[data-tour="header-test"]');
                 if (testBtn) {
                     const timer = setTimeout(() => {
                        if (dialogOpen()) return;
                        setSteps([{
                            target: '[data-tour="header-test"]',
                            content: (
                                <div>
                                    <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintTestTitle}</h3>
                                    <p>{renderFormattedText(translations.hintTestContent)}</p>
                                </div>
                            ),
                            placement: 'bottom',
                            disableBeacon: true,
                            spotlightClicks: true,
                            data: { isTutorial: false, storageKey: 'hint_test_seen', translations }
                        }]);
                        setStepIndex(0);
                        setRun(true);
                    }, 2500);
                    return () => clearTimeout(timer);
                 }
            }
        }

        if (workspace === 'drawing') {
            // Combined Grid Hints Logic: Prioritize "Review Required" over "Select Character"
            if (currentView === 'grid' && !selectedCharacter) {
                const selectStorageKey = 'hint_grid_select_seen';
                const dottedStorageKey = 'hint_grid_dotted_seen';
                
                const hasSeenSelect = !!localStorage.getItem(selectStorageKey);
                const hasSeenDotted = !!localStorage.getItem(dottedStorageKey);

                if (!hasSeenSelect || !hasSeenDotted) {
                    const checkGridHints = setInterval(() => {
                        if (dialogOpen()) return;
                        // 1. Priority Check: Review Required (Dotted)
                        // We check this FIRST so it takes precedence over the generic select hint
                        if (!hasSeenDotted) {
                             // Only a card that's on screen: a tip pointing off screen is cut off (F16).
                             const dashedCard = Array.from(document.querySelectorAll('.tutorial-glyph-item [data-status="review-required"]')).find(el => {
                                 const r = el.getBoundingClientRect();
                                 return r.width > 0 && r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth;
                             });
                             if (dashedCard) {
                                 clearInterval(checkGridHints);
                                 setSteps([{
                                     target: dashedCard as HTMLElement,
                                     content: (
                                         <div>
                                             <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintGridDottedTitle}</h3>
                                             <p>{renderFormattedText(translations.hintGridDottedContent)}</p>
                                         </div>
                                     ),
                                     placement: 'bottom',
                                     disableBeacon: true,
                                     spotlightClicks: false,
                                     data: { isTutorial: false, storageKey: dottedStorageKey, translations }
                                 }]);
                                 setStepIndex(0);
                                 setRun(true);
                                 return; // Exit so we don't trigger the other hint
                             }
                        }

                        // 2. Fallback Check: Generic Select
                        // Only runs if we didn't trigger the review hint above
                        if (!hasSeenSelect) {
                            // The first card that's actually on screen, as an element: a selector
                            // could match a card that is hidden or scrolled away, and the tip then
                            // shows up in the middle of the screen instead of on a card.
                            const firstCard = firstOnScreen('.tutorial-glyph-item');
                            if (firstCard) {
                                clearInterval(checkGridHints);
                                setSteps([{
                                    target: firstCard,
                                    content: renderFormattedText(translations.hintGridSelect || "Select a character card to start drawing your font."),
                                    disableBeacon: true,
                                    placement: 'bottom' as Placement,
                                    spotlightClicks: true,
                                    disableScrolling: true,
                                    data: { isTutorial: false, storageKey: selectStorageKey, translations }
                                }]);
                                setStepIndex(0);
                                setRun(true);
                            }
                        }
                    }, 1000); // Check every 1s
                    
                    const safety = setTimeout(() => clearInterval(checkGridHints), 10000);
                    return () => { clearInterval(checkGridHints); clearTimeout(safety); };
                }
            }
            
            // Hints inside Editor
            if (selectedCharacter) {
                const currentGlyph = selectedCharacter.unicode ? glyphDataMap.get(selectedCharacter.unicode) : undefined;
                const isCurrentDrawn = isGlyphDrawn(currentGlyph);

                // Hint 2: Start Drawing (Only for the very first character)
                if (drawnCount === 0) {
                    const drawStorageKey = 'hint_editor_draw_seen';
                    if (!localStorage.getItem(drawStorageKey)) {
                        const timer = setTimeout(() => {
                            setSteps([{
                               target: '[data-tour="drawing-canvas"]',
                               content: renderFormattedText(translations.hintEditorDraw || "Start drawing here."),
                               disableBeacon: true,
                               placement: 'top' as Placement,
                               spotlightClicks: true,
                               data: { isTutorial: false, storageKey: drawStorageKey, translations }
                            }]);
                            setStepIndex(0);
                            setRun(true);
                        }, 800);
                        return () => clearTimeout(timer);
                    }
                }

                // New Hint: Toolbar Tour (Triggers on entering 2nd character, before drawing)
                if (drawnCount === 1 && !isCurrentDrawn) {
                    const toolbarStorageKey = 'hint_toolbar_seen';
                    if (!localStorage.getItem(toolbarStorageKey)) {
                         const placement = isLargeScreen ? 'right' as Placement : 'bottom' as Placement;
                         const timer = setTimeout(() => {
                             setSteps(nonBlocking([
                                {
                                    target: '[data-tour="main-toolbar"]',
                                    content: (
                                        <div>
                                            <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.toolbarTitle}</h3>
                                            <p>{renderFormattedText(translations.toolbarIntro)}</p>
                                        </div>
                                    ),
                                    placement,
                                    disableBeacon: true,
                                    data: { isTutorial: false, storageKey: toolbarStorageKey, translations }
                                },
                                ...(toolTourTarget('tool-select') === '[data-tour="tool-more"]' || toolTourTarget('tool-pan') === '[data-tour="tool-more"]' ? [{
                                    target: '[data-tour="tool-more"]',
                                    content: <div>{renderFormattedText(translations.moreToolsTour)}</div>,
                                    placement,
                                    data: { isTutorial: false, storageKey: toolbarStorageKey, translations }
                                }] : []),
                                {
                                    target: toolTourTarget('tool-select'),
                                    content: <div>{renderFormattedText(translations.toolSelect)}</div>,
                                    placement,
                                    data: { isTutorial: false, storageKey: toolbarStorageKey, translations }
                                },
                                {
                                    target: toolTourTarget('tool-pan'),
                                    content: <div>{renderFormattedText(translations.toolPan)}</div>,
                                    placement,
                                    data: { isTutorial: false, storageKey: toolbarStorageKey, translations }
                                },
                                {
                                    target: toolTourTarget('toolbar-pen'),
                                    content: renderFormattedText(translations.toolbarPenContent),
                                    placement,
                                    data: { isTutorial: false, storageKey: toolbarStorageKey, translations }
                                },
                                {
                                    target: toolTourTarget('tool-calligraphy'),
                                    content: <div>{renderFormattedText(translations.toolCalligraphy)}</div>,
                                    placement,
                                    data: { isTutorial: false, storageKey: toolbarStorageKey, translations }
                                },
                                {
                                    target: toolTourTarget('tool-eraser'),
                                    content: <div>{renderFormattedText(translations.toolEraser)}</div>,
                                    placement,
                                    data: { isTutorial: false, storageKey: toolbarStorageKey, translations }
                                },
                                {
                                    target: toolTourTarget('tool-slice'),
                                    content: <div>{renderFormattedText(translations.toolSlice)}</div>,
                                    placement,
                                    data: { isTutorial: false, storageKey: toolbarStorageKey, translations }
                                },
                                {
                                    target: toolTourTarget('action-undo'),
                                    content: <div>{renderFormattedText(translations.actionUndo)}</div>,
                                    placement,
                                    data: { isTutorial: false, storageKey: toolbarStorageKey, translations }
                                },
                                {
                                    target: toolTourTarget('action-redo'),
                                    content: <div>{renderFormattedText(translations.actionRedo)}</div>,
                                    placement,
                                    data: { isTutorial: false, storageKey: toolbarStorageKey, translations }
                                },
                                {
                                    target: toolTourTarget('action-cut'),
                                    content: <div>{renderFormattedText(translations.actionCut)}</div>,
                                    placement,
                                    data: { isTutorial: false, storageKey: toolbarStorageKey, translations }
                                },
                                {
                                    target: toolTourTarget('action-copy'),
                                    content: <div>{renderFormattedText(translations.actionCopy)}</div>,
                                    placement,
                                    data: { isTutorial: false, storageKey: toolbarStorageKey, translations }
                                },
                                {
                                    target: toolTourTarget('action-paste'),
                                    content: <div>{renderFormattedText(translations.actionPaste)}</div>,
                                    placement,
                                    data: { isTutorial: false, storageKey: toolbarStorageKey, translations }
                                },
                                {
                                    target: toolTourTarget('action-group'),
                                    content: <div>{renderFormattedText(translations.actionGroup)}</div>,
                                    placement,
                                    data: { isTutorial: false, storageKey: toolbarStorageKey, translations }
                                },
                                {
                                    target: toolTourTarget('action-ungroup'),
                                    content: <div>{renderFormattedText(translations.actionUngroup)}</div>,
                                    placement,
                                    data: { isTutorial: false, storageKey: toolbarStorageKey, translations }
                                },
                                {
                                    target: toolTourTarget('action-trace-photo'),
                                    content: <div>{renderFormattedText(translations.tracePhotoTour)}</div>,
                                    placement,
                                    data: { isTutorial: false, storageKey: toolbarStorageKey, translations }
                                },
                                {
                                    target: toolTourTarget('action-fit-view'),
                                    content: <div>{renderFormattedText(translations.fitViewTour)}</div>,
                                    placement,
                                    data: { isTutorial: false, storageKey: toolbarStorageKey, translations }
                                }
                             ]));
                             setStepIndex(0);
                             setRun(true);
                             // Show the toolbar tour once, however it ends (finished, closed, or
                             // interrupted by leaving the glyph); it must not restart on every glyph.
                             try { localStorage.setItem(toolbarStorageKey, 'true'); } catch { /* storage unavailable */ }
                         }, 500);
                         return () => clearTimeout(timer);
                    }
                }

                // New Hint: Metrics (Side Bearings) - Delayed until 2nd char is drawn
                // After a few letters, not on the second: that's when people draw near the lines.
                if (drawnCount >= 5 && isCurrentDrawn) {
                    const metricsStorageKey = 'hint_metrics_seen';
                    if (!localStorage.getItem(metricsStorageKey)) {
                        const timer = setTimeout(() => {
                            setSteps([{
                                target: '[data-tour="drawing-canvas"]',
                                content: (
                                    <div>
                                        <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintMetricsTitle}</h3>
                                        <p>{renderFormattedText(translations.hintMetricsContent)}</p>
                                    </div>
                                ),
                                placement: 'top',
                                disableBeacon: true,
                                spotlightClicks: true,
                                data: { isTutorial: false, storageKey: metricsStorageKey, translations }
                            }]);
                            setStepIndex(0);
                            setRun(true);
                        }, 2000); 
                        return () => clearTimeout(timer);
                    }
                }
            }

            // Hint 3: First Composite Glyph
            if (selectedCharacter) {
                 const isStaticComposite = (selectedCharacter.composite && selectedCharacter.composite.length > 0) && (!selectedCharacter.link);
                 if (isStaticComposite) {
                     const storageKey = 'hint_composite_seen';
                     if (!localStorage.getItem(storageKey)) {
                         const timer = setTimeout(() => {
                             setSteps([{
                                 target: '[data-tour="drawing-canvas"]',
                                 content: (
                                     <div>
                                         <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintCompositeTitle}</h3>
                                         <p>{renderFormattedText(translations.hintCompositeContent)}</p>
                                     </div>
                                 ),
                                 placement: 'top' as Placement,
                                 disableBeacon: true,
                                 spotlightClicks: true,
                                 data: { isTutorial: false, storageKey: storageKey, translations }
                             }]);
                             setStepIndex(0);
                             setRun(true);
                         }, 1200); 
                         return () => clearTimeout(timer);
                     }
                 }
            }
            // Hint 4: First Linked Glyph Intro
            if (selectedCharacter && selectedCharacter.link && selectedCharacter.link.length > 0) {
                const storageKey = 'hint_linked_intro_seen';
                if (!localStorage.getItem(storageKey)) {
                     const timer = setTimeout(() => {
                         setSteps([
                             {
                                 target: '[data-tour="drawing-canvas"]',
                                 content: (
                                     <div>
                                         <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintLinkedTitle}</h3>
                                         <p>{renderFormattedText(translations.hintLinkedContent)}</p>
                                     </div>
                                 ),
                                 placement: 'top' as Placement,
                                 disableBeacon: true,
                                 spotlightClicks: true,
                                 data: { isTutorial: false, storageKey: storageKey, translations } 
                             },
                             {
                                 target: '[data-tour="header-unlink"]',
                                 content: renderFormattedText(translations.hintUnlinkContent),
                                 placement: 'bottom' as Placement,
                                 disableBeacon: true,
                                 data: { isTutorial: false, storageKey: storageKey, translations }
                             }
                         ]);
                         setStepIndex(0);
                         setRun(true);
                     }, 1200);
                     return () => clearTimeout(timer);
                }
            }
            // Hint 5: Relink Action
            if (selectedCharacter && selectedCharacter.sourceLink) {
                const storageKey = 'hint_relink_action_seen';
                if (!localStorage.getItem(storageKey)) {
                     const timer = setTimeout(() => {
                         setSteps([{
                             target: '[data-tour="header-relink"]',
                             content: renderFormattedText(translations.hintRelinkContent),
                             placement: 'bottom' as Placement,
                             disableBeacon: true,
                             spotlightClicks: true,
                             data: { isTutorial: false, storageKey: storageKey, translations }
                         }]);
                         setStepIndex(0);
                         setRun(true);
                     }, 1000);
                     return () => clearTimeout(timer);
                }
            }
            // Hint 6: Positioned Glyph Intro
            if (selectedCharacter && !selectedCharacter.link && selectedCharacter.position && selectedCharacter.position.length > 0) {
                 const storageKey = 'hint_positioned_seen';
                 if (!localStorage.getItem(storageKey)) {
                     const timer = setTimeout(() => {
                         setSteps([
                            {
                                target: '[data-tour="positioning-canvas"]',
                                content: (
                                    <div>
                                        <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintPositionedTitle}</h3>
                                        <p>{renderFormattedText(translations.hintPositionedContent)}</p>
                                    </div>
                                ),
                                placement: 'top' as Placement,
                                disableBeacon: true,
                                spotlightClicks: true,
                                data: { isTutorial: false, storageKey: storageKey, translations }
                            },
                            {
                                target: '[data-tour="header-detach-pos"]',
                                content: renderFormattedText(translations.hintDetachContent),
                                placement: 'bottom' as Placement,
                                disableBeacon: true,
                                data: { isTutorial: false, storageKey: storageKey, translations }
                            },
                            {
                                target: '[data-tour="header-accept-pos"]',
                                content: renderFormattedText(translations.hintAcceptPosition),
                                placement: 'bottom' as Placement,
                                spotlightClicks: true,
                                disableBeacon: true,
                                data: { isTutorial: false, storageKey: storageKey, translations }
                            }
                         ]);
                         setStepIndex(0);
                         setRun(true);
                     }, 1200);
                     return () => clearTimeout(timer);
                }
            }
            // Hint 7: Kerned Glyph Intro
            if (selectedCharacter && !selectedCharacter.link && selectedCharacter.kern && selectedCharacter.kern.length > 0) {
                 const storageKey = 'hint_kerned_seen';
                 if (!localStorage.getItem(storageKey)) {
                     const timer = setTimeout(() => {
                         setSteps([
                            {
                                target: '[data-tour="kerning-canvas"]',
                                content: (
                                    <div>
                                        <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintKernedTitle}</h3>
                                        <p>{renderFormattedText(translations.hintKernedContent)}</p>
                                    </div>
                                ),
                                placement: 'top' as Placement,
                                disableBeacon: true,
                                spotlightClicks: true,
                                data: { isTutorial: false, storageKey: storageKey, translations }
                            },
                            {
                                target: '[data-tour="header-detach-kern"]',
                                content: renderFormattedText(translations.hintDetachContent),
                                placement: 'bottom' as Placement,
                                disableBeacon: true,
                                data: { isTutorial: false, storageKey: storageKey, translations }
                            },
                            {
                                target: '[data-tour="header-accept-kern"]',
                                content: renderFormattedText(translations.hintAcceptKerning),
                                placement: 'bottom' as Placement,
                                spotlightClicks: true,
                                disableBeacon: true,
                                data: { isTutorial: false, storageKey: storageKey, translations }
                            }
                         ]);
                         setStepIndex(0);
                         setRun(true);
                     }, 1200);
                     return () => clearTimeout(timer);
                 }
            }

            // Hint: Mobile Back
            if (!isLargeScreen && selectedCharacter && drawnCount === 1) {
                const storageKey = 'hint_mobile_back_seen';
                if (!localStorage.getItem(storageKey)) {
                    const timer = setTimeout(() => {
                        setSteps([{
                            target: '[data-tour="floating-grid-btn"]',
                            content: (
                                <div>
                                    <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintTestTitle}</h3>
                                    <p>{renderFormattedText(translations.hintMobileMenuContent)}</p>
                                </div>
                            ),
                            placement: 'right',
                            disableBeacon: true,
                            spotlightClicks: true,
                            hideFooter: true,
                            data: { isTutorial: false, storageKey: storageKey, translations }
                        }]);
                        setStepIndex(0);
                        setRun(true);
                    }, 1000);
                    return () => clearTimeout(timer);
                }
            }
            
            // Hint: Mobile Drawer Test
            if (!isLargeScreen && isNavDrawerOpen && drawnCount > 0) {
                const storageKey = 'hint_drawer_test_seen';
                if (!localStorage.getItem(storageKey)) {
                    const timer = setTimeout(() => {
                        setSteps([{
                            target: '[data-tour="drawer-test-btn"]',
                            content: (
                                <div>
                                    <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintTestTitle}</h3>
                                    <p>{renderFormattedText(translations.hintDrawerTestContent)}</p>
                                </div>
                            ),
                            placement: 'bottom',
                            disableBeacon: true,
                            spotlightClicks: true,
                            data: { isTutorial: false, storageKey: storageKey, translations }
                        }]);
                        setStepIndex(0);
                        setRun(true);
                    }, 500); // Shorter delay since drawer animation is fast
                    return () => clearTimeout(timer);
                }
            }
        }
        
        // Hint 8: Kerning Workspace Intro
        if (workspace === 'kerning') {
            const storageKey = 'tutorial_kerning_tour_completed';
            if (!localStorage.getItem(storageKey)) {
                const timer = setTimeout(() => {
                    setSteps([
                        {
                            target: '[data-tour="nav-kerning"]',
                            content: (
                                <div>
                                    <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintWhatIsKerningTitle}</h3>
                                    <p>{renderFormattedText(translations.hintWhatIsKerningContent)}</p>
                                </div>
                            ),
                            placement: 'bottom' as Placement,
                            disableBeacon: true,
                            data: { isTutorial: false, storageKey: storageKey, translations }
                        },
                        {
                            target: '[data-tour="spacing-defaults"]',
                            content: <div>{renderFormattedText(translations.spacingStripTour)}</div>,
                            placement: 'bottom' as Placement,
                            data: { isTutorial: false, storageKey: storageKey, translations }
                        },
                        {
                            target: '[data-tour="kerning-tabs"]',
                            content: (
                                <div>
                                    <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintKerningViewsTitle}</h3>
                                    <p>{renderFormattedText(translations.hintKerningViewsContent)}</p>
                                </div>
                            ),
                            placement: 'bottom' as Placement,
                            data: { isTutorial: false, storageKey: storageKey, translations }
                        },
                        {
                            target: '[data-tour="auto-kern-btn"]',
                            content: (
                                <div>
                                    <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintKerningToolsTitle}</h3>
                                    <p>{renderFormattedText(translations.hintKerningToolsContent)}</p>
                                </div>
                            ),
                            placement: 'bottom' as Placement,
                            data: { isTutorial: false, storageKey: storageKey, translations }
                        }
                    ]);
                    setStepIndex(0);
                    setRun(true);
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
        
    }, [isTutorialActive, workspace, currentView, selectedCharacter, activeModal, translations, run, drawnCount, isLargeScreen, isMetricsSelectionMode, isNavDrawerOpen, drewSinceOpen, gapTick]);

    // Combined Polling Effect for Positioning & Kerning JIT Hints
    useEffect(() => {
        if (activeModal || run || !translations || isTutorialActive || isBusy) return;

        const checkHints = setInterval(() => {
            if (dialogOpen()) return;
            if (workspace === 'positioning') {
                if (!localStorage.getItem('hint_pos_intro_seen')) {
                    const toggle = document.querySelector('[data-tour="positioning-view-toggle"]');
                    if (toggle) {
                        clearInterval(checkHints);
                        setSteps([{
                            target: '[data-tour="positioning-view-toggle"]',
                            content: (
                                <div>
                                    <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintPosIntroTitle}</h3>
                                    <p>{renderFormattedText(translations.hintPosIntroContent)}</p>
                                </div>
                            ),
                            placement: 'bottom',
                            disableBeacon: true,
                            data: { isTutorial: false, storageKey: 'hint_pos_intro_seen', translations }
                        }]);
                        setStepIndex(0);
                        setRun(true);
                        return;
                    }
                }
                if (!localStorage.getItem('hint_pos_rules_seen')) {
                    const ruleBlock = document.querySelector('[data-tour^="start-positioning-rule-"]');
                    if (ruleBlock) {
                        clearInterval(checkHints);
                        setSteps([{
                            target: ruleBlock as HTMLElement,
                            content: (
                                <div>
                                    <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintPosRulesTitle}</h3>
                                    <p>{renderFormattedText(translations.hintPosRulesContent)}</p>
                                </div>
                            ),
                            placement: isLargeScreen ? 'right' : 'bottom',
                            disableBeacon: true,
                            data: { isTutorial: false, storageKey: 'hint_pos_rules_seen', translations }
                        }]);
                        setStepIndex(0);
                        setRun(true);
                        return;
                    }
                }
                if (!localStorage.getItem('hint_pos_grid_seen')) {
                    const acceptBtn = document.querySelector('[data-tour^="accept-pos-"]');
                    const comboCard = document.querySelector('[data-tour^="combo-card-"]');
                    if (acceptBtn && comboCard) {
                        clearInterval(checkHints);
                        setSteps([{
                            target: acceptBtn as HTMLElement,
                            content: (
                                <div>
                                    <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintPosGridTitle}</h3>
                                    <p>{renderFormattedText(translations.hintPosGridContent)}</p>
                                </div>
                            ),
                            placement: 'left', 
                            disableBeacon: true,
                            spotlightClicks: true,
                            data: { isTutorial: false, storageKey: 'hint_pos_grid_seen', translations }
                        }]);
                        setStepIndex(0);
                        setRun(true);
                        return;
                    }
                }
            } else if (workspace === 'kerning') {
                if (!localStorage.getItem('hint_kerning_accept_seen')) {
                    // After automatic spacing: it's applied already, Undo is there (row 27).
                    const btn = document.querySelector('[data-tour="undo-auto-space-btn"]');
                    if (btn) {
                        clearInterval(checkHints);
                        setSteps([{
                            target: btn as HTMLElement,
                            content: (
                                <div>
                                    <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintKerningAcceptTitle}</h3>
                                    <p>{renderFormattedText(translations.hintKerningAcceptContent)}</p>
                                </div>
                            ),
                            placement: 'bottom',
                            disableBeacon: true,
                            spotlightClicks: true,
                            data: { isTutorial: false, storageKey: 'hint_kerning_accept_seen', translations }
                        }]);
                        setStepIndex(0);
                        setRun(true);
                        return;
                    }
                }
            }
        }, 1000); 
        return () => clearInterval(checkHints);
    }, [workspace, activeModal, run, translations, isLargeScreen, isTutorialActive, isBusy]);

    useEffect(() => {
        if (activeModal || run || !translations || isBusy) return;
        if (!localStorage.getItem('hint_related_pairs_seen')) {
            const checkStrip = setInterval(() => {
                if (dialogOpen()) return;
                const strip = document.querySelector('[data-tour="related-pairs-strip"]');
                if (strip) {
                    clearInterval(checkStrip);
                    setSteps([
                        {
                            target: '[data-tour="related-pairs-strip"]',
                            content: (
                                <div>
                                    <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintRelatedPairsTitle}</h3>
                                    <p>{renderFormattedText(translations.hintRelatedPairsContent)}</p>
                                </div>
                            ),
                            placement: 'top',
                            disableBeacon: true,
                            spotlightClicks: true,
                            data: { isTutorial: false, storageKey: 'hint_related_pairs_seen', translations }
                        },
                        {
                            target: '[data-tour="strip-link-toggle"]',
                            content: (
                                <div>
                                    <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">{translations.hintOverrideTitle}</h3>
                                    <p>{renderFormattedText(translations.hintOverrideContent)}</p>
                                </div>
                            ),
                            placement: 'top',
                            disableBeacon: true,
                            data: { isTutorial: false, storageKey: 'hint_related_pairs_seen', translations }
                        }
                    ]);
                    setStepIndex(0);
                    setRun(true);
                }
            }, 1000);
            return () => clearInterval(checkStrip);
        }
    }, [activeModal, run, translations, isLargeScreen, isBusy]);

    // Cleanup Logic
    useEffect(() => {
        if (run && steps.length > 0 && !steps[0].data?.isTutorial) {
             const currentStepTarget = typeof steps[0].target === 'string' ? steps[0].target : '';
             if (steps[0].data?.storageKey === 'hint_grid_select_seen' && selectedCharacter) {
                 setRun(false);
                 setSteps([]);
             }
             if (currentStepTarget === '[data-tour="drawing-canvas"]' && !selectedCharacter) {
                 setRun(false);
                 setSteps([]);
             }
             if (currentStepTarget === '[data-tour="nav-kerning"]' && workspace !== 'kerning') {
                 setRun(false);
                 setSteps([]);
             }
             if (currentStepTarget === '[data-tour="positioning-view-toggle"]' && workspace !== 'positioning') {
                 setRun(false);
                 setSteps([]);
             }
             if (currentStepTarget === '[data-tour="floating-grid-btn"]' && isNavDrawerOpen) {
                 localStorage.setItem('hint_mobile_back_seen', 'true');
                 setRun(false);
                 setSteps([]);
             }
        }
    }, [run, steps, selectedCharacter, workspace, isNavDrawerOpen]);

    const handleCallback = useCallback((data: CallBackProps) => {
        if (isTutorialActive) return;
        const { status, type, action, index } = data;
        
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setRun(false);
            setSteps([]);
        } else if (type === EVENTS.STEP_AFTER) {
            if (action === ACTIONS.NEXT) {
                 setStepIndex(index + 1);
            }
        }
    }, [isTutorialActive]);

    return { run, steps: shownSteps, stepIndex, handleCallback };
};
