/**
 * The font's version number ("1.000", "1.001", …). It is stored in the project (settings.fontVersion),
 * written into every exported font (name IDs 3 and 5, head.fontRevision) and raised by 0.001 after
 * each export, so a reinstalled font is recognised as newer. Projects from before it start at 1.000.
 */
export const DEFAULT_FONT_VERSION = '1.000';

/** "1.2", " 1.0010 ", "Version 2.5" or a number → "1.200", "1.001", "2.500"; anything unusable → "1.000". */
export const normalizeFontVersion = (value: unknown): string => {
    const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value : '';
    const match = text.match(/\d+(?:\.\d*)?/);
    const n = match ? parseFloat(match[0]) : NaN;
    // head.fontRevision is a 16.16 fixed-point number, so keep it below 32768.
    if (!isFinite(n) || n <= 0 || n >= 32768) return DEFAULT_FONT_VERSION;
    return (Math.round(n * 1000) / 1000).toFixed(3);
};

/** The version after the next export: 1.000 → 1.001, 1.999 → 2.000. */
export const nextFontVersion = (value: unknown): string =>
    ((Math.round(parseFloat(normalizeFontVersion(value)) * 1000) + 1) / 1000).toFixed(3);
