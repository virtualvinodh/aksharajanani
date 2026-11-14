# Aksharajanani

Make a font from your own handwriting, in your own language, in the browser.

Aksharajanani is for people who have never made a font. You pick your language, draw each letter over a faint guide, and the app does the rest. It builds the letters that are made from other letters (for example கா from க and ா), places accents and vowel signs, spaces the letters, and exports a working OpenType font (`.otf`) that you can install and use in Word, Canva or on a phone.

It comes with ready-made letter sets for many languages: English and other European languages, Greek, Russian and other Cyrillic languages, Hebrew, Hindi, Marathi, Tamil, Kannada, Telugu, Malayalam, Sinhala, Punjabi, Thai, Lao, Japanese kana and more. You can also start an empty project and pick characters from the Unicode table.

Everything stays on your computer: projects are saved in the browser, and you can download a backup file at any time.

## What it can do

- **Draw letters** with a pen, shapes, curves and an eraser, over a guide letter in a real font. You can also trace a photo of a letter written on paper.
- **Letters built from other letters** are made for you and update when their parts change. Accents, vowel signs and marks are placed automatically, and you can adjust them.
- **Spacing:** letter spacing is set automatically. You can adjust any pair and the overall space between letters and words.
- **Try your font** on the Test page before exporting, and make a picture with it in the Creator.
- **Export** a font with the joining and positioning rules each language needs (built with fontTools in the browser).
- **For experts:** rules screens for OpenType substitution and positioning, glyph properties, and importing existing fonts.

## Running it

Requires Node.js 18 or later.

```bash
git clone https://github.com/virtualvinodh/Aksharajanani.git
cd Aksharajanani
npm install
npm run dev
```

Then open http://localhost:3000/.

`npm run dev` and `npm run build` first download the font builder (Pyodide, fontTools and fontFeatures, about 19 MB, each file checked against a pinned SHA-256) into `public/font-builder/` with `scripts/fetch-font-builder.mjs`; after that it's a no-op. The app serves these files itself and starts loading them when a project opens.

To build for a sub-folder (as on GitHub Pages), set `BASE_PATH`, e.g. `BASE_PATH=/Aksharajanani/ npm run build`. The test site at https://virtualvinodh.github.io/Aksharajanani/ is deployed by `.github/workflows/pages.yml` on every push to `claude` or `main`.

Other commands:

| Command | What it does |
|---|---|
| `npm run build` | Production build into `dist/` |
| `npm run check` | Type check, lint, unit tests and build |
| `npm test` | Unit tests (Vitest) |
| `npm run check:translations` | Lists interface strings missing from a translation |

## Project layout

```
components/   React components (grid, drawing editor, spacing, positioning, rules, dialogs)
contexts/     React contexts (project, settings, layout, locale)
hooks/        State and actions
services/     Font building (opentype.js + fontTools via Pyodide), feature-file generation,
              auto-spacing, photo tracing, rendering
utils/        Geometry and other helpers
data/         Letter sets and rules for each ready-made language (see characters_json.md,
              rules_json.md, positioning_json.md, scripts_json.md)
locales/      Interface translations (English and Tamil)
workers/      Web workers
tools/        Browser end-to-end tests and font checks (see tools/README.md)
```

How data moves through the app is described in `data_flow.md` and `data_structure.md`.

Built with React 18, TypeScript, Vite, Tailwind CSS, paper.js, opentype.js, Pyodide/fontTools, IndexedDB (`idb`) and `react-virtuoso`.

## Contributing

See `CONTRIBUTING.md`, `TESTING.md` and `TRANSLATION.md`.

## Licence

Aksharajanani is free software under the GNU General Public License, version 3 or later (`GPL-3.0-or-later`); see [LICENSE](LICENSE). You may use, change and share it; if you share a changed version, you must share its source under the same licence.

The fonts people make with the app belong to them; the licence of the app doesn't apply to them. The guide fonts are open-licence fonts (mostly Noto, under the SIL Open Font License), loaded from a CDN; `public/fonts` has the Japanese kana guide font and its licence.
