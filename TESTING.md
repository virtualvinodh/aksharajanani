# Testing Aksharajanani

Mistakes in the app end up in the fonts people install, so changes are checked at four levels: unit tests, end-to-end runs that build whole fonts, checks on the exported fonts, and manual checks in the app.

Before a pull request, run:

```bash
npm run check            # type check, lint, unit tests and production build
npm run check:translations
```

## 1. Unit tests (Vitest)

```bash
npm test                 # once
npm run test:watch       # while working
```

Tests live next to the code they test, as `*.test.ts` (for example `services/kerningService.test.ts`, `utils/ruleUsage.test.ts`). They cover feature-file generation, auto-spacing, mark placement, glyph geometry, rule usage, font coverage on the Test page, the font version number, project files, and the tutorial's translations.

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myService';

describe('myService', () => {
  it('doubles the value', () => {
    expect(myFunction(10)).toBe(20);
  });
});
```

## 2. End-to-end: building whole fonts

`tools/e2e/e2e.cjs` drives the app in a real browser (Playwright) the way a person would, for one language at a time:

1. starts a project;
2. draws every letter;
3. places the accents and marks;
4. spaces the letters;
5. tries the Test page and the Creator;
6. exports the font.

Each run leaves screenshots, the exported `.otf`, the project file and a `summary.json` with any page errors in `tools/e2e/out/<script>/`.

```bash
npm run dev                                   # in another terminal
SCRIPT=tamil node tools/e2e/e2e.cjs           # english, spanish, greek, cyrillic, tamil, kannada, telugu, …
```

Setup (Playwright isn't a project dependency), the full list of scripts, checkpoints, video recording and how to add a language are in [tools/README.md](tools/README.md).

## 3. Checking the exported fonts

The scripts in `tools/font/` read an exported font with fontTools and HarfBuzz:
- `rulecheck.py` checks that the font shapes the way the project's rules say it should;
- `fontcheck.py` checks names, metrics and coverage;
- `kerndump.py` lists the spacing pairs.

`tools/checks/` checks the script data files and the translations. See [tools/README.md](tools/README.md) for how to run them (the easiest way is `uv run --with fonttools --with uharfbuzz python3 …`).

## 4. Checking by hand in the app

- **Try your font** (the Test page): type text and check that joined letters form, vowel signs and accents sit in the right place, and the spacing looks even. Letters that aren't drawn yet are shown in grey boxes.
- **Compare**: view a set of letters side by side to check stroke weight, height and alignment.
- **QA checklist** (development builds only): the "Test Cases" item in the header's More menu opens a checklist from `data/test_cases.json`. Mark each item Pass, Fail or Skip; progress is kept in the browser. It isn't shown in the published site.

Check new screens on a phone-sized window (390×844) as well as a desktop, and in both interface languages.

## 5. Reporting bugs

Open an issue on GitHub with:
1. the steps to reproduce;
2. what you expected, and what happened;
3. a screenshot or video;
4. if you can, the project's backup file (⋮ → Download a backup).

Inside the app, ⋮ → Send feedback (also in the footer and after export) offers email or GitHub.
