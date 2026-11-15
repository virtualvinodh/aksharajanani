import { useSyncExternalStore } from 'react';

/**
 * The eraser's size, as a multiple of the pen's thickness (F40: an eraser exactly as wide as
 * the pen can't take off small bits). A per-browser preference, not part of the project.
 */
export const ERASER_SIZES = [0.35, 1, 2.5] as const;
export type EraserSize = typeof ERASER_SIZES[number];

const KEY = 'eraserSize';
const listeners = new Set<() => void>();

const read = (): EraserSize => {
    try {
        const v = Number(localStorage.getItem(KEY));
        return (ERASER_SIZES as readonly number[]).includes(v) ? v as EraserSize : 1;
    } catch { return 1; }
};

let current: EraserSize = read();

export const getEraserSize = (): EraserSize => current;

export const setEraserSize = (size: EraserSize) => {
    current = size;
    try { localStorage.setItem(KEY, String(size)); } catch { /* storage blocked */ }
    listeners.forEach(l => l());
};

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export const useEraserSize = (): EraserSize => useSyncExternalStore(subscribe, getEraserSize, getEraserSize);

/** The eraser's radius in drawing units: never so small it can't be aimed. */
export const eraserRadius = (strokeThickness: number, size: EraserSize = current): number =>
    Math.max(3, (strokeThickness * size) / 2);
