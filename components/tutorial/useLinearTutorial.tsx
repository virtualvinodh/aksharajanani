
import { useState, useEffect, useCallback, useRef } from 'react';
import { CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { useProject } from '../../contexts/ProjectContext';
import { useLayout } from '../../contexts/LayoutContext';
import { usePositioning } from '../../contexts/PositioningContext';
import { useKerning } from '../../contexts/KerningContext';
import { useTutorialSteps } from './useTutorialSteps';
import { TourId, START_TOUR_EVENT, isTourId, takePendingTour } from './tours';

/** Whether a step's target is on the page and visible (a hidden one makes the tip float loose). */
const targetVisible = (target: unknown): boolean => {
    if (target === 'body') return true;
    const el = typeof target === 'string' ? document.querySelector(target) : target instanceof Element ? target : null;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
};

export const useLinearTutorial = (
    translations: Record<string, string> | null,
    isLargeScreen: boolean
) => {
    const { script, allCharsByName } = useProject();
    const { selectedCharacter, activeModal, workspace, isNavDrawerOpen, closeCharacterModal, setWorkspace, setCurrentView } = useLayout();
    const { markPositioningMap } = usePositioning();
    const { kerningMap } = useKerning();

    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [hasUserSkipped, setHasUserSkipped] = useState(false);
    // The short core runs first; Help → Tours runs the others (row 62).
    const [activeTour, setActiveTour] = useState<TourId>('core');
    // A new number for every tour start: Joyride stays "finished" when handed the same steps again,
    // so the manager gives it a fresh start (key) each time.
    const [session, setSession] = useState(0);
    const chapters = useTutorialSteps(translations, isLargeScreen);
    const steps = chapters[activeTour];

    const isActive = script?.id === 'tutorial';

    // A tour started from Help while the practice project is open: start from the letters grid.
    useEffect(() => {
        if (!isActive) return;
        const onStart = (e: Event) => {
            const id = (e as CustomEvent).detail;
            if (!isTourId(id)) return;
            closeCharacterModal();
            setWorkspace('drawing');
            setCurrentView('grid');
            setActiveTour(id);
            setSession(n => n + 1);
            setStepIndex(0);
            setHasUserSkipped(false);
            setRun(false);
            setTimeout(() => setRun(true), 600);
        };
        window.addEventListener(START_TOUR_EVENT, onStart);
        return () => window.removeEventListener(START_TOUR_EVENT, onStart);
    }, [isActive, closeCharacterModal, setWorkspace, setCurrentView]);

    // Resume Listener for View Transitions
    useEffect(() => {
        const handleViewLoaded = () => {
             if (isActive && !hasUserSkipped) {
                 setRun(true);
             }
        };
        window.addEventListener('aksharajanani:view-loaded', handleViewLoaded);
        return () => window.removeEventListener('aksharajanani:view-loaded', handleViewLoaded);
    }, [isActive, hasUserSkipped]);

    // Resume Listener for Dashboard Return
    useEffect(() => {
        const isDismissed = localStorage.getItem('tutorial_dismissed') === 'true';
        if (isActive && !run && !activeModal && !selectedCharacter && steps.length > 0 && !isDismissed && !hasUserSkipped) {
            const currentStep = steps[stepIndex];
            if (currentStep?.target && typeof currentStep.target === 'string') {
                 const targetEl = document.querySelector(currentStep.target);
                 if (targetEl) {
                     const timer = setTimeout(() => setRun(true), 500);
                     return () => clearTimeout(timer);
                 }
            }
        }
    }, [activeModal, selectedCharacter, run, isActive, stepIndex, steps, hasUserSkipped]);

    // Initialize / Reset
    useEffect(() => {
        if (isActive) {
            // Help may have asked for a particular tour before opening the practice project.
            setActiveTour(takePendingTour());
            setStepIndex(0);
            const isDismissed = localStorage.getItem('tutorial_dismissed') === 'true';
            if (!isDismissed && !hasUserSkipped) {
                setRun(true);
            }
        } else {
             setRun(false);
             setStepIndex(0);
             setHasUserSkipped(false);
             setActiveTour('core');
        }
    }, [isActive]);

    // State Machine
    useEffect(() => {
        if (!run || !isActive || steps.length === 0) return;

        const currentStep = steps[stepIndex];
        if (!currentStep) return;

        // Proactive Click Interception
        const isTransitionToEditor = currentStep.target === '[data-tour="combo-card-Eͤ"]';
        const isTransitionToKerning = currentStep.target === '[data-tour="pair-card-Te"]';
        const isTransitionBack = currentStep.target === '[data-tour="header-back"]';
        
        if (isTransitionToEditor || isTransitionToKerning || isTransitionBack) {
             const selector = currentStep.target as string;
             const handleProactiveClick = (e: MouseEvent) => {
                 const target = e.target as HTMLElement;
                 if (target.closest(selector)) {
                     setRun(false);
                     setStepIndex(prev => prev + 1);
                 }
             };
             document.addEventListener('click', handleProactiveClick, true);
             return () => {
                 document.removeEventListener('click', handleProactiveClick, true);
             };
        }

        // Passive Polling
        if (currentStep.target === '[data-tour="start-positioning-rule-A-ͤ"]') {
             const interval = setInterval(() => {
                 if (document.querySelector('[data-tour="combo-card-Aͤ"]')) {
                     clearInterval(interval);
                     setStepIndex(prev => prev + 1);
                 }
             }, 300);
             return () => clearInterval(interval);
        }

        const advanceRule = currentStep.data?.advanceOn;
        if (!advanceRule) return;

        const advance = () => setTimeout(() => setStepIndex(prev => prev + 1), 500);

        switch (advanceRule) {
            case 'selected-A': if (selectedCharacter?.name === 'A') advance(); break;
            case 'selected-a': if (selectedCharacter?.name === 'a') advance(); break;
            case 'selected-T': if (selectedCharacter?.name === 'T') advance(); break;
            case 'selected-F': if (selectedCharacter?.name === 'F') advance(); break;
            case 'selected-E': if (selectedCharacter?.name === 'E') advance(); break;
            case 'selected-e': if (selectedCharacter?.name === 'e') advance(); break;
            case 'selected-combining': if (selectedCharacter?.name === 'ͤ') advance(); break;
            case 'unlinked-combining': if (selectedCharacter?.name === 'ͤ' && !selectedCharacter.link) advance(); break;
            case 'relinked-combining': if (selectedCharacter?.name === 'ͤ' && selectedCharacter.link) advance(); break;
            case 'selected-n': if (selectedCharacter?.name === 'n') advance(); break;
            case 'selected-tilde': if (selectedCharacter?.name === '̃') advance(); break;
            case 'selected-macron': if (selectedCharacter?.name === '̄') advance(); break;
            case 'selected-ntilde': if (selectedCharacter?.name === 'ñ') advance(); break;
            case 'selected-nbar': if (selectedCharacter?.name === 'n̄') advance(); break;
            case 'unlinked-nbar': {
                const linkButton = document.querySelector('[data-tour="strip-link-toggle"]');
                if (linkButton && linkButton.getAttribute('title')?.startsWith('Exception')) {
                    advance();
                }
                break;
            }
            case 'back-to-dashboard': if (!activeModal && !selectedCharacter) advance(); break;
            case 'test-modal-open': if (activeModal?.name === 'testPage') advance(); break;
            case 'test-modal-close': if (activeModal === null) advance(); break;
            case 'drawer-open': if (isNavDrawerOpen) advance(); break;
            case 'workspace-positioning': if (workspace === 'positioning') advance(); break;
            case 'workspace-kerning': if (workspace === 'kerning') advance(); break;
            case 'accepted-A-combining': {
                const A = allCharsByName.get('A');
                const combining = allCharsByName.get('ͤ');
                if (A?.unicode && combining?.unicode && markPositioningMap.has(`${A.unicode}-${combining.unicode}`)) {
                    advance();
                }
                break;
            }
            case 'kerned-Te-action': {
                const T = allCharsByName.get('T');
                const e = allCharsByName.get('e');
                if (T?.unicode && e?.unicode && kerningMap.has(`${T.unicode}-${e.unicode}`)) {
                     advance();
                }
                break;
            }
            case 'kerning-editor-closed': {
                if (!document.querySelector('[data-tour="kerning-editor-page"]')) {
                    advance();
                }
                break;
            }
        }
    }, [stepIndex, selectedCharacter, activeModal, run, isActive, steps, isNavDrawerOpen, workspace, allCharsByName, markPositioningMap, kerningMap]);

    // A step whose target isn't on screen yet (the Test page still building the font, a screen
    // still opening): wait for it and show the step then; skip it if it never comes.
    const [waitingFor, setWaitingFor] = useState<number | null>(null);
    const stepsRef = useRef(steps);
    stepsRef.current = steps;
    useEffect(() => {
        if (waitingFor === null || !isActive) return;
        const started = Date.now();
        const timer = setInterval(() => {
            const step = stepsRef.current[waitingFor];
            if (!step) { clearInterval(timer); setWaitingFor(null); return; }
            if (targetVisible(step.target)) {
                clearInterval(timer); setWaitingFor(null);
                setRun(false); setTimeout(() => setRun(true), 50);
            } else if (Date.now() - started > 20000) {
                clearInterval(timer); setWaitingFor(null);
                setStepIndex(waitingFor + 1);
                setRun(false); setTimeout(() => setRun(true), 50);
            }
        }, 400);
        return () => clearInterval(timer);
    }, [waitingFor, isActive]);

    const handleCallback = useCallback((data: CallBackProps) => {
        if (!isActive) return;
        const { status, type, action, index } = data;
        
        if (type === EVENTS.TARGET_NOT_FOUND) {
             const stepTarget = steps[index]?.target;
             if (stepTarget === '[data-tour="start-positioning-rule-A-ͤ"]') return; 
             if (stepTarget === '[data-tour="positioning-editor-page"]' || stepTarget === '[data-tour="kerning-canvas"]') {
                 setRun(false);
                 return;
             }
             if (stepTarget === '[data-tour="header-back"]') {
                 if (!activeModal && !selectedCharacter) {
                     setStepIndex(prev => prev + 1);
                     setTimeout(() => setRun(true), 100);
                 }
                 return;
             }
             setWaitingFor(index);
             return;
        }
        
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            // Done or exited: don't start over by itself (finishing used to restart the tutorial
            // as soon as the grid showed again). Help → Tours starts any part again.
            setHasUserSkipped(true);
            try { localStorage.setItem('tutorial_dismissed', 'true'); } catch { /* storage blocked */ }
            setRun(false);
            setStepIndex(0);
        } else if (type === EVENTS.STEP_AFTER) {
            const currentStep = steps[index];
            if (!currentStep) return;
            if (!currentStep.data?.advanceOn) {
                if (action === ACTIONS.NEXT) setStepIndex(index + 1);
            }
            if (action === ACTIONS.PREV) setStepIndex(index - 1);
        }
    }, [isActive, steps, activeModal, selectedCharacter]);

    return { run, stepIndex, steps, handleCallback, activeTour, session };
};
