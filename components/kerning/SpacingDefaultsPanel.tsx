import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Character, FontMetrics, GlyphData, KerningMap } from '../../types';
import { useLocale } from '../../contexts/LocaleContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useTheme } from '../../contexts/ThemeContext';
import { renderPaths, getAccurateGlyphBBox } from '../../services/glyphRenderService';

interface SpacingDefaultsPanelProps {
    /** Drawn letters that can sit side by side (no marks), in a stable order. */
    letters: Character[];
    glyphDataMap: Map<number, GlyphData>;
    kerningMap: KerningMap;
    suggestedKerningMap: KerningMap;
    glyphVersion: number;
}

/**
 * "Overall spacing": the two values every letter follows unless it has its own space: the room beside
 * each letter (Settings → Metrics' left and right side, moved together) and the word space (U22).
 * A permanent strip at the top of the Spacing screen, above the pair fixes, with a sample line in the
 * project's own letters. Collapsible; starts collapsed on phones.
 */
const COLLAPSED_KEY = 'spacingStripCollapsed';

const SpacingDefaultsPanel: React.FC<SpacingDefaultsPanelProps> = ({ letters, glyphDataMap, kerningMap, suggestedKerningMap, glyphVersion }) => {
    const { t } = useLocale();
    const { theme } = useTheme();
    const { settings, metrics, dispatch } = useSettings();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(600);
    // What the values were when the panel opened, for "Back to how it was".
    const [initial] = useState(() => metrics ? { lsb: metrics.defaultLSB, rsb: metrics.defaultRSB, space: metrics.spaceAdvanceWidth } : null);
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        try { const v = localStorage.getItem(COLLAPSED_KEY); if (v !== null) return v === 'true'; } catch { /* storage blocked */ }
        return typeof window !== 'undefined' && window.matchMedia?.('(max-width: 639px)').matches;
    });
    const toggle = () => setCollapsed(c => { try { localStorage.setItem(COLLAPSED_KEY, String(!c)); } catch { /* storage blocked */ } return !c; });

    useEffect(() => {
        const el = wrapRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(entries => setWidth(Math.max(200, Math.floor(entries[0].contentRect.width))));
        ro.observe(el);
        return () => ro.disconnect();
    }, [collapsed]);

    // Sample words: words of the sample text made only of drawn letters that need no joining or
    // signs (anything else would need the font's rules to look right), topped up with drawn letters.
    const words = useMemo(() => {
        const byUnicode = new Map(letters.map(c => [c.unicode!, c]));
        const fromText = (settings?.customSampleText || '').split(/\s+/)
            .filter(w => w.length >= 2 && !/\p{M}/u.test(w) && [...w].every(ch => byUnicode.has(ch.codePointAt(0)!)))
            .map(w => [...w].map(ch => byUnicode.get(ch.codePointAt(0)!)!));
        const unique: Character[][] = [];
        const seen = new Set<string>();
        for (const w of fromText) { const k = w.map(c => c.unicode).join(','); if (!seen.has(k)) { seen.add(k); unique.push(w); } if (unique.length >= 6) break; }
        if (unique.length < 3) {
            for (let i = 0; i < letters.length && unique.length < 4; i += 4) unique.push(letters.slice(i, i + 4));
        }
        return unique.filter(w => w.length > 0);
    }, [letters, settings?.customSampleText]);

    useEffect(() => {
        if (collapsed) return;
        const canvas = canvasRef.current, ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !metrics || !settings) return;
        const dpr = window.devicePixelRatio || 1;
        const height = 64;
        canvas.width = width * dpr; canvas.height = height * dpr;
        canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        const stroke = settings.strokeThickness;
        const color = theme === 'dark' ? '#E5E5E5' : '#262626';

        // Lay the words out in drawing units, then scale the line to fit.
        type Placed = { glyph: GlyphData; x: number };
        const placed: Placed[] = [];
        let x = 0;
        words.forEach((word, wi) => {
            if (wi > 0) x += metrics.spaceAdvanceWidth;
            word.forEach((ch, ci) => {
                const glyph = glyphDataMap.get(ch.unicode!);
                const box = glyph && getAccurateGlyphBBox(glyph.paths, stroke);
                if (!glyph || !box) return;
                const next = word[ci + 1];
                const kernKey = next ? `${ch.unicode}-${next.unicode}` : '';
                const kern = next ? (kerningMap.get(kernKey) ?? suggestedKerningMap.get(kernKey) ?? 0) : 0;
                x += ch.lsb ?? metrics.defaultLSB;
                placed.push({ glyph, x: x - box.x });
                x += box.width + (ch.rsb ?? metrics.defaultRSB) + kern;
            });
        });
        if (!placed.length || x <= 0) return;
        const lineHeight = (metrics.baseLineY - metrics.topLineY) * 1.9;
        const scale = Math.min((width - 16) / x, (height - 8) / lineHeight, 0.12);
        ctx.save();
        ctx.translate(8, height / 2 - ((metrics.topLineY + metrics.baseLineY) / 2) * scale);
        ctx.scale(scale, scale);
        for (const p of placed) {
            ctx.save(); ctx.translate(p.x, 0);
            renderPaths(ctx, p.glyph.paths, { strokeThickness: stroke, color });
            ctx.restore();
        }
        ctx.restore();
    }, [words, width, metrics, settings, theme, glyphDataMap, kerningMap, suggestedKerningMap, glyphVersion, collapsed]);

    if (!metrics || !initial) return null;

    // One value for both sides. When the two sides differ, the slider moves both by the same amount.
    const letterSpace = Math.round((metrics.defaultLSB + metrics.defaultRSB) / 2);
    const setLetterSpace = (v: number) => dispatch({ type: 'UPDATE_METRICS', payload: (prev: FontMetrics | null) => {
        if (!prev) return prev;
        const delta = v - Math.round((prev.defaultLSB + prev.defaultRSB) / 2);
        return delta === 0 ? prev : { ...prev, defaultLSB: prev.defaultLSB + delta, defaultRSB: prev.defaultRSB + delta };
    } });
    const setWordSpace = (v: number) => dispatch({ type: 'UPDATE_METRICS', payload: (prev: FontMetrics | null) => prev && prev.spaceAdvanceWidth !== v ? { ...prev, spaceAdvanceWidth: v } : prev });
    const changed = metrics.defaultLSB !== initial.lsb || metrics.defaultRSB !== initial.rsb || metrics.spaceAdvanceWidth !== initial.space;
    const restore = () => dispatch({ type: 'UPDATE_METRICS', payload: (prev: FontMetrics | null) => prev && { ...prev, defaultLSB: initial.lsb, defaultRSB: initial.rsb, spaceAdvanceWidth: initial.space } });

    const letterMin = Math.min(-20, letterSpace), letterMax = Math.max(150, letterSpace);
    const wordMin = Math.min(100, metrics.spaceAdvanceWidth), wordMax = Math.max(1000, metrics.spaceAdvanceWidth);

    const slider = (id: string, label: string, low: string, high: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void) => (
        <div className="w-full sm:w-56 flex-shrink-0">
            <label htmlFor={id} className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>
            <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-indigo-600" />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400"><span>{low}</span><span>{high}</span></div>
        </div>
    );

    return (
        <section className="flex-shrink-0 px-4 py-1.5 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60" data-tour="spacing-defaults" aria-label={t('overallSpacing')}>
            <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={toggle} aria-expanded={!collapsed} title={t('spacingDefaultsHint')}
                    className="flex items-center gap-2 py-1 text-sm font-bold text-gray-800 dark:text-gray-100">
                    <span aria-hidden="true" className={`inline-block transition-transform ${collapsed ? '' : 'rotate-90'}`}>▸</span>
                    {t('overallSpacingTitle')}
                </button>
                {changed && !collapsed && (
                    <button type="button" onClick={restore} className="text-sm text-indigo-600 dark:text-indigo-400 underline underline-offset-2">{t('spacingBackToBefore')}</button>
                )}
            </div>
            {!collapsed && (
                <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-6 gap-y-2 pb-1">
                    {slider('spacing-letters', t('overallSpacing'), t('spacingTighter'), t('spacingLooser'), letterSpace, letterMin, letterMax, 1, setLetterSpace)}
                    {slider('spacing-words', t('wordSpace'), t('spacingNarrower'), t('spacingWider'), metrics.spaceAdvanceWidth, wordMin, wordMax, 10, setWordSpace)}
                    <div ref={wrapRef} className="w-full lg:w-auto lg:flex-1 min-w-0 rounded-md bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden">
                        <canvas ref={canvasRef} aria-label={t('spacingSample')} role="img" />
                    </div>
                </div>
            )}
        </section>
    );
};

export default React.memo(SpacingDefaultsPanel);
