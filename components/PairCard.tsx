
import React, { useRef, useEffect } from 'react';
import { Character, GlyphData, FontMetrics } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useLocale } from '../contexts/LocaleContext';
import { renderPaths, getAccurateGlyphBBox } from '../services/glyphRenderService';
import { KERNING_CARD_CANVAS_SIZE, DRAWING_CANVAS_SIZE } from '../constants';

interface PairCardProps { 
    pair: { left: Character, right: Character }; 
    onClick: () => void;
    isRecommended: boolean;
    showRecommendedLabel: boolean;
    kerningValue: number | undefined;
    isSuggested?: boolean;
    glyphDataMap: Map<number, GlyphData>;
    strokeThickness: number;
    metrics: FontMetrics;
    glyphVersion: number;
    /** Removes this pair's fix (the pair goes back to the overall spacing). */
    onBackToUsual?: () => void;
}

/** A pair fix in words: "12 closer", "8 further apart", "as usual" (MASTER_LIST 27 redesign, idea 3). */
export const pairFixWords = (t: (k: string, o?: Record<string, string | number>) => string, value: number): string =>
    value < 0 ? t('pairFixCloser', { count: -value }) : value > 0 ? t('pairFixFurther', { count: value }) : t('pairFixAsUsual');

const PairCard: React.FC<PairCardProps> = ({ pair, onClick, isRecommended, showRecommendedLabel, kerningValue, isSuggested, glyphDataMap, strokeThickness, metrics, glyphVersion, onBackToUsual }) => {
    const { theme } = useTheme();
    const { t } = useLocale();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, KERNING_CARD_CANVAS_SIZE, KERNING_CARD_CANVAS_SIZE);

        const leftGlyph = glyphDataMap.get(pair.left.unicode!);
        const rightGlyph = glyphDataMap.get(pair.right.unicode!);
        if (!leftGlyph || !rightGlyph) return;

        const leftBox = getAccurateGlyphBBox(leftGlyph.paths, strokeThickness);
        const rightBox = getAccurateGlyphBBox(rightGlyph.paths, strokeThickness);
        if (!leftBox || !rightBox) return;

        const leftMaxX = leftBox.x + leftBox.width;
        const rightMinX = rightBox.x;

        const kernVal = kerningValue ?? 0;
        const rsbL = pair.left.rsb ?? metrics.defaultRSB;
        const lsbR = pair.right.lsb ?? metrics.defaultLSB;
        
        const totalContentWidth = (leftMaxX - leftBox.x) + rsbL + kernVal + lsbR + (rightBox.width);
        if (totalContentWidth <= 0) return;
    
        const scaleFactor = Math.min(
            (KERNING_CARD_CANVAS_SIZE * 0.9) / totalContentWidth,
            (KERNING_CARD_CANVAS_SIZE * 0.9) / DRAWING_CANVAS_SIZE
        );

        const finalWidth = totalContentWidth * scaleFactor;
        const offsetX = (KERNING_CARD_CANVAS_SIZE - finalWidth) / 2 - (leftBox.x * scaleFactor);
        const finalHeight = DRAWING_CANVAS_SIZE * scaleFactor;
        const offsetY = (KERNING_CARD_CANVAS_SIZE - finalHeight) / 2;
    
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scaleFactor, scaleFactor);
        
        // Draw guides
        ctx.strokeStyle = theme === 'dark' ? 'rgba(74, 85, 104, 0.5)' : 'rgba(209, 213, 219, 0.7)';
        ctx.lineWidth = 1 / scaleFactor;
        ctx.setLineDash([2 / scaleFactor, 2 / scaleFactor]);
        const guideWidth = totalContentWidth + leftBox.x + rightBox.x; 
        ctx.beginPath(); ctx.moveTo(0, metrics.topLineY); ctx.lineTo(guideWidth, metrics.topLineY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, metrics.baseLineY); ctx.lineTo(guideWidth, metrics.baseLineY); ctx.stroke();
        ctx.setLineDash([]);
        
        const glyphColor = theme === 'dark' ? '#E5E5E5' : '#262626';
        
        // Draw left glyph
        ctx.save();
        renderPaths(ctx, leftGlyph.paths, { strokeThickness, color: glyphColor });
        ctx.restore();
        
        // Draw right glyph
        const rightStartTranslateX = leftMaxX + rsbL + kernVal + lsbR - rightMinX;
        ctx.save();
        ctx.translate(rightStartTranslateX, 0);
        renderPaths(ctx, rightGlyph.paths, { strokeThickness, color: glyphColor });
        ctx.restore();
        
        ctx.restore();

    }, [pair, kerningValue, glyphDataMap, strokeThickness, theme, metrics, glyphVersion]);

    const hasKerning = kerningValue !== undefined;
    const isFix = hasKerning && kerningValue !== 0;

    const cardClasses = `relative border-2 rounded-lg p-2 flex items-center justify-center cursor-pointer transition-all duration-200 aspect-square focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
        ${isSuggested
            // Spaced automatically: in the font (solid, like a drawn letter), lighter than set by hand.
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 hover:border-blue-600'
            : hasKerning 
                ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-400 dark:border-indigo-600' 
                : 'bg-white dark:bg-gray-800 border-dashed border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:border-indigo-500'}`;

    const words = hasKerning ? pairFixWords(t, kerningValue!) : '';
    // Beginners read words; the exact number (drawing units) is on hover and in the pair editor.
    const title = hasKerning
        ? `${pair.left.name} ${pair.right.name} · ${words} (${kerningValue! > 0 ? '+' : ''}${kerningValue}) · ${isSuggested ? t('filterSpacedAutomatically') : t('pairFixByHand')}`
        : `${pair.left.name} ${pair.right.name}`;

    return (
        <div onClick={onClick} onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
            role="button" tabIndex={0} aria-label={title} title={title}
            className={cardClasses} data-tour={`pair-card-${pair.left.name}${pair.right.name}`}>
            <canvas ref={canvasRef} width={KERNING_CARD_CANVAS_SIZE} height={KERNING_CARD_CANVAS_SIZE}></canvas>
            
            {isRecommended && !hasKerning && !isSuggested && showRecommendedLabel && (
                <span className="absolute top-1 right-1 text-xs bg-yellow-400 dark:bg-yellow-600 text-yellow-900 dark:text-yellow-100 font-semibold px-2 py-0.5 rounded-full">{t('recommended')}</span>
            )}
            
            {hasKerning && (
                <span data-testid="pair-fix" className={`absolute bottom-1 left-1 right-1 text-center truncate text-[11px] leading-tight font-semibold px-1 py-0.5 rounded-full ${isFix ? (isSuggested ? 'bg-blue-500 text-white' : 'bg-indigo-500 text-white') : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>{words}</span>
            )}

            {isFix && onBackToUsual && (
                <button type="button" onClick={e => { e.stopPropagation(); onBackToUsual(); }}
                    title={t('pairFixBackToUsual')} aria-label={`${t('pairFixBackToUsual')}: ${pair.left.name} ${pair.right.name}`}
                    className="absolute top-0.5 right-0.5 w-7 h-7 flex items-center justify-center rounded-full text-sm text-gray-500 hover:text-indigo-700 hover:bg-white/80 dark:text-gray-400 dark:hover:bg-gray-900/60">↺</button>
            )}
        </div>
    );
};

export default React.memo(PairCard);
