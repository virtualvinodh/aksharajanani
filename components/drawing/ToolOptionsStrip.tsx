import React from 'react';
import { Tool } from '../../types';
import { useLocale } from '../../contexts/LocaleContext';
import { ERASER_SIZES, EraserSize, setEraserSize, useEraserSize } from '../../utils/eraserSize';

const SIZE_LABEL: Record<EraserSize, string> = { 0.35: 'eraserSizeSmall', 1: 'eraserSizePen', 2.5: 'eraserSizeLarge' };
const DOT_PX: Record<EraserSize, number> = { 0.35: 6, 1: 12, 2.5: 20 };

/**
 * A line under the canvas for the chosen tool: how to use the Curve tool (F38: it needs a
 * gesture nobody explains), and the eraser's size (F40: it was always as wide as the pen).
 */
const ToolOptionsStrip: React.FC<{ tool: Tool }> = ({ tool }) => {
    const { t } = useLocale();
    const size = useEraserSize();

    if (tool === 'curve') {
        return (
            <div role="status" data-testid="curve-hint" className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 w-max max-w-[92%] rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-900/40 dark:border-indigo-700 px-3 py-1.5 text-xs sm:text-sm text-indigo-900 dark:text-indigo-100 shadow-sm pointer-events-none text-center">
                {t('curveToolHint')}
            </div>
        );
    }

    if (tool === 'eraser') {
        return (
            <div role="group" aria-label={t('eraserSize')} data-testid="eraser-size" className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 px-2 py-1 shadow-md">
                <span className="text-xs text-gray-600 dark:text-gray-300 px-1 whitespace-nowrap">{t('eraserSize')}</span>
                {ERASER_SIZES.map(s => (
                    <button key={s} type="button" onClick={() => setEraserSize(s)} aria-pressed={size === s}
                        title={t(SIZE_LABEL[s])} aria-label={t(SIZE_LABEL[s])}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${size === s ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        <span className="rounded-full bg-current" style={{ width: DOT_PX[s], height: DOT_PX[s] }} />
                    </button>
                ))}
            </div>
        );
    }

    return null;
};

export default React.memo(ToolOptionsStrip);
