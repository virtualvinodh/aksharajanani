import { paperScope } from './glyphRenderService';
import { Segment } from '../types';

/**
 * Turns a photo or scan of a hand-written letter into smooth outlines.
 *
 * 1. Even out the light: estimate the paper's brightness everywhere (a morphological closing on a
 *    small copy, so ink is ignored but shadows and lighting gradients are kept) and divide by it.
 *    Light writing on a dark board is turned round first.
 * 2. Ink is what is clearly darker than the paper (Otsu's threshold, moved by "thickness").
 * 3. Clean up: drop specks and ruled lines, fill pinholes; holes of letters (o, அ, क) stay.
 * 4. If the letter is small in the photo, look again at just the letter, at full resolution.
 * 5. Outlines are followed at sub-pixel precision (marching squares on a lightly blurred mask)
 *    and fitted with a few Bézier curves (paper.js simplify).
 */

/** The photo is looked at with its long side at most this many pixels. */
const WORK_SIZE = 1000;

export interface TraceSettings {
    /** −1 (thinner lines) … 1 (thicker lines); 0 is the automatic threshold. */
    thickness: number;
    /** 0 (keep detail) … 1 (smoothest). */
    smoothness: number;
    /** 0 (keep every speck) … 1 (drop bigger specks). */
    cleanup: number;
    /** Light writing on a dark background; 'auto' decides from the photo. */
    lightOnDark: boolean | 'auto';
    /** Part of the photo to use, as fractions (0–1) of its width and height; none = automatic. */
    crop?: CropRect | null;
}

export interface CropRect { x: number; y: number; w: number; h: number }

export const DEFAULT_TRACE_SETTINGS: TraceSettings = { thickness: 0, smoothness: 0.5, cleanup: 0.3, lightOnDark: 'auto', crop: null };

export interface TraceResult {
    /** Closed outlines (holes included; fill even-odd), in pixels of the traced area. */
    contours: Segment[][];
    /** The outlines' bounding box, in the same pixels. */
    bounds: { x: number; y: number; width: number; height: number };
    /** An SVG of the outlines, for previews. */
    svg: string;
    /** The part of the photo that was traced (fractions), so it can be shown. */
    area: CropRect;
    /** Whether the photo was read as light writing on a dark background. */
    lightOnDark: boolean;
}

/** Loads a picture (data URL) once; trace it as often as the settings change. */
export const loadTraceImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Error loading image for tracing.'));
    img.src = src;
});

// ---------------------------------------------------------------------------------------------
// Step 1: grey, evened-out picture of an area of the photo
// ---------------------------------------------------------------------------------------------

interface Field { w: number; h: number; ink: Float32Array; lightOnDark: boolean }

const fieldCache = new WeakMap<HTMLImageElement, Map<string, Field>>();

const readField = (img: HTMLImageElement, area: CropRect, lightOnDark: boolean | 'auto'): Field => {
    const key = `${area.x},${area.y},${area.w},${area.h},${lightOnDark}`;
    let cache = fieldCache.get(img);
    if (!cache) { cache = new Map(); fieldCache.set(img, cache); }
    const hit = cache.get(key);
    if (hit) { cache.delete(key); cache.set(key, hit); return hit; } // most recent last

    const sx = area.x * img.naturalWidth, sy = area.y * img.naturalHeight;
    const sw = Math.max(1, area.w * img.naturalWidth), sh = Math.max(1, area.h * img.naturalHeight);
    const scale = Math.min(1, WORK_SIZE / Math.max(sw, sh));
    const w = Math.max(8, Math.round(sw * scale)), h = Math.max(8, Math.round(sh * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get canvas context for tracing.');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); // transparent PNGs: paper is white
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    const rgba = ctx.getImageData(0, 0, w, h).data;

    let grey = new Float32Array(w * h);
    for (let i = 0, j = 0; i < grey.length; i++, j += 4) grey[i] = (0.299 * rgba[j] + 0.587 * rgba[j + 1] + 0.114 * rgba[j + 2]) / 255;
    grey = gaussianBlur(grey, w, h, 0.8);

    // Around the letter, most of the picture is background: if that's dark, the writing is light
    // (a board). Judged from the middle, where the letter is; the edges may be a table.
    const dark = lightOnDark === 'auto' ? median(centre(grey, w, h)) < 0.45 : lightOnDark;
    if (dark) for (let i = 0; i < grey.length; i++) grey[i] = 1 - grey[i];

    const { paper, onPaper } = estimatePaper(grey, w, h);
    // Ink amount: 0 on clean paper, towards 1 for ink, whatever the light was. Off the paper (a
    // table around it) there is no ink.
    const ink = new Float32Array(w * h);
    for (let i = 0; i < ink.length; i++) ink[i] = onPaper[i] ? Math.max(0, 1 - grey[i] / Math.max(paper[i], 0.05)) : 0;

    const field = { w, h, ink, lightOnDark: dark };
    cache.set(key, field);
    // Each area is up to a few MB; keep the last few (crop, auto zoom, light-on-dark switch).
    while (cache.size > 3) cache.delete(cache.keys().next().value as string);
    return field;
};

/**
 * The paper's brightness at each pixel: a closing (max, then min) on a small copy removes ink but
 * keeps shadows. Also where the paper is: places far darker than the brightest paper (a table
 * round it) are not paper, and neither is a margin next to them.
 */
const estimatePaper = (grey: Float32Array, w: number, h: number): { paper: Float32Array; onPaper: Uint8Array } => {
    const block = Math.max(2, Math.round(Math.max(w, h) / 120));
    const bw = Math.ceil(w / block), bh = Math.ceil(h / block);
    // Each block's brightest pixels (90th percentile, so a noisy pixel doesn't decide).
    const small = new Float32Array(bw * bh);
    const vals: number[] = [];
    for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
        vals.length = 0;
        for (let y = by * block; y < Math.min(h, (by + 1) * block); y++)
            for (let x = bx * block; x < Math.min(w, (bx + 1) * block); x++) vals.push(grey[y * w + x]);
        vals.sort((a, b) => a - b);
        small[by * bw + bx] = vals[Math.floor(vals.length * 0.9)];
    }
    // Wider than the thickest pen stroke we expect (about 1/12 of the picture).
    const r = Math.max(2, Math.round(Math.max(bw, bh) / 12));
    const closed = minFilter(maxFilter(small, bw, bh, r), bw, bh, r);
    // Light smoothing only: more would spread the paper's brightness onto a dark table next to it.
    const smooth = boxBlur(closed, bw, bh, 1);
    const sorted = Array.from(closed).sort((a, b) => a - b);
    const top = sorted[Math.floor(sorted.length * 0.95)];
    // Shadows on paper rarely darken it by more than half; a table is darker still.
    const paperBlocks = new Float32Array(bw * bh);
    for (let i = 0; i < paperBlocks.length; i++) paperBlocks[i] = closed[i] >= 0.42 * top ? 1 : 0;
    const keptBlocks = minFilter(paperBlocks, bw, bh, 2);
    const onPaper = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
        onPaper[y * w + x] = keptBlocks[Math.min(bh - 1, Math.floor(y / block)) * bw + Math.min(bw - 1, Math.floor(x / block))] ? 1 : 0;
    // Back to full size (bilinear).
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
        const fy = Math.min(bh - 1, Math.max(0, (y + 0.5) / block - 0.5)), y0 = Math.floor(fy), y1 = Math.min(bh - 1, y0 + 1), ty = fy - y0;
        for (let x = 0; x < w; x++) {
            const fx = Math.min(bw - 1, Math.max(0, (x + 0.5) / block - 0.5)), x0 = Math.floor(fx), x1 = Math.min(bw - 1, x0 + 1), tx = fx - x0;
            const a = smooth[y0 * bw + x0] * (1 - tx) + smooth[y0 * bw + x1] * tx;
            const b = smooth[y1 * bw + x0] * (1 - tx) + smooth[y1 * bw + x1] * tx;
            out[y * w + x] = a * (1 - ty) + b * ty;
        }
    }
    return { paper: out, onPaper };
};

// ---------------------------------------------------------------------------------------------
// Steps 2–3: ink mask, cleaned
// ---------------------------------------------------------------------------------------------

interface Mask { w: number; h: number; on: Uint8Array; inkBox: { x0: number; y0: number; x1: number; y1: number } | null }

const makeMask = (field: Field, settings: TraceSettings): Mask => {
    const { w, h, ink } = field;
    const auto = otsu(ink);
    // Thicker = a lower bar for what counts as ink. Never below faint smudges or above clear ink.
    const bar = Math.min(0.7, Math.max(0.06, auto * Math.pow(2, -settings.thickness)));
    const on = new Uint8Array(w * h);
    for (let i = 0; i < on.length; i++) on[i] = ink[i] >= bar ? 1 : 0;

    // Ink pieces: drop specks, ruled lines and anything that is the photo's edge rather than a letter.
    const { labels, count } = label(on, w, h, 1);
    const area = new Int32Array(count + 1), x0 = new Int32Array(count + 1).fill(w), y0 = new Int32Array(count + 1).fill(h), x1 = new Int32Array(count + 1).fill(-1), y1 = new Int32Array(count + 1).fill(-1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const l = labels[y * w + x]; if (!l) continue;
        area[l]++; if (x < x0[l]) x0[l] = x; if (x > x1[l]) x1[l] = x; if (y < y0[l]) y0[l] = y; if (y > y1[l]) y1[l] = y;
    }
    const keep = new Uint8Array(count + 1);
    const atEdge = (l: number) => x0[l] === 0 || y0[l] === 0 || x1[l] === w - 1 || y1[l] === h - 1;
    for (let l = 1; l <= count; l++) {
        const bwid = x1[l] - x0[l] + 1, bhgt = y1[l] - y0[l] + 1;
        const ruledLine = (bwid > 0.85 * w && bhgt < 0.04 * h) || (bhgt > 0.85 * h && bwid < 0.04 * w);
        // A dark table or border around the paper: it reaches round the whole photo.
        const frame = atEdge(l) && bwid > 0.9 * w && bhgt > 0.9 * h;
        if (!ruledLine && !frame) keep[l] = 1;
    }
    // Other pieces at the photo's edge (bits of table, a finger, the next letter) are kept only if
    // they are the main shape (a big letter cut off by the edge) or reach into the letter's area.
    let ix0 = w, iy0 = h, ix1 = -1, iy1 = -1, biggest = 0, biggestLabel = 0;
    for (let l = 1; l <= count; l++) {
        if (!keep[l]) continue;
        if (area[l] > biggest) { biggest = area[l]; biggestLabel = l; }
        if (!atEdge(l)) { ix0 = Math.min(ix0, x0[l]); iy0 = Math.min(iy0, y0[l]); ix1 = Math.max(ix1, x1[l]); iy1 = Math.max(iy1, y1[l]); }
    }
    for (let l = 1; l <= count; l++) {
        if (!keep[l] || !atEdge(l) || l === biggestLabel) continue;
        const overlaps = ix1 >= 0 && x0[l] <= ix1 && x1[l] >= ix0 && y0[l] <= iy1 && y1[l] >= iy0;
        if (!overlaps) keep[l] = 0;
    }
    // ...unless the biggest piece is itself just edge clutter around ink in the middle.
    if (biggestLabel && atEdge(biggestLabel) && ix1 >= 0 && !(x0[biggestLabel] <= ix1 && x1[biggestLabel] >= ix0 && y0[biggestLabel] <= iy1 && y1[biggestLabel] >= iy0)) keep[biggestLabel] = 0;
    let total = 0;
    for (let l = 1; l <= count; l++) if (keep[l]) total += area[l];
    const minArea = Math.max(6, total * (0.001 + settings.cleanup * 0.03));
    for (let l = 1; l <= count; l++) if (keep[l] && area[l] < minArea) keep[l] = 0;
    for (let i = 0; i < on.length; i++) on[i] = keep[labels[i]];

    // Pinholes: small enclosed gaps in the ink are filled; real holes are much bigger.
    const gaps = new Uint8Array(w * h);
    for (let i = 0; i < gaps.length; i++) gaps[i] = on[i] ? 0 : 1;
    const g = label(gaps, w, h, 0);
    const gArea = new Int32Array(g.count + 1), touches = new Uint8Array(g.count + 1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const l = g.labels[y * w + x]; if (!l) continue;
        gArea[l]++; if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches[l] = 1;
    }
    const minHole = Math.max(4, total * 0.002);
    for (let i = 0; i < on.length; i++) { const l = g.labels[i]; if (l && !touches[l] && gArea[l] < minHole) on[i] = 1; }

    let bx0 = w, by0 = h, bx1 = -1, by1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on[y * w + x]) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
    return { w, h, on, inkBox: bx1 < 0 ? null : { x0: bx0, y0: by0, x1: bx1 + 1, y1: by1 + 1 } };
};

// ---------------------------------------------------------------------------------------------
// The whole trace
// ---------------------------------------------------------------------------------------------

export const traceImage = (img: HTMLImageElement, settings: TraceSettings): TraceResult => {
    let area: CropRect = settings.crop || { x: 0, y: 0, w: 1, h: 1 };
    let field = readField(img, area, settings.lightOnDark);
    let mask = makeMask(field, settings);

    // Step 4: a letter that fills little of the photo is looked at again, closer.
    if (!settings.crop && mask.inkBox) {
        const b = mask.inkBox;
        const bw = (b.x1 - b.x0) / mask.w, bh = (b.y1 - b.y0) / mask.h;
        const longSide = Math.max(img.naturalWidth, img.naturalHeight);
        if (Math.max(bw, bh) < 0.6 && longSide > WORK_SIZE * 1.3) { // only worth it when the photo has more pixels to give
            const m = 0.08 * Math.max(bw, bh);
            const x = Math.max(0, b.x0 / mask.w - m), y = Math.max(0, b.y0 / mask.h - m);
            area = { x, y, w: Math.min(1, b.x1 / mask.w + m) - x, h: Math.min(1, b.y1 / mask.h + m) - y };
            // Keep the decision about light-on-dark made on the whole photo.
            field = readField(img, area, field.lightOnDark);
            mask = makeMask(field, settings);
        }
    }

    const contours = mask.inkBox ? outline(mask, settings.smoothness) : [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of contours) for (const s of c) {
        minX = Math.min(minX, s.point.x); minY = Math.min(minY, s.point.y);
        maxX = Math.max(maxX, s.point.x); maxY = Math.max(maxY, s.point.y);
    }
    const bounds = contours.length ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : { x: 0, y: 0, width: 0, height: 0 };
    return { contours, bounds, svg: toSvg(contours, mask.w, mask.h), area, lightOnDark: field.lightOnDark };
};

// ---------------------------------------------------------------------------------------------
// Step 5: outlines
// ---------------------------------------------------------------------------------------------

const outline = (mask: Mask, smoothness: number): Segment[][] => {
    const { w, h, on } = mask;
    // Pad by 2 so outlines touching the edge still close, and blur so they follow the ink smoothly.
    const W = w + 4, H = h + 4;
    let f = new Float32Array(W * H);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) f[(y + 2) * W + x + 2] = on[y * w + x];
    f = gaussianBlur(f, W, H, 1.1);
    const loops = marchingSquares(f, W, H, 0.5);

    const b = mask.inkBox!;
    const size = Math.max(b.x1 - b.x0, b.y1 - b.y0);
    // How far a curve may stray from the traced edge, in pixels: about 0.1–0.9% of the letter's size.
    const tolerance = Math.max(0.4, size * (0.001 + smoothness * 0.008));
    const minLoopArea = Math.max(4, size * size * 0.00005);

    const result: Segment[][] = [];
    for (const loop of loops) {
        if (loop.length < 6 || Math.abs(polygonArea(loop)) < minLoopArea) continue;
        const path = new paperScope.Path({ segments: loop.map(([x, y]) => [x - 2, y - 2]), closed: true, insert: false });
        path.simplify(tolerance);
        result.push(path.segments.map(s => ({
            point: { x: s.point.x, y: s.point.y },
            handleIn: { x: s.handleIn.x, y: s.handleIn.y },
            handleOut: { x: s.handleOut.x, y: s.handleOut.y },
        })));
        path.remove();
    }
    return result;
};

/** Closed iso-lines of f at `level`, as point loops. Edges are shared, so pieces link up exactly. */
const marchingSquares = (f: Float32Array, W: number, H: number, level: number): [number, number][][] => {
    // Edge ids: horizontal edge (x,y)-(x+1,y) = 2*(y*W+x); vertical edge (x,y)-(x,y+1) = 2*(y*W+x)+1.
    const next = new Int32Array(W * H * 2).fill(-1);
    const px = new Float32Array(W * H * 2), py = new Float32Array(W * H * 2);
    const hasPoint = new Uint8Array(W * H * 2);
    const point = (id: number, x0: number, y0: number, x1: number, y1: number, v0: number, v1: number) => {
        if (!hasPoint[id]) {
            const t = (level - v0) / (v1 - v0);
            px[id] = x0 + (x1 - x0) * t; py[id] = y0 + (y1 - y0) * t; hasPoint[id] = 1;
        }
        return id;
    };
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
        const tl = f[y * W + x], tr = f[y * W + x + 1], br = f[(y + 1) * W + x + 1], bl = f[(y + 1) * W + x];
        const iTl = tl >= level, iTr = tr >= level, iBr = br >= level, iBl = bl >= level;
        if (iTl === iTr && iTr === iBr && iBr === iBl) continue;
        // Crossing points on the cell's four edges (where present).
        const top = iTl !== iTr ? point(2 * (y * W + x), x, y, x + 1, y, tl, tr) : -1;
        const bottom = iBl !== iBr ? point(2 * ((y + 1) * W + x), x, y + 1, x + 1, y + 1, bl, br) : -1;
        const left = iTl !== iBl ? point(2 * (y * W + x) + 1, x, y, x, y + 1, tl, bl) : -1;
        const right = iTr !== iBr ? point(2 * (y * W + x + 1) + 1, x + 1, y, x + 1, y + 1, tr, br) : -1;
        // Each corner's two edges, going round the cell: tl(top,left) tr(top,right) br(right,bottom) bl(bottom,left).
        const corners: [boolean, number, number, number, number][] = [
            [iTl, top, left, x, y], [iTr, top, right, x + 1, y], [iBr, right, bottom, x + 1, y + 1], [iBl, bottom, left, x, y + 1],
        ];
        const pairs: [number, number, number, number, boolean][] = []; // [edge a, edge b, corner x, corner y, corner inside]
        const saddle = top >= 0 && bottom >= 0 && left >= 0 && right >= 0;
        if (saddle) {
            // Cut off the corners on the side that doesn't connect through the middle.
            const centreIn = (tl + tr + br + bl) / 4 >= level;
            for (const [inside, a, b, cx, cy] of corners) if (inside !== centreIn) pairs.push([a, b, cx, cy, inside]);
        } else {
            const edges = [top, right, bottom, left].filter(e => e >= 0);
            // Reference: the corner farthest from the line, to tell which side is ink.
            let best = corners[0], bestD = -1;
            for (const c of corners) {
                const d = Math.abs(cross(px[edges[0]], py[edges[0]], px[edges[1]], py[edges[1]], c[3], c[4]));
                if (d > bestD) { bestD = d; best = c; }
            }
            pairs.push([edges[0], edges[1], best[3], best[4], best[0]]);
        }
        for (const [a, b, cx, cy, inside] of pairs) {
            // Ink on the left of a → b (in screen coordinates): the same rule everywhere links the pieces.
            const c = cross(px[a], py[a], px[b], py[b], cx, cy);
            if ((c > 0) === inside) next[a] = b; else next[b] = a;
        }
    }
    const loops: [number, number][][] = [];
    const used = new Uint8Array(next.length);
    for (let s = 0; s < next.length; s++) {
        if (next[s] < 0 || used[s]) continue;
        const loop: [number, number][] = [];
        let e = s;
        while (e >= 0 && !used[e]) { used[e] = 1; loop.push([px[e], py[e]]); e = next[e]; }
        if (e === s) loops.push(loop);
    }
    return loops;
};

const cross = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

const polygonArea = (pts: [number, number][]) => {
    let a = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
    return a / 2;
};

const toSvg = (contours: Segment[][], w: number, h: number): string => {
    const f = (n: number) => Math.round(n * 10) / 10;
    const d = contours.map(c => {
        let s = `M${f(c[0].point.x)} ${f(c[0].point.y)}`;
        for (let i = 1; i <= c.length; i++) {
            const a = c[i - 1], b = c[i % c.length];
            s += `C${f(a.point.x + a.handleOut.x)} ${f(a.point.y + a.handleOut.y)} ${f(b.point.x + b.handleIn.x)} ${f(b.point.y + b.handleIn.y)} ${f(b.point.x)} ${f(b.point.y)}`;
        }
        return s + 'Z';
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><path d="${d}" fill="currentColor" fill-rule="evenodd"/></svg>`;
};

// ---------------------------------------------------------------------------------------------
// Picture helpers
// ---------------------------------------------------------------------------------------------

/** The middle 60% of a picture. */
const centre = (a: Float32Array, w: number, h: number): Float32Array => {
    const x0 = Math.floor(w * 0.2), x1 = Math.ceil(w * 0.8), y0 = Math.floor(h * 0.2), y1 = Math.ceil(h * 0.8);
    const out = new Float32Array((x1 - x0) * (y1 - y0));
    let k = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) out[k++] = a[y * w + x];
    return out;
};

const median = (a: Float32Array): number => {
    const step = Math.max(1, Math.floor(a.length / 20000));
    const s: number[] = [];
    for (let i = 0; i < a.length; i += step) s.push(a[i]);
    s.sort((x, y) => x - y);
    return s[s.length >> 1];
};

/** Otsu's threshold on values 0–1, ignoring the clean paper (which would swamp the histogram). */
const otsu = (a: Float32Array): number => {
    const bins = 256, hist = new Float64Array(bins);
    let n = 0;
    for (let i = 0; i < a.length; i++) { if (a[i] < 0.03) continue; hist[Math.min(bins - 1, Math.floor(a[i] * bins))]++; n++; }
    if (n < 10) return 0.35;
    let sum = 0; for (let i = 0; i < bins; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, best = 0, bestT = 0;
    for (let t = 0; t < bins; t++) {
        wB += hist[t]; if (!wB) continue;
        const wF = n - wB; if (!wF) break;
        sumB += t * hist[t];
        const mB = sumB / wB, mF = (sum - sumB) / wF;
        const between = wB * wF * (mB - mF) * (mB - mF);
        if (between > best) { best = between; bestT = t; }
    }
    // Clear ink is well above faint shading; keep the bar in a sensible range.
    return Math.min(0.6, Math.max(0.12, (bestT + 0.5) / bins));
};

/** Connected pieces of pixels equal to `value` (8-connected for ink, 4 for gaps). Labels from 1. */
const label = (img: Uint8Array, w: number, h: number, value: number) => {
    const labels = new Int32Array(w * h);
    const parent: number[] = [0];
    const find = (x: number) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const unite = (a: number, b: number) => { a = find(a); b = find(b); if (a !== b) parent[Math.max(a, b)] = Math.min(a, b); };
    const eight = value === 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (img[i] !== 1) continue;
        const nb: number[] = [];
        if (x > 0 && labels[i - 1]) nb.push(labels[i - 1]);
        if (y > 0 && labels[i - w]) nb.push(labels[i - w]);
        if (eight && y > 0 && x > 0 && labels[i - w - 1]) nb.push(labels[i - w - 1]);
        if (eight && y > 0 && x < w - 1 && labels[i - w + 1]) nb.push(labels[i - w + 1]);
        if (!nb.length) { const l = parent.length; parent.push(l); labels[i] = l; }
        else { labels[i] = nb[0]; for (let k = 1; k < nb.length; k++) unite(nb[0], nb[k]); }
    }
    const remap = new Int32Array(parent.length);
    let count = 0;
    for (let l = 1; l < parent.length; l++) { const r = find(l); if (!remap[r]) remap[r] = ++count; remap[l] = remap[r]; }
    for (let i = 0; i < labels.length; i++) if (labels[i]) labels[i] = remap[labels[i]];
    return { labels, count };
};

const gaussianBlur = (src: Float32Array, w: number, h: number, sigma: number): Float32Array => {
    const r = Math.max(1, Math.ceil(sigma * 3));
    const k = new Float32Array(2 * r + 1);
    let s = 0; for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)); s += k[i + r]; }
    for (let i = 0; i < k.length; i++) k[i] /= s;
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let a = 0; for (let i = -r; i <= r; i++) a += src[y * w + Math.min(w - 1, Math.max(0, x + i))] * k[i + r];
        tmp[y * w + x] = a;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let a = 0; for (let i = -r; i <= r; i++) a += tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x] * k[i + r];
        out[y * w + x] = a;
    }
    return out;
};

const filter1d = (src: Float32Array, w: number, h: number, r: number, pick: (a: number, b: number) => number): Float32Array => {
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let v = src[y * w + x];
        for (let i = Math.max(0, x - r); i <= Math.min(w - 1, x + r); i++) v = pick(v, src[y * w + i]);
        tmp[y * w + x] = v;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let v = tmp[y * w + x];
        for (let i = Math.max(0, y - r); i <= Math.min(h - 1, y + r); i++) v = pick(v, tmp[i * w + x]);
        out[y * w + x] = v;
    }
    return out;
};
const maxFilter = (a: Float32Array, w: number, h: number, r: number) => filter1d(a, w, h, r, Math.max);
const minFilter = (a: Float32Array, w: number, h: number, r: number) => filter1d(a, w, h, r, Math.min);
const boxBlur = (a: Float32Array, w: number, h: number, r: number) => {
    const out = filter1d(a, w, h, 0, (v) => v); // copy
    const tmp = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let s = 0, n = 0; for (let i = Math.max(0, x - r); i <= Math.min(w - 1, x + r); i++) { s += a[y * w + i]; n++; }
        tmp[y * w + x] = s / n;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let s = 0, n = 0; for (let i = Math.max(0, y - r); i <= Math.min(h - 1, y + r); i++) { s += tmp[i * w + x]; n++; }
        out[y * w + x] = s / n;
    }
    return out;
};
