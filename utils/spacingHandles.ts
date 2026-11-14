import { Point } from '../types';

/**
 * A letter's spacing lines run the full height of the drawing canvas. They move only by the
 * handles at their top and bottom, never from the line itself (D16): a pen stroke that starts on
 * the line (the crossbar of t, the loop of क from its stem) draws instead of moving the spacing.
 * Sizes are in screen pixels; positions come back in canvas units.
 */
export const SPACING_HANDLE = { width: 12, height: 34, margin: 6, hitPadding: 6 };

export interface HandleBand { start: number; end: number }

/** The top and bottom handle bands (canvas y), placed in the visible part of the canvas. */
export const spacingHandleBands = (zoom: number, viewOffsetY: number, canvasHeight: number): [HandleBand, HandleBand] => {
    const top = (SPACING_HANDLE.margin - viewOffsetY) / zoom;
    const bottom = (canvasHeight - SPACING_HANDLE.margin - viewOffsetY) / zoom;
    const h = SPACING_HANDLE.height / zoom;
    return [{ start: top, end: top + h }, { start: bottom - h, end: bottom }];
};

/** Is the point on one of the handles of the spacing line at lineX? */
export const isOnSpacingHandle = (point: Point, lineX: number, zoom: number, bands: [HandleBand, HandleBand]): boolean => {
    const halfWidth = (SPACING_HANDLE.width / 2 + SPACING_HANDLE.hitPadding) / zoom;
    if (Math.abs(point.x - lineX) > halfWidth) return false;
    const pad = SPACING_HANDLE.hitPadding / zoom;
    return bands.some(b => point.y >= b.start - pad && point.y <= b.end + pad);
};
