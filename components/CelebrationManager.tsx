
import React, { useEffect, useRef, useState } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { useProgressCalculators } from '../hooks/useProgressCalculators';
import { useProject } from '../contexts/ProjectContext';
import { useGlyphData } from '../contexts/GlyphDataContext';
import { useKerning } from '../contexts/KerningContext';
import { usePositioning } from '../contexts/PositioningContext';
import { useRules } from '../contexts/RulesContext';
import { useLayout } from '../contexts/LayoutContext';
import CelebrationOverlay from './CelebrationOverlay';
import PositioningCelebrationOverlay from './PositioningCelebrationOverlay';
import KerningCelebrationOverlay from './KerningCelebrationOverlay';

const CelebrationManager: React.FC = () => {
    const { script, characterSets, allCharsByName, positioningRules, recommendedKerning, allCharsByUnicode } = useProject();
    const { glyphDataMap, version: glyphVersion } = useGlyphData();
    const { kerningMap } = useKerning();
    const { markPositioningMap } = usePositioning();
    const { state: rulesState } = useRules();
    const { setWorkspace, showNotification } = useLayout();
    const { t } = useLocale();

    // Use specific states to track which overlay to show
    // 'drawing' | 'positioning' | 'kerning'
    const [activeOverlay, setActiveOverlay] = useState<string | null>(null);

    const { drawingProgress, positioningProgress, kerningProgress } = useProgressCalculators({
        characterSets,
        glyphDataMap,
        markPositioningMap,
        recommendedKerning,
        allCharsByName,
        fontRules: rulesState.fontRules,
        kerningMap,
        positioningRules,
        glyphVersion
    });

    const isDrawingComplete = drawingProgress.total > 0 && drawingProgress.completed === drawingProgress.total;
    const isPositioningComplete = positioningProgress.total > 0 && positioningProgress.completed === positioningProgress.total;
    // For kerning, explicitly check if there is a 'total' to avoid 0/0=True false positives
    const isKerningComplete = kerningProgress.total > 0 && kerningProgress.completed === kerningProgress.total;

    // Check script requirements
    const requiresPositioning = positioningRules && positioningRules.length > 0;
    const requiresKerning = recommendedKerning && recommendedKerning.length > 0;

    // Scenario Classification
    const isSimple = !requiresPositioning;
    const isComplex = !!requiresPositioning && !requiresKerning;

    // Celebrate a step only when it goes from unfinished to finished while someone works on this
    // project (F6). This component mounts when a project has loaded, so what is already finished
    // then (a project opened again) stays quiet. Each step celebrates at most once per opening.
    const complete = { drawing: isDrawingComplete, positioning: isPositioningComplete, kerning: isKerningComplete };
    const completeRef = useRef(complete);
    completeRef.current = complete;
    const finishedAtOpen = useRef<typeof complete | null>(null);
    const celebrated = useRef(new Set<keyof typeof complete>());
    useEffect(() => {
        const timer = window.setTimeout(() => { finishedAtOpen.current = { ...completeRef.current }; }, 1000);
        return () => window.clearTimeout(timer);
    }, []);
    const justFinished = (step: keyof typeof complete) =>
        finishedAtOpen.current !== null && !finishedAtOpen.current[step] && complete[step] && !celebrated.current.has(step);
    const celebrate = (step: keyof typeof complete) => {
        celebrated.current.add(step);
        setActiveOverlay(step);
    };

    // Work lives in this browser (UX §9): once someone has drawn 10 letters in this sitting, ask
    // the browser to keep the app's storage (Safari clears it after a week away) and remind them
    // to download a backup. Firefox asks the person about storage, so this waits until they've
    // clearly invested in the font.
    const BACKUP_REMINDER_AT = 10;
    const drawnAtOpen = useRef<number | null>(null);
    const remindedBackup = useRef(false);
    useEffect(() => {
        const timer = window.setTimeout(() => { drawnAtOpen.current = drawingProgress.completed; }, 1000);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the count when the project opened
    }, []);
    useEffect(() => {
        if (remindedBackup.current || drawnAtOpen.current === null || script?.isImportedFont) return;
        if (drawnAtOpen.current < BACKUP_REMINDER_AT && drawingProgress.completed >= BACKUP_REMINDER_AT) {
            remindedBackup.current = true;
            navigator.storage?.persist?.().catch(() => { /* not supported */ });
            showNotification(t('backupReminder'), 'info', { duration: 10000 });
        }
    }, [drawingProgress.completed, script?.isImportedFont, showNotification, t]);

    useEffect(() => {
        // Trigger 1: Drawing Complete
        if (script?.isImportedFont) return;
        if (justFinished('drawing')) celebrate('drawing');
        // eslint-disable-next-line react-hooks/exhaustive-deps -- fires on the change to complete
    }, [isDrawingComplete]);

    useEffect(() => {
        // Trigger 2: Positioning Complete (after drawing, so it doesn't interrupt it)
        if (script?.isImportedFont) return;
        if (requiresPositioning && isDrawingComplete && justFinished('positioning')) celebrate('positioning');
        // eslint-disable-next-line react-hooks/exhaustive-deps -- fires on the change to complete
    }, [isPositioningComplete, isDrawingComplete, requiresPositioning]);

    useEffect(() => {
        // Trigger 3: Kerning Complete
        if (script?.isImportedFont) return;
        if (requiresKerning && isDrawingComplete && justFinished('kerning')) celebrate('kerning');
        // eslint-disable-next-line react-hooks/exhaustive-deps -- fires on the change to complete
    }, [isKerningComplete, isDrawingComplete, requiresKerning]);

    const handleClose = () => {
        setActiveOverlay(null);
    };

    const handleProceed = (next: string) => {
        setActiveOverlay(null);
        if (next === 'positioning') {
            setWorkspace('positioning');
        } else if (next === 'kerning') {
            setWorkspace('kerning');
        }
    };

    // --- RENDERERS ---

    if (activeOverlay === 'drawing') {
        if (isSimple) {
            // Scenario A: Drawing -> Final
            return (
                <CelebrationOverlay
                    glyphDataMap={glyphDataMap}
                    nextStep="final"
                    customTitle={t('celebrateFontReadyTitle')}
                    customMessage={t('celebrateFontReadyMessage')}
                    primaryActionLabel={t('celebrateDone')}
                    secondaryActionLabel={t('celebrateFineTuneSpacing')}
                    onProceed={() => handleProceed('final')}
                    onClose={() => handleProceed('kerning')}
                />
            );
        } else {
            // Scenario B & C: Drawing -> Positioning
            return (
                <CelebrationOverlay
                    glyphDataMap={glyphDataMap}
                    nextStep="positioning"
                    customTitle={t('celebrateDrawingTitle')}
                    customMessage={t('celebrateDrawingMessage')}
                    primaryActionLabel={t('celebrateGoToPositioning')}
                    secondaryActionLabel={t('celebrateStayHere')}
                    onProceed={() => handleProceed('positioning')}
                    onClose={handleClose}
                />
            );
        }
    }

    if (activeOverlay === 'positioning') {
        if (isComplex) {
            // Scenario B: Positioning -> Final (Kerning optional but suggested)
            return (
                <PositioningCelebrationOverlay
                    glyphDataMap={glyphDataMap}
                    markPositioningMap={markPositioningMap}
                    isFinalMilestone={true}
                    onProceed={() => handleProceed('final')}
                    onClose={() => handleProceed('kerning')}
                />
            );
        } else {
             // Scenario C: Positioning -> Kerning
             return (
                <PositioningCelebrationOverlay
                    glyphDataMap={glyphDataMap}
                    markPositioningMap={markPositioningMap}
                    isFinalMilestone={false}
                    onProceed={() => handleProceed('kerning')}
                    onClose={handleClose}
                />
            );
        }
    }
    
    if (activeOverlay === 'kerning') {
        // Scenario C: Kerning -> Final
        return (
            <KerningCelebrationOverlay
                glyphDataMap={glyphDataMap}
                kerningMap={kerningMap}
                allCharsByUnicode={allCharsByUnicode}
                onProceed={() => handleProceed('final')}
                onClose={handleClose}
            />
        );
    }
    
    return null;
};

export default CelebrationManager;
