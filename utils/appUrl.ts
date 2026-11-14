/// <reference types="vite/client" />

/**
 * A URL for one of the app's own files (`data/…`, `locales/…`, `scripts.json`, `font-builder/…`),
 * relative to where the app is served. Locally that is `/`; on GitHub Pages it's `/Aksharajanani/`
 * (set with BASE_PATH at build time), so root-relative URLs like `/data/x.json` would miss.
 */
export const appUrl = (p: string): string => import.meta.env.BASE_URL + p.replace(/^\/+/, '');

/** For URLs that come from data files: leave full URLs alone, map `/fonts/x.ttf` to the app's own. */
export const resolveAppUrl = (u: string): string => (/^[a-z]+:/i.test(u) || u.startsWith('//') ? u : appUrl(u));
