/// <reference types="vite/client" />

/**
 * True in `npm run dev`, false in the built site. Tools for testing the app itself
 * (the QA checklist, Debugging Tools) are shown only in development builds (F33).
 */
export const IS_DEV_BUILD: boolean = import.meta.env.DEV;
