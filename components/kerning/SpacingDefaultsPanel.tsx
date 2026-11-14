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
 * The two spacing values every letter follows unless it has its own: the space beside each letter
 * (Settings → Metrics' left and right side, moved together) and the width of the word space (U22).
 * Shown on the Spacing screen with a sample line, so people can judge the result where they space.
 */
const SpacingDefaultsPanel: React.FC<SpacingDefaultsPanelProps> = ({ letters, glyphDataMap, kerningMap, suggestedKerningMap, glyphVersion }) => {
    const { t } = useLocale();
    const { theme } = useTheme();
    const { settings, metrics, dispatch } = useSettings();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(600);
    // What the values were when the panel opened, for "Back to how it was".
    const [initial] = useState(() => metrics ? { lsb: metrics.defaultLSB, rsb: metrics.defaultRSB, space: metrics.spaceAdvanceWidth } : null);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(entries => setWidth(Math.max(200, Math.floor(entries[0].contentRect.width))));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

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
        const canvas = canvasRef.current, ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !metrics || !settings) return;
        const dpr = window.devicePixelRatio || 1;
        const height = 96;
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
    }, [words, width, metrics, settings, theme, glyphDataMap, kerningMap, suggestedKerningMap, glyphVersion]);

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
        <div className="flex-1 min-w-[12rem]">
            <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-indigo-600" />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400"><span>{low}</span><span>{high}</span></div>
        </div>
    );

    return (
        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 space-y-3" data-tour="spacing-defaults">
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('spacingDefaultsHint')}</p>
            <div className="flex flex-wrap gap-6">
                {slider('spacing-letters', t('spaceBetweenLetters'), t('spacingTighter'), t('spacingLooser'), letterSpace, letterMin, letterMax, 1, setLetterSpace)}
                {slider('spacing-words', t('spaceBetweenWords'), t('spacingNarrower'), t('spacingWider'), metrics.spaceAdvanceWidth, wordMin, wordMax, 10, setWordSpace)}
            </div>
            <div ref={wrapRef} className="w-full rounded-md bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden">
                <canvas ref={canvasRef} aria-label={t('spacingSample')} role="img" />
            </div>
            {changed && (
                <button type="button" onClick={restore} className="text-sm text-indigo-600 dark:text-indigo-400 underline underline-offset-2">{t('spacingBackToBefore')}</button>
            )}
        </div>
    );
};

export default React.memo(SpacingDefaultsPanel);
