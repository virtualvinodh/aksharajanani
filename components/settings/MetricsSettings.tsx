import React, { useRef, useEffect, useState } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { FontMetrics } from '../../types';
import { useLocale } from '../../contexts/LocaleContext';
import { useTheme } from '../../contexts/ThemeContext';
import { DRAWING_CANVAS_SIZE } from '../../constants';

const MetricsVisualizer: React.FC<{ metrics: FontMetrics }> = ({ metrics }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { theme } = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        
        // --- Colors ---
        const bgColor = theme === 'dark' ? '#262626' : '#F5F5F5';
        const guideColor = theme === 'dark' ? '#737373' : '#A3A3A3';
        const ascenderColor = theme === 'dark' ? '#60A5FA' : '#3B82F6';
        const descenderColor = theme === 'dark' ? '#F87171' : '#EF4444';
        const baselineColor = theme === 'dark' ? '#A78BFA' : '#8B5CF6';
        const sampleTextColor = theme === 'dark' ? '#FAFAFA' : '#171717';
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        // --- Calculations ---
        const fontUnitHeight = metrics.ascender - metrics.descender;
        if (fontUnitHeight <= 0) return;

        const diagramVisibleHeight = height * 0.8;
        const scale = diagramVisibleHeight / fontUnitHeight;
        const topMargin = height * 0.1;

        const getDiagramY = (fontUnitY: number) => topMargin + (metrics.ascender - fontUnitY) * scale;

        const ascenderY = getDiagramY(metrics.ascender);
        const descenderY = getDiagramY(metrics.descender);
        const baselineY = getDiagramY(0);

        const fontScaleForGuides = fontUnitHeight / DRAWING_CANVAS_SIZE;
        const baseGuideFontY = ((DRAWING_CANVAS_SIZE - metrics.baseLineY) * fontScaleForGuides) + metrics.descender;
        const topGuideFontY = ((DRAWING_CANVAS_SIZE - metrics.topLineY) * fontScaleForGuides) + metrics.descender;
        const superTopGuideFontY = metrics.superTopLineY !== undefined ? ((DRAWING_CANVAS_SIZE - metrics.superTopLineY) * fontScaleForGuides) + metrics.descender : null;
        const subBaseGuideFontY = metrics.subBaseLineY !== undefined ? ((DRAWING_CANVAS_SIZE - metrics.subBaseLineY) * fontScaleForGuides) + metrics.descender : null;
        
        const baseGuideDiagramY = getDiagramY(baseGuideFontY);
        const topGuideDiagramY = getDiagramY(topGuideFontY);
        const superTopGuideDiagramY = superTopGuideFontY !== null ? getDiagramY(superTopGuideFontY) : null;
        const subBaseGuideDiagramY = subBaseGuideFontY !== null ? getDiagramY(subBaseGuideFontY) : null;

        // --- Drawing ---
        const drawLineWithLabel = (y: number, label: string, color: string, isDashed = false, alignLeft = false) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = isDashed ? 1 : 2;
            ctx.setLineDash(isDashed ? [5, 5] : []);
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            ctx.fillStyle = color;
            ctx.font = '12px sans-serif';
            ctx.textAlign = alignLeft ? 'left' : 'right';
            const yPos = y > height - 20 ? y - 2 : y + 2;
            const textBaseline = y > height - 20 ? 'bottom' : 'top';
            ctx.textBaseline = textBaseline;
            ctx.fillText(label, alignLeft ? 10 : width - 10, yPos);
        };
        
        drawLineWithLabel(ascenderY, `Ascender (${metrics.ascender})`, ascenderColor, false, true);
        drawLineWithLabel(descenderY, `Descender (${metrics.descender})`, descenderColor, false, true);
        drawLineWithLabel(baselineY, 'Baseline (0)', baselineColor);

        drawLineWithLabel(baseGuideDiagramY, `Baseline Guide (${metrics.baseLineY})`, guideColor, true);
        drawLineWithLabel(topGuideDiagramY, `Topline Guide (${metrics.topLineY})`, guideColor, true);
        if (superTopGuideDiagramY !== null && metrics.superTopLineY !== undefined) {
            drawLineWithLabel(superTopGuideDiagramY, `Super Topline Guide (${metrics.superTopLineY})`, guideColor, true);
        }
        if (subBaseGuideDiagramY !== null && metrics.subBaseLineY !== undefined) {
            drawLineWithLabel(subBaseGuideDiagramY, `Sub Baseline Guide (${metrics.subBaseLineY})`, guideColor, true);
        }
        
        ctx.setLineDash([]);

        // --- Draw Sample Text ---
        const fontSize = Math.abs(ascenderY - baseGuideDiagramY) * 0.9;
        if (fontSize > 0) {
            ctx.font = `italic ${fontSize}px serif`;
            ctx.fillStyle = sampleTextColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText("Ag", width * 0.1, baseGuideDiagramY);
        }

    }, [metrics, theme]);

    return <canvas ref={canvasRef} width="512" height="250" className="w-full rounded-md border border-gray-300 dark:border-gray-600 mb-6"></canvas>
};

/**
 * A number box that never stores an empty or out-of-range value (F37): while typing, anything
 * goes; only a number within [min, max] is saved, and leaving the box puts back the last good one.
 */
const MetricNumberInput: React.FC<{ id: string; value: number | undefined; min: number; max: number; onCommit: (v: number) => void }> = ({ id, value, min, max, onCommit }) => {
    const [draft, setDraft] = useState(value === undefined ? '' : String(value));
    useEffect(() => { setDraft(value === undefined ? '' : String(value)); }, [value]);
    const valid = (text: string) => text.trim() !== '' && Number.isFinite(Number(text)) && Number(text) >= min && Number(text) <= max;
    return (
        <input
            type="number" id={id} min={min} max={max} value={draft}
            aria-invalid={!valid(draft)}
            onChange={e => { setDraft(e.target.value); if (valid(e.target.value)) onCommit(Number(e.target.value)); }}
            onBlur={() => { if (!valid(draft)) setDraft(value === undefined ? '' : String(value)); }}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm aria-[invalid=true]:border-red-500"
        />
    );
};

interface MetricsSettingsProps {
    metrics: FontMetrics;
    onMetricsChange: React.Dispatch<React.SetStateAction<FontMetrics>>;
}

const MetricsSettings: React.FC<MetricsSettingsProps> = ({ metrics, onMetricsChange }) => {
    const { t } = useLocale();
    const { script } = useProject();
    const setMetric = <K extends keyof FontMetrics>(key: K, value: FontMetrics[K]) => onMetricsChange(prev => ({ ...prev, [key]: value }));
    
    const handleMetricsChange = (key: keyof FontMetrics) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const isNumeric = e.target.type === 'number';
        onMetricsChange(prev => ({
            ...prev,
            [key]: isNumeric ? (value === '' ? undefined : Number(value)) : value
        }));
    };

    return (
        <div className="space-y-6">
            {script?.metrics && (
                <div className="flex justify-end">
                    <button type="button" onClick={() => onMetricsChange({ ...script.metrics })} className="px-3 py-1.5 text-sm rounded-lg ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                        {t('resetToDefaults')}
                    </button>
                </div>
            )}
            <MetricsVisualizer metrics={metrics} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                    <label htmlFor="unitsPerEm" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetricsUnitsPerEm')}</label>
                    <MetricNumberInput id="unitsPerEm" value={metrics.unitsPerEm} min={16} max={16384} onCommit={v => setMetric('unitsPerEm', v)} />
                </div>
                <div>
                    <label htmlFor="ascender" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetricsAscender')}</label>
                    <MetricNumberInput id="ascender" value={metrics.ascender} min={0} max={4000} onCommit={v => setMetric('ascender', v)} />
                </div>
                <div>
                    <label htmlFor="descender" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetricsDescender')}</label>
                    <MetricNumberInput id="descender" value={metrics.descender} min={-4000} max={0} onCommit={v => setMetric('descender', v)} />
                </div>
                <div>
                    <label htmlFor="defaultAdvanceWidth" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetricsDefaultAdvanceWidth')}</label>
                    <MetricNumberInput id="defaultAdvanceWidth" value={metrics.defaultAdvanceWidth} min={0} max={5000} onCommit={v => setMetric('defaultAdvanceWidth', v)} />
                </div>
                <div>
                    <label htmlFor="superTopLineY" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetricsSuperTopLineY')}</label>
                    <MetricNumberInput id="superTopLineY" value={metrics.superTopLineY} min={0} max={1000} onCommit={v => setMetric('superTopLineY', v)} />
                </div>
                <div>
                    <label htmlFor="topLineY" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetricsTopLineY')}</label>
                    <MetricNumberInput id="topLineY" value={metrics.topLineY} min={0} max={1000} onCommit={v => setMetric('topLineY', v)} />
                </div>
                <div>
                    <label htmlFor="baseLineY" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetricsBaseLineY')}</label>
                    <MetricNumberInput id="baseLineY" value={metrics.baseLineY} min={0} max={1000} onCommit={v => setMetric('baseLineY', v)} />
                </div>
                <div>
                    <label htmlFor="subBaseLineY" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetricsSubBaseLineY')}</label>
                    <MetricNumberInput id="subBaseLineY" value={metrics.subBaseLineY} min={0} max={1000} onCommit={v => setMetric('subBaseLineY', v)} />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="styleName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetricsStyleName')}</label>
                    <input type="text" id="styleName" value={metrics.styleName} onChange={handleMetricsChange('styleName')} onBlur={() => { if (!metrics.styleName?.trim()) setMetric('styleName', 'Regular'); }} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"/>
                </div>
                <div>
                    <label htmlFor="spaceAdvanceWidth" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetricsSpaceAdvanceWidth')}</label>
                    <MetricNumberInput id="spaceAdvanceWidth" value={metrics.spaceAdvanceWidth} min={0} max={5000} onCommit={v => setMetric('spaceAdvanceWidth', v)} />
                </div>
                <div>
                    <label htmlFor="defaultLSB" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetricsDefaultLSB')}</label>
                    <MetricNumberInput id="defaultLSB" value={metrics.defaultLSB} min={-1000} max={1000} onCommit={v => setMetric('defaultLSB', v)} />
                </div>
                <div>
                    <label htmlFor="defaultRSB" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetricsDefaultRSB')}</label>
                    <MetricNumberInput id="defaultRSB" value={metrics.defaultRSB} min={-1000} max={1000} onCommit={v => setMetric('defaultRSB', v)} />
                </div>
            </div>
        </div>
    );
};

export default React.memo(MetricsSettings);