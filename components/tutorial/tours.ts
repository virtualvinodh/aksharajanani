/**
 * The tutorial's parts (row 62): a short core and tours that each cover one part of the app.
 * They all run in the practice project (the "tutorial" script). Help → Tours starts one.
 */
export type TourId = 'core' | 'tools' | 'shapes' | 'builtLetters' | 'accents' | 'spacing' | 'share';

/** In the order Help lists them; the keys are in locales/help/*.json. */
export const TOURS: { id: TourId; titleKey: string; descKey: string }[] = [
    { id: 'core', titleKey: 'tourCoreTitle', descKey: 'tourCoreDesc' },
    { id: 'tools', titleKey: 'tourToolsTitle', descKey: 'tourToolsDesc' },
    { id: 'shapes', titleKey: 'tourShapesTitle', descKey: 'tourShapesDesc' },
    { id: 'builtLetters', titleKey: 'tourBuiltTitle', descKey: 'tourBuiltDesc' },
    { id: 'accents', titleKey: 'tourAccentsTitle', descKey: 'tourAccentsDesc' },
    { id: 'spacing', titleKey: 'tourSpacingTitle', descKey: 'tourSpacingDesc' },
    { id: 'share', titleKey: 'tourShareTitle', descKey: 'tourShareDesc' },
];

export const TUTORIAL_SCRIPT_ID = 'tutorial';
/** Which tour to run when the practice project opens next (set by Help from the start page). */
export const PENDING_TOUR_KEY = 'tutorial_pending_tour';
/** Start a tour in the practice project that is already open. detail: TourId */
export const START_TOUR_EVENT = 'aksharajanani:start-tour';
/** Open the practice project from the start page (ScriptSelection listens). */
export const OPEN_TUTORIAL_EVENT = 'aksharajanani:open-tutorial';

export const isTourId = (v: unknown): v is TourId => typeof v === 'string' && TOURS.some(t => t.id === v);

/** Help's "Start" button: run now if the practice project is open, otherwise open it first. */
export const startTour = (id: TourId, practiceProjectOpen: boolean) => {
    try { localStorage.removeItem('tutorial_dismissed'); } catch { /* storage blocked */ }
    if (practiceProjectOpen) {
        window.dispatchEvent(new CustomEvent(START_TOUR_EVENT, { detail: id }));
    } else {
        try { localStorage.setItem(PENDING_TOUR_KEY, id); } catch { /* storage blocked */ }
        window.dispatchEvent(new CustomEvent(OPEN_TUTORIAL_EVENT));
    }
};

/** The tour asked for by Help, read once when the practice project opens. */
export const takePendingTour = (): TourId => {
    try {
        const v = localStorage.getItem(PENDING_TOUR_KEY);
        localStorage.removeItem(PENDING_TOUR_KEY);
        return isTourId(v) ? v : 'core';
    } catch { return 'core'; }
};
