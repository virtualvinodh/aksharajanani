import React, { useState, useEffect, useRef, useMemo } from 'react';
import Modal from '../Modal';
import { SpinnerIcon } from '../../constants';
import { useLocale } from '../../contexts/LocaleContext';
import { useLayout } from '../../contexts/LayoutContext';
import { loadTraceImage, traceImage, TraceSettings, TraceResult, CropRect, DEFAULT_TRACE_SETTINGS } from '../../services/imageTracerService';
import { Path, FontMetrics } from '../../types';
import { generateId } from '../../hooks/drawingTools/types';

interface ImageTracerModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string | null;
    onInsertSVG: (paths: Path[]) => void;
    drawingCanvasSize: number;
    metrics: FontMetrics;
    /** The letter being drawn, and the size its guide is drawn at: the trace is placed over the guide. */
    letter?: string;
    guideSize?: number;
}

interface Box { x: number; y: number; width: number; height: number }

/**
 * Where the faint guide letter sits on the drawing canvas (drawn centred at x = 500 on the
 * baseline, in the guide font). Falls back to the space between the top line and the baseline.
 */
const guideLetterBox = (letter: string | undefined, size: number | undefined, metrics: FontMetrics, canvasSize: number): Box => {
    const lines: Box = { x: canvasSize / 2 - (metrics.baseLineY - metrics.topLineY) * 0.4, y: metrics.topLineY, width: (metrics.baseLineY - metrics.topLineY) * 0.8, height: metrics.baseLineY - metrics.topLineY };
    if (!letter || !size) return lines;
    try {
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) return lines;
        const family = getComputedStyle(document.documentElement).getPropertyValue('--guide-font-family').trim() || 'sans-serif';
        ctx.font = `bold ${size}px ${family}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        const m = ctx.measureText(letter);
        const width = m.actualBoundingBoxLeft + m.actualBoundingBoxRight, height = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
        if (!(width > 2 && height > 2)) return lines;
        return { x: canvasSize / 2 - m.actualBoundingBoxLeft, y: metrics.baseLineY - m.actualBoundingBoxAscent, width, height };
    } catch { return lines; }
};

const ImageTracerModal: React.FC<ImageTracerModalProps> = ({ isOpen, onClose, imageSrc, onInsertSVG, drawingCanvasSize, metrics, letter, guideSize }) => {
    const { t } = useLocale();
    const { showNotification } = useLayout();

    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [settings, setSettings] = useState<TraceSettings>(DEFAULT_TRACE_SETTINGS);
    const [result, setResult] = useState<TraceResult | null>(null);
    const [isTracing, setIsTracing] = useState(false);
    const [dragRect, setDragRect] = useState<CropRect | null>(null);
    const dragStart = useRef<{ x: number; y: number } | null>(null);
    const photoRef = useRef<HTMLDivElement>(null);

    // A new photo: start from the defaults.
    useEffect(() => {
        if (!isOpen || !imageSrc) return;
        let cancelled = false;
        setImage(null); setResult(null); setSettings(DEFAULT_TRACE_SETTINGS);
        loadTraceImage(imageSrc).then(img => { if (!cancelled) setImage(img); })
            .catch(e => showNotification(e instanceof Error ? e.message : String(e), 'error'));
        return () => { cancelled = true; };
    }, [isOpen, imageSrc, showNotification]);

    // Trace again when a setting changes (shortly after, so dragging a slider stays smooth).
    useEffect(() => {
        if (!isOpen || !image) return;
        setIsTracing(true);
        const timer = window.setTimeout(() => {
            try { setResult(traceImage(image, settings)); }
            catch (e) { showNotification(e instanceof Error ? e.message : String(e), 'error'); }
            finally { setIsTracing(false); }
        }, 120);
        return () => window.clearTimeout(timer);
    }, [isOpen, image, settings, showNotification]);

    const update = (patch: Partial<TraceSettings>) => setSettings(s => ({ ...s, ...patch }));

    // Drag on the photo to trace only that part.
    const fractionAt = (e: React.PointerEvent) => {
        const r = photoRef.current!.getBoundingClientRect();
        return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
    };
    const onPointerDown = (e: React.PointerEvent) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        dragStart.current = fractionAt(e);
        setDragRect(null);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (!dragStart.current) return;
        const a = dragStart.current, b = fractionAt(e);
        setDragRect({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });
    };
    const onPointerUp = () => {
        dragStart.current = null;
        if (dragRect && dragRect.w > 0.03 && dragRect.h > 0.03) update({ crop: dragRect });
        setDragRect(null);
    };

    const shownArea = dragRect || settings.crop || (result && (result.area.w < 0.999 || result.area.h < 0.999) ? result.area : null);
    const found = !!result && result.contours.length > 0;

    const previewSvg = useMemo(() => {
        if (!result || !found) return null;
        const b = result.bounds, pad = Math.max(b.width, b.height) * 0.06;
        return result.svg.replace(/viewBox="[^"]*"/, `viewBox="${b.x - pad} ${b.y - pad} ${b.width + 2 * pad} ${b.height + 2 * pad}"`);
    }, [result, found]);

    const handleInsert = () => {
        if (!result || !found) return;
        // Same size and place as the guide letter (or between the lines when there's none).
        const target = guideLetterBox(letter, guideSize, metrics, drawingCanvasSize);
        const b = result.bounds;
        const scale = target.height / b.height;
        const dx = target.x + target.width / 2 - (b.x + b.width / 2) * scale;
        const dy = target.y + target.height / 2 - (b.y + b.height / 2) * scale;
        // One shape with all outlines, so the holes of letters stay holes.
        const segmentGroups = result.contours.map(c => c.map(s => ({
            point: { x: s.point.x * scale + dx, y: s.point.y * scale + dy },
            handleIn: { x: s.handleIn.x * scale, y: s.handleIn.y * scale },
            handleOut: { x: s.handleOut.x * scale, y: s.handleOut.y * scale },
        })));
        onInsertSVG([{ id: generateId(), type: 'outline', points: [], segmentGroups }]);
        showNotification(t('traceInserted'), 'info');
        onClose();
    };

    const slider = (label: string, low: string, high: string, value: number, min: number, max: number, onChange: (v: number) => void) => (
        <div>
            <label className="text-sm font-medium">{label}</label>
            <input type="range" min={min} max={max} step={(max - min) / 40} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full accent-indigo-600" aria-label={label} />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400"><span>{low}</span><span>{high}</span></div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('traceImageTitle')}
            size="xl"
            footer={<>
                <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg">{t('cancel')}</button>
                <button onClick={handleInsert} disabled={isTracing || !found} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg disabled:bg-indigo-400">{t('traceInsert')}</button>
            </>}
        >
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">{t('tracePhotoTip')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border p-2 rounded-md dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2 gap-2">
                        <h4 className="font-semibold">{t('originalImage')}</h4>
                        {settings.crop && <button type="button" onClick={() => update({ crop: null })} className="text-sm text-indigo-600 dark:text-indigo-400 underline underline-offset-2">{t('traceUseWholePhoto')}</button>}
                    </div>
                    <div className="flex justify-center">
                        <div ref={photoRef} className="relative inline-block select-none touch-none cursor-crosshair"
                            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
                            {imageSrc && <img src={imageSrc} alt="" draggable={false} className="block max-w-full max-h-64" />}
                            {shownArea && (
                                <div className="absolute border-2 border-dashed border-indigo-500 bg-indigo-500/10 pointer-events-none"
                                    style={{ left: `${shownArea.x * 100}%`, top: `${shownArea.y * 100}%`, width: `${shownArea.w * 100}%`, height: `${shownArea.h * 100}%` }} />
                            )}
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('traceDragHint')}</p>
                </div>
                <div className="border p-2 rounded-md dark:border-gray-700">
                    <h4 className="font-semibold mb-2">{t('livePreview')}</h4>
                    <div className="w-full h-64 bg-white dark:bg-gray-100 text-black rounded flex items-center justify-center overflow-hidden">
                        {isTracing && !previewSvg ? <SpinnerIcon /> : previewSvg
                            ? <div className={`w-full h-full p-2 [&>svg]:w-full [&>svg]:h-full ${isTracing ? 'opacity-50' : ''}`} dangerouslySetInnerHTML={{ __html: previewSvg }} />
                            : result && <p className="px-4 text-center text-sm text-gray-600">{t('traceNothingFound')}</p>}
                    </div>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {slider(t('traceLines'), t('traceThinner'), t('traceThicker'), settings.thickness, -1, 1, v => update({ thickness: v }))}
                {slider(t('traceEdges'), t('traceDetailed'), t('traceSmoother'), settings.smoothness, 0, 1, v => update({ smoothness: v }))}
                {slider(t('traceCleanup'), t('traceKeepSpecks'), t('traceRemoveSpecks'), settings.cleanup, 0, 1, v => update({ cleanup: v }))}
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                    type="checkbox"
                    checked={settings.lightOnDark === 'auto' ? !!result?.lightOnDark : settings.lightOnDark}
                    onChange={e => update({ lightOnDark: e.target.checked })}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-accent border-gray-300 dark:border-gray-600"
                />
                <span>{t('traceLightOnDark')}</span>
            </label>
        </Modal>
    );
};

export default ImageTracerModal;
