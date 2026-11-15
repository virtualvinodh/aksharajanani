# Master list: everything open, from all the reviews

*13 November 2026 · branch `claude` (uncommitted work included)*

One list of everything still open in:
- [REVIEW_ISSUES.md](REVIEW_ISSUES.md): the 37 open numbered issues (D, K, P, U, S);
- [FUNCTIONALITY_REVIEW.md](FUNCTIONALITY_REVIEW.md): F1–F52 and the feature ideas M1–M13;
- [UX_REVIEW.md](UX_REVIEW.md): its findings marked "New";
- [BEGINNER_REVIEW.md](BEGINNER_REVIEW.md);
- [PERSONA_REVIEW.md](PERSONA_REVIEW.md);
- the release tasks from today that weren't written down anywhere.

Duplicates are merged into one row, with every source listed. The F and "New" findings were checked against the code today; the ones checked are still there.

**Columns**
- **Priority:** **P0** = before the beta · **P1** = during the beta · **P2** = later.
- **Ease:** **S** = under 2 hours · **M** = half a day to a day · **L** = two days or more.
- **Your input:** **Yes** = a decision or something only you can do (the recommendation is in the last column) · **–** = I can just do it.

**Totals:** 113 rows. P0: 43 · P1: 41 · P2: 29. 23 need your input; 13 of them are P0. (Rows 97–101 were added on 15 November, found while fixing the 26; rows 102–109 come from the persona runs.)

## Progress (15 November)

**Done: the 26 rows that didn't need you:** 9, 11, 17, 20, 22, 24, 25, 32, 33, 34, 43, 44, 46, 49, 53, 54, 58 (heading and order; the merge is 59), 60, 61, 64, 71, 72, 76, 87, 89, 90 (version number; the licence picker and file name wait for 40). Also 106 (footer year).

**Your decisions, done:**
- **26 Donations:** the bar that popped up over the canvas after 15 seconds is gone. The request appears once, inside the "Your font is downloaded" dialog after the first export.
- **84 Licence:** GPL-3.0-or-later. `LICENSE` added; README, `package.json` and the About page say so, and About credits fontTools, fontFeatures, Pyodide, opentype.js and paper.js.
- **85 Feedback:** "Send feedback" in the ⋮ menu, in the export dialog and in the footer: email to vinodh@virtualvinodh.com (with the browser filled in) or a GitHub issue.
- **80 Font builder:** served from the app's own site (`public/font-builder/`, downloaded and SHA-256-checked by `scripts/fetch-font-builder.mjs` before dev and build; not in git), and loaded when a project opens, not on the start page (0 bytes there now). If the local copy is missing or broken, it falls back to the CDNs. Checked by removing a file.
- **86 Deploy:** GitHub Pages test site via `.github/workflows/pages.yml` (pushes to `claude` or `main`), at `/aksharajanani/`. The app now fetches its own files relative to where it's served (`utils/appUrl.ts`), so moving to its own domain later only means building without `BASE_PATH`. A full Spanish run on a `/aksharajanani/` build passed.
- **1 and 98 Gurmukhi:** done. Every placement rule had its two attachment points swapped, so every sign came out upside down. ੇ ੈ ੋ ੌ now sit centred on the headline (Noto centres them, so this differs from Hindi's े rule), ੋ ੌ are signs that sit on the letter, and ਂ ੰ ੱ sit above its right side. Checked against Noto Sans Gurmukhi; a native reader should still look.
- **40 Font name:** done. Every project's font name follows the project name unless "Same as project name" is unticked in Settings. New projects are "My Tamil font" / "எனது தமிழ் எழுத்துரு" (numbered when taken: "… 2"). The first export asks for the name once. Style Regular (weight 400; Light/Bold get their weights). The internal name is plain ASCII (a short code for non-English names). File name = font name + version ("எனது தமிழ் எழுத்துரு 1.003.otf"). Also 107: empty licence/URL fields are left out of the font.
- **27 Spacing "Accept":** done. "Space all automatically" applies straight away, with Undo; what's shown as spaced is what's exported. The Spacing screen redesign you chose (ideas 1, 3, 4) is done too (checked with English and Tamil e2e, font = screen; also 101 for pair cards): overall spacing and word space as a strip at the top (not a button), "Pair fixes" below with "Space all automatically" and Undo; pair fixes shown as differences ("A V · 12 closer", "Back to usual"); plain names throughout (Overall spacing, Word space, Pair fixes, Letter's own space). Idea 2 (click between letters in the sample to adjust, choosing "just this pair / this letter everywhere / all letters") and idea 5 (no separate list for a letter's own space) are for later.
- **57 Where a language starts:** no. The order of the letter sets stays, as there is a reason for it, and "ready" stays as it is.
- **31 Default spacing:** you'll do it yourself.
- **62 Tutorial:** in progress. A ~10-step core with progress shown; every other step kept as a short tour where it applies, replayable from Help. Also looking into the welcome tip that appeared in the centre.
- **65 Plain names:** later, after the other fixes.
- **67 English in the code:** in progress (with a table of the new Tamil strings for your review). **100 "Finish me" hint:** in progress.
- **48 Cloud saving:** not for the beta. **59** optional.
- **Export counter (GoatCounter):** not yet.
- **Merge:** `main` fast-forwarded to `claude` (15 November).

**Done since (15–16 November):**
- **62 Tutorial:** a 10-step core with "Step N of 10"; every other step kept, in six tours under Help → Tours. Help is now in the ⋮ menu. The welcome tip attaches to a card that's on screen (moves if the card disappears); no tips during multi-select, the phone menu or dialogs.
- **67** ~135 hard-coded English strings moved into the translation files with Tamil. **100** "Finish me" hint in the drawing screen. **102** Test page names the undrawn parts. **103** asks before a pen change re-draws every letter. **105** singular.
- **21** Curve tool hint. **23** eraser sizes (Small / Pen size / Large; also fixed: the eraser couldn't erase the middle of a straight stroke), Slice makes ~30-point pieces instead of ~150. **73** multi-select bar at the bottom of the grid, no stray "0".
- **35, 39** Spacing: the left letter of a pair can be dragged; "Back to usual" is the only way to undo a pair fix (Reset, Delete and Ignore gone). **104** export warning counts only what can be done with the drawn letters, and says "combining marks" for Indian scripts. **110** built letters are measured once, in one place, and only the ones an edit affects.
- **45** Creator tip, labels, watermark. **81** start page lists the last 10 projects from a small summary (name, language, date, a few letter shapes) with "Show more". **109** Tamil Test page title on phones.
- **52** after an accidental refresh, the project that was open opens again (same tab).
- **75, 77, 78, 79** expert screens: `@` for groups everywhere (`$` still reads), plain labels, one name for added letters ("Custom Characters"), WOFF2 import works, "Back" instead of "Cancel"; rules_json.md and positioning_json.md updated.
- **92** WOFF2 and TTF: from the "Your font is downloaded" dialog and from the ⋮ menu (Download font for websites / older apps).
- **12** Japanese ゛ ゜ closer to the letter.
- **10 Malayalam Traditional:** joining rules fixed; C്ര + ു/ൂ built by placing a circle mark (ു.ra, ൂ.ra) under the ra-sign letter. From here on you're fixing it yourself.

**Code review before commit** (10 findings, 9 fixed):
- Kannada ್ಖ… and Telugu ్ష… (shrunk copies of a letter) were counted as "Finish me" letters, so those fonts could never reach 100%. Fixed, with a test.
- A built letter could be measured for spacing from half of itself (கி with only ி drawn), depending on order. It is now built only when all its parts are.
- Deleting a letter left letters built from a removed hidden combination pointing at nothing. Fixed, with a test.
- The version number broke the font cache, so Test and Creator rebuilt the font after every export. It was also raised for imported fonts, where it never reaches the file. Both fixed.
- "Open as its own project" saved unsaved changes even with autosave off. It now asks.
- The tracer kept every crop it had read in memory. It now keeps three.
- Not fixed: row 110.

**Checked:** type check, 185 unit tests, lint (0 errors), translations complete. End-to-end: Tamil (3295/3295 pairs, "ready", no page errors), Spanish on the GitHub Pages build. Telugu, English and Kannada are running on a copy of the build from before the review fixes.

## Progress (13 November, evening)

**Done: 29 of the 30 P0 rows that don't need you:** 2–8, 13–16, 18, 19, 28–30, 36–38, 41, 42, 47, 50, 51, 55, 56, 63, 74, 83. Left: **10** (Malayalam Traditional: on hold until its data is finished).

**Photo tracing (row 18), 14 November:** the button was removed on purpose, because the tracer made rubbish traces. I reproduced that with test photos and found these causes:
- Letter holes (அ, क, A) came out filled.
- Shadows and uneven light left hundreds of specks (243–259 shapes for one letter).
- Background removal took its colour from the top-left pixel.
- Outlines were ragged, with 281–975 segments.
- Every trace was stretched to full letter height.

I wrote a new tracer, with no tracing library:
- It evens out the light, so shadows, ruled or coloured paper, a table around the paper and chalk on a board all work.
- It removes specks and ruled lines but keeps letter holes.
- It zooms in on a small letter in a big photo.
- It traces smooth outlines with about 45–165 curves.

On eleven test photos every trace is right, in about 0.2 s (the old one took up to 1.8 s). The dialog uses plain words: *Lines* thinner/thicker, *Edges* more detail/smoother, *Clean-up*, "Light writing on a dark background", and "Drag over the letter" to trace part of the photo. "Put it on the letter" places the trace over the faint guide letter, at its size.

The camera button is back in the drawing toolbar. Checked in the app on a computer (English B) and a phone (Tamil அ), and in the exported font (B keeps its two holes).

Found on the way: every dialog taller than a phone screen had its buttons cut off. Dialogs now scroll on small screens.

**How they were checked:** end-to-end runs of English, Spanish, Greek, Cyrillic, Thai, Lao, Devanagari, Tamil, Kannada, Telugu and Sinhala on the fixed build. All 11 drew every letter, reached Spacing and exported, with no page errors. Then I rendered the exported fonts for each fix:
- Tamil spacing 3295/3295 (was stuck at 36%); Sinhala 35,424 suggested pairs, export 56 s.
- Greek ΐ ΰ, Thai stacking, Lao ຽ, Devanagari ि, Kannada ್ರ.
- Telugu checked against the guide font; spacing handles checked in the browser.

Found and fixed along the way:
- **Kannada (row 5, second fix):** the first fix broke three-letter clusters (ಸ್ತ್ರ). Kannada's joined forms are now all one group, which also fixes ಕ್ಕೀ, wrong in every Kannada font so far. Confirmed by a new Kannada run: 12,637/12,637 suggested pairs spaced, and ಕ್ರ ಸ್ತ್ರ ಸ್ತ್ರೀ ಕ್ಕೀ ಕ್ಷ್ಮ all form (ಸ್ತ್ರ now uses the combined ತ+ರ form).
- **Phone export (row 74):** it works: export warning → "Export what I have" → download → "Your font is downloaded" (Tamil interface, 390 px wide). It had three problems, now fixed:
  - the export button had no name on a phone (screen readers said nothing; my test couldn't find it);
  - two messages covered the dialog's checkbox and Close button;
  - iPads were shown Mac instructions.
- **Row 46 (P1), partly:** export's progress messages are now in plain words ("Building your font…" instead of "Applying OpenType features…"), and so are the export error messages.
- The end-to-end test's "Download a backup" step had silently failed since the rename, so the runs saved no project files for the font check. Fixed: the new English and Kannada runs saved them, and the font check passes (English: all 102 letters, 4406/4406 spaced pairs; Kannada: all letters except the two optional ones the test doesn't draw).
- A Thai letter (ย) inside a Tamil word in the Tamil interface ("Custom Block Font"). Fixed.

**Also done (not a row):** Unicode blocks are now an optional step of "Create Empty Project": tick English letters, or "Add characters from the Unicode table…", and the font units sit under "Advanced". The language list's "Can't find it?" opens the same dialog with the table open. Old Unicode-block projects still open.

---

## Decisions I need from you

The rows marked **Yes**, in order. Each has my recommendation; a "go" is enough where you agree.

| # | Decision | Priority | My recommendation |
|---|---|---|---|
| 40 | What the font is called | P0 | The font name **follows** the project name by default ("Same as project name", ticked, in Settings); untick to give it a different name, so two projects can make the same font (Regular and Bold of one family, or "try 2" of the same font). New projects start as "My Norwegian font" (in the interface language), and the first export asks "What should your font be called?". Style "Regular" instead of "Medium", editable next to the name. A valid plain-ASCII internal (PostScript) name for non-English names. Existing projects stay unlinked if their font name was deliberately set. File name = font name + date, keeping non-English letters. A name that's already taken gets a number: "My Tamil font", "My Tamil font 2", "My Tamil font 3" (highest + 1, never reused), for new projects, "Save a copy", imports and loaded files. |
| 27 | What "Accept" means in Spacing | P0 | Auto-spacing applies straight away, with Undo; the separate Accept step goes. "Space all letters automatically" becomes one button. This also makes the screen tell the truth (today unaccepted suggestions are exported anyway). |
| 57 | Where a script starts, and what counts as "ready" | P0 | Put vowels and consonants first in every script (Hindi opens on Combining Signs today). "Ready" = letters (and digits); punctuation and symbols become "extras" that don't hold back the "your font is ready" moment. |
| 1 | Where Gurmukhi's ੇ sits (S23) | P0 | Use Devanagari's rule for े (letter's top centre, sign's bottom right), then check by eye. |
| 98 | Gurmukhi ੋ and ੌ: their own space or on the letter | P0 | Make them sit on the letter like ੇ (they share its top part), with the same rule as row 1; then check by eye. |
| 26 | When to ask for donations | P0 | After the first successful export, in the export dialog, not as a bar over the canvas while drawing. |
| 84 | The app's own licence | P0 | README points to a LICENSE file that doesn't exist. Pick one before the public link goes out: AGPL-3.0 if you want hosted copies to stay open, MIT if you want the widest reuse. |
| 85 | How beta users send feedback | P0 | A "Send feedback" link in the header menu and on the export dialog, going to GitHub issues and an email address. |
| 82 | Testing on real devices | P0 | I test the Safari and Firefox engines here; you try it on a real iPad (Pencil) and a phone for 20 minutes each. |
| 86 | Commit and deploy | P0 | Code review of today's work first, then commit. Deploy as a static site (GitHub Pages, Netlify or Cloudflare Pages); say which. |
| 88 | Real people | P0 | 3–5 beginners, 45 minutes each, using the tasks in BEGINNER_REVIEW §7. You recruit; I prepare the task sheet and the note-taking form. |
| 70 | Tamil wording | P0 | Read the Tamil for today's new screens (language picker, about 25 strings). Later the same for the help rewrite and the moved strings (66, 67). |
| 80 | Hosting the font builder (about 8 MB) | P0 | Serve Pyodide and fontTools from the app's own site, and start loading them when a project opens, not on the start page. Fixes the 9 MB first visit and export failing when a CDN is blocked (schools). Costs bandwidth on your host. |
| 31 | Default letter spacing | P1 | Tighten the default to the average of each script's guide font (today 2–4× looser), so first fonts don't look letter-spaced. |
| 48 | Cloud saving (P15) | P1 | Not for the beta. Do 47 (keep browser storage, backup reminders) now; cloud saving needs accounts and a privacy policy. |
| 59 | Script boxes vs the language list | P1 | Merge into one search with the list on the page, after the P0 data fixes. If you want it sooner, put the search box above the boxes now (an hour). Add a **"Your languages"** row at the top: filled automatically from the languages someone starts projects in, seeded on a first visit from the browser's languages, with a ☆ in the list to pin and × to remove (per browser, no settings screen). About a day with the merge. |
| 62 | Tutorial length | P1 | A 10-step core tutorial (draw two letters, try them, export) with progress shown; the rest as short tours offered where they apply. |
| 65 | Plain names on beginner screens | P1 | Character Grid → Letters; Positioning → Accents (Joining for Indian scripts); Creator Studio → Make a picture; Character Behavior → Advanced: OpenType rules; Detach → Draw this letter myself; Latin Letters → Letters; Punctuations & Others → Punctuation & symbols. |
| 66 | Help rewrite | P1 | Short beginner guide (first font in 5 steps, using your font, keeping your work safe, questions) plus a "For script builders" section with today's material, corrected. Needs your Tamil review. |
| 67 | English written into the code (about 140 strings) | P1 | Move them all into `locales` in one pass; then your Tamil review. |
| 69 | More interface languages | P2 | Hindi first, after the beta, with a translator. |
| 75 | `$` or `@` for groups in the rules screens | P2 | `@`, as in OpenType feature code. |
| 91 | Which new features, in which order | P2 | WOFF2 and a version/licence picker first (small), then the words-while-drawing strip, a quick-font start, Light/Regular/Bold from one drawing, and the paper sheet + photo last (biggest). |

---

## The full list

### Wrong output in ready-made scripts

| # | Item | Sources | Priority | Ease | Your input | Recommendation |
|---|---|---|---|---|---|---|
| 1 | Gurmukhi suggests every sign upside down | S23 | P0 | S | Yes | See decisions |
| 2 | Thai: tone mark on an upper vowel lands on top of it; guide font is Lao's | S25, S22 | P0 | S | – | Copy Lao's `liga` block; point the guide font at Noto Sans Thai |
| 3 | Lao ຽ is a zero-width sign, overlapping the next letter | S24 | P0 | S | – | |
| 4 | Devanagari ि stands apart from its letter; ं on ो sits high | S26 | P0 | S | – | |
| 5 | Kannada ra sign ್ರ shown before the consonant | S27 | P0 | S | – | Move from `pref` to `blwf` |
| 6 | Ready-made sets lack letters: Punjabi ਓ, Macedonian ѕ, Kazakh/Uzbek ғ һ… | S28 | P0 | M | – | ਓ and ѕ first |
| 7 | Everyday punctuation missing: ¡ ¿ (Spanish), « » (French, Russian…) | S17 | P0 | S | – | |
| 8 | Sample texts have stray `\"` in ten languages; Hindi, Punjabi, Kannada, Thai, Lao have no sentence | F21 | P0 | S | – | Use the UDHR sentences already in `data/languages.json` |
| 9 | Data tidying: undefined glyphs, misclassified signs, `、` in Telugu | S2, S9–S14, S18–S21 | P1 | M | – | The scripts already export correctly |
| 10 | Malayalam Traditional has never been tested end to end | today | P0 | M | – | I run it; hold it back from the beta if it fails badly |
| 11 | "IAST" tile is a code, not a language | UX §1 | P1 | S | – | "Sanskrit in English letters", IAST underneath |
| 12 | Japanese ゛ ゜ sit a little too far right | today | P2 | S | – | |
| 97 | Kannada ಕ್ಷೊ and ಕ್ಷೋ come out as ಕೆ + ೂ + ಷ ottu (already wrong before; found while tidying the data, row 9) | 15 Nov | P1 | M | – | Needs a new kind of rule (a split vowel sign around a joined letter) |
| 98 | Gurmukhi ੋ and ੌ are set up as signs that take their own space, not as signs that sit on the letter | 15 Nov (row 9) | P0 | S | Yes | Decide together with row 1 (ੇ), since they share its top part |
| 99 | Malayalam ോ is set up as a sign that sits on the letter but has its own width | 15 Nov (row 9) | P2 | S | – | Check against the guide font and a native reader |

### Drawing and building letters

| # | Item | Sources | Priority | Ease | Your input | Recommendation |
|---|---|---|---|---|---|---|
| 13 | A pen stroke starting on a spacing line moves the spacing instead | D16, F (Hindi क) | P0 | M | – | Spacing lines move only from a handle |
| 14 | Tips open while drawing and eat strokes; a grid tip's dark overlay blocks every click; tips stack up; a tip can open off screen | U14, UX §3–4, F16, Persona A | P0 | M | – | No tips while drawing; no blocking overlays; Test/Export tips on the grid |
| 15 | Telugu letters built from parts come out with their parts apart | K22 | P0 | M | – | |
| 16 | An accent on an already-accented letter can't be finished (Greek ΐ ΰ, IAST) | K19 | P0 | M | – | Same fix as 28 |
| 17 | "Starting point" letters (ஆ from அ) look finished when they aren't | UX §5, Beginner | P1 | M | – | Mark "Finish me"; don't count as done until edited |
| 18 | Photo tracing has no button (removed by accident) | F4 | P0 | S | – | "From a photo" in the toolbar |
| 19 | With the "Incomplete" filter on, finishing a letter strands you | F34 | P0 | S | – | Same fix as K1 |
| 20 | No "fit" or reset view after zooming; after Clear a built letter's top can be out of view | F39, K24 | P1 | S | – | |
| 21 | The Curve tool needs a gesture nobody explains | F38 | P2 | S | – | |
| 22 | The pen's icon looks like "compose"; Edit has the pencil; search looks like Zoom In | F17 | P1 | S | – | |
| 23 | Eraser as wide as the pen; Slice makes 80-point strokes | F40 | P2 | M | – | (Traced shapes filling the full height: fixed with the new photo tracer, 14 Nov) |
| 24 | 18 uncaught errors with a filter on and a letter open | F41 | P1 | M | – | |
| 25 | Deleting a letter others are built from: stray "0" in the dialog, accented letters left stranded | F36 | P1 | S | – | |
| 26 | Donation bar covers the canvas while drawing | UX §4 | P0 | S | Yes | See decisions |
| 100 | A "Finish me" letter (ஆ started from அ) doesn't say in the drawing screen what to add; only its card's tooltip does | 15 Nov (row 17) | P1 | S | – | A one-line hint in the editor: "Started as a copy of அ. Add what makes ஆ different." |

### Spacing

| # | Item | Sources | Priority | Ease | Your input | Recommendation |
|---|---|---|---|---|---|---|
| 27 | Five unexplained steps; suggestions are exported whether accepted or not; after auto-spacing every pair stays listed | U16, F5, U19, M4 | P0 | M | Yes | See decisions |
| 28 | Tamil spacing can never pass 36% (built letters hidden from spacing) | K20 | P0 | M | – | Count a built letter as ready when its parts are |
| 29 | Sinhala has no suggested pairs: 6 minutes to space, then 95 s per build | K25 | P0 | M | – | Generate suggested pairs, as Kannada and Devanagari have |
| 30 | The Spacing screen says "kerning" (about 50 strings) | U18 | P0 | S | – | "Auto-space", "pairs spaced", "Add pair" |
| 31 | Default spacing 2–4× looser than the guide fonts | K23 | P1 | S | Yes | See decisions |
| 32 | Letter and word spacing hidden in Settings → Metrics | U22 | P1 | M | – | Two sliders on the Spacing screen |
| 33 | Auto-spacing can't be cancelled | F43 | P1 | S | – | |
| 34 | Accepting a big placement rule takes 16 pages | K21 | P1 | S | – | "Accept all N" |
| 35 | Small details: page counts disagree; only the right letter drags; a zero pair counts as done | F46 | P2 | S | – | |

### Accents and joined letters

| # | Item | Sources | Priority | Ease | Your input | Recommendation |
|---|---|---|---|---|---|---|
| 36 | "Accept all" for auto-made letters is hidden in a filter | U20 | P0 | S | – | "Accept auto-generated (n)" next to the progress bar |
| 37 | Placement shows internal names ("CONSFUSED"); Leader / Synced / Exception | F19 | P0 | S | – | Add the 6 labels now; plain words for the rest later |
| 38 | "Perfect Alignment!" on every open; celebration buttons don't go where they say; "Engineering Complete!" | F6, F44 | P0 | S | – | Store "celebrated" in the project, per milestone |
| 39 | Three near-identical ways to undo a pair | F20 | P2 | S | – | |

### Naming, exporting and using the font

| # | Item | Sources | Priority | Ease | Your input | Recommendation |
|---|---|---|---|---|---|---|
| 40 | Renaming the project doesn't rename the font; every new font has an internal name ("RomanSimple Medium"); file names drop non-English letters; the time in the file name is UTC (an export at 00:20 in Berlin is named 23:20 the day before) | F1, F12, F25, UX §2, M10, Persona A | P0 | M | Yes | See decisions |
| 41 | Export warning is vague ("issues"), red "Export Anyway", Escape doesn't close it | UX §8 | P0 | S | – | "95 letters aren't drawn yet…" with "Export what I have" / "Keep drawing" |
| 42 | No "how do I use this font?" after export | UX §8, M5, Beginner | P0 | M | – | A "Use your font" card: Windows, Mac, Word, Canva, phone, web |
| 43 | Undrawn letters look drawn on Test and Creator; Test opens with nothing drawn | UX §7, F23, Persona A | P1 | M | – | Grey or boxed missing letters, "90 letters not drawn yet" |
| 44 | Test page labels describe the code ("Font Testing Ground", "panel on the right") | UX §7, F22 | P1 | S | – | "Try your font" |
| 45 | Creator: a tip that can't be followed, unlabelled buttons, invisible watermark | F24, U15 | P2 | S | – | |
| 46 | Engineer's progress messages ("Applying Unicode CMAP patch…") | F26 | P1 | S | – | "Building your font…" |

### Saving and getting around

| # | Item | Sources | Priority | Ease | Your input | Recommendation |
|---|---|---|---|---|---|---|
| 47 | Work lives only in the browser; the backup is called "Export JSON" | UX §9, M7, P15 (part) | P0 | S | – | Ask to keep storage, "Download a backup", reminders |
| 48 | Cloud saving | P15 | P1 | L | Yes | See decisions |
| 49 | Five ways to save; Ctrl+S downloads a file | UX §9, F27 | P1 | S | – | |
| 50 | Loading another language's backup inside a project mixes them silently | F35 | P0 | S | – | Offer "Open as its own project" |
| 51 | Settings accept empty or impossible numbers, then export fails | F37 | P0 | S | – | Keep the last good value; "Reset to defaults" |
| 52 | Reloading goes back to the start screen | UX §9 | P2 | S | – | Reopen the last project |
| 53 | Messages, errors and Undo vanish after 3 s | F28 | P1 | S | – | Errors stay; Undo 10 s |
| 54 | The logo ("New Font") is the only way home, and asks about saving despite autosave | F13 | P1 | S | – | "My fonts" |

### Start page, tips and tutorial

| # | Item | Sources | Priority | Ease | Your input | Recommendation |
|---|---|---|---|---|---|---|
| 55 | The tutorial can't be restarted after "Exit" | F2 | P0 | S | – | |
| 56 | The interface language resets to English on reload | F7 | P0 | S | – | Remember it; start in Tamil on a Tamil browser |
| 57 | No "start here" (Hindi opens on Combining Signs); "ready" means every symbol | F3, M1, Beginner (Arjun) | P0 | M | Yes | See decisions |
| 58 | "Select a Script" heading; "Other ways to start" sits above the tiles | F10 | P1 | S | – | Goes with 59 |
| 59 | Script boxes and the new language list overlap | today | P1 | M | Yes | See decisions |
| 60 | Telugu opens an unexplained variant question | F11 | P1 | S | – | |
| 61 | Card colours and badges have no key | F14 | P1 | S | – | "To draw / made for you / done" |
| 62 | Tutorial is about 90 steps with no progress; calls grey lines "yellow" | F29, F18 | P1 | M | Yes | See decisions |
| 63 | Help and About don't cover the whole screen | UX §1 | P0 | S | – | |
| 64 | "Test Cases" and "Debugging Tools" shown to everyone | F33, M13 | P1 | S | – | Development builds only |

### Words, help and translation

| # | Item | Sources | Priority | Ease | Your input | Recommendation |
|---|---|---|---|---|---|---|
| 65 | Type-designer words on beginner screens (glyph, LSB, kerning, Latin…); English in brackets in the Tamil interface ("ஒளி (Light)", "இருள் (Dark)", "குர்முகி (Gurmukhi)", "நகர்த்து (Pan)") | UX §3, Beginner §3 and §6, Persona A | P1 | M | Yes | See decisions |
| 66 | Help speaks to experts, is out of date, and lists code names under Supported Scripts | U17, UX "help guide", F42 | P1 | L | Yes | See decisions; the Supported Scripts list (F42) is P0 and S on its own |
| 67 | About 140 English strings written into the code (seen again 15 Nov: "Sources" and "Used In" in the drawing screen, "Deletion disabled for imported fonts", "Filter by name…" in the letter filter, "Pan" in brackets in the Tamil tool name) | F31, F52 | P1 | M | Yes | See decisions |
| 68 | Glyph Properties and Settings mix plain and expert words | UX §4, §10 | P2 | S | – | Expert fields under "Advanced" |
| 69 | Only English and Tamil interfaces | F9 | P2 | L | Yes | See decisions |
| 70 | Tamil for today's new strings | today | P0 | S | Yes | See decisions |

### Phone, keyboard and screen readers

| # | Item | Sources | Priority | Ease | Your input | Recommendation |
|---|---|---|---|---|---|---|
| 71 | Phone: 23 icon-only tools at 38 px; unlabelled back; English drawer label in Tamil | F30, Persona A | P1 | M | – | Five main tools with names, the rest under "More tools" |
| 72 | Letters can't be opened from the keyboard; dialogs ignore Escape and don't take focus | F32 | P1 | M | – | Fix once in `Modal` |
| 73 | Multi-select bar covers the editor header; shows a bare "0" | F15 | P2 | S | – | |
| 101 | Spacing pairs and Accents combinations can't be opened from the keyboard (letters in the grid can, since row 72) | 15 Nov (row 72) | P1 | S | – | Same as the grid: focusable cards, Enter/Space opens |
| 74 | Exporting from a phone never completed in the persona run | Persona A | P0 | S | – | I re-run it |

### Expert screens (rules)

| # | Item | Sources | Priority | Ease | Your input | Recommendation |
|---|---|---|---|---|---|---|
| 75 | `$name` in one screen, `@name` in another for the same thing | F49 | P2 | S | Yes | See decisions |
| 76 | Deleting a lookup or group asks nothing; rules then vanish from the export silently | F50 | P1 | S | – | Confirm, and list what uses it |
| 77 | Code words (`topLeft`, "@PosGroup", "x"/"y" only) | F51 | P2 | S | – | |
| 78 | Import and add confusions (three names for added groups; WOFF2 promise) | F45 | P2 | S | – | |
| 79 | "Positioning Rules" back button says "Cancel" | UX "Expert tools" | P2 | S | – | |

### Speed and hosting

| # | Item | Sources | Priority | Ease | Your input | Recommendation |
|---|---|---|---|---|---|---|
| 80 | Start page downloads 9 MB; export depends on three outside sites | F8, F48 | P0 | M | Yes | See decisions |
| 81 | Start page reads every saved project in full | F47 | P2 | S | – | A small index |

### Release tasks (not in any review)

| # | Item | Sources | Priority | Ease | Your input | Recommendation |
|---|---|---|---|---|---|---|
| 82 | Safari, Firefox, iPad and phone never tested | today, F "not checked" | P0 | M | Yes | See decisions |
| 83 | Credits for CLDR, UDHR and Noto (OFL) in About | today | P0 | S | – | |
| 84 | No licence file for the app | F "documents" | P0 | S | Yes | See decisions |
| 85 | No way for beta users to report problems | today | P0 | S | Yes | See decisions |
| 86 | Today's work is unreviewed and uncommitted | today | P0 | S | Yes | See decisions |
| 87 | Persona runs B (Arjun, Hindi) and C (Priya, English to Canva) never done | Persona | P1 | S | – | |
| 88 | No real person has used it yet | Beginner §7 | P0 | M | Yes | See decisions |
| 89 | Out-of-date documents (README, TESTING, TRANSLATION, CONTRIBUTING, data_flow, data_structure) | F "documents" | P1 | S | – | |

### Found by the persona runs (15 November)

| # | Item | Sources | Priority | Ease | Your input | Recommendation |
|---|---|---|---|---|---|---|
| 102 | Test page names a whole joined letter as missing ("स्ते") instead of the parts that aren't drawn (्, त, े) | Persona B | P1 | S | – | List the undrawn parts |
| 103 | Changing the pen thickness in Settings re-thickens every letter already drawn, with no warning (l's stem 38 → 75). Trying for a bold font this way then exports under the same name and replaces the regular font when installed | Persona C | P1 | S | – | Ask first ("Make all 26 drawn letters thicker too?"); bold itself is row 95 |
| 104 | Export warning counts things that involve undrawn letters ("2020 accents or joined letters haven't been checked" with 3 Hindi letters drawn) | Persona B | P2 | S | – | Count only what's drawn |
| 105 | "1 letters" on the Test page | Persona B | P2 | S | – | |
| 106 | Footer says "© 2027", written into the code | Persona C | P2 | S | – | Use the current year |
| 107 | An empty licence goes into the font as a single space | Persona C | P2 | S | – | Leave it out when empty |
| 108 | The header shows "Devanagari" under the project name where a Hindi speaker expects "Hindi" | Persona B | P1 | S | – | Show the language the project was started in |
| 109 | Tamil Test page title wraps to three lines on a phone | Persona A | P2 | S | – | |
| 110 | Spacing and the editor re-measure every built letter after each saved stroke, in up to four places at once; slow for big sets (Tamil, Devanagari) | Code review 15 Nov | P2 | M | – | One shared result, rebuilt only for the letters an edit affects |
| 111 | **Importing a font messes up its OpenType rules** (your report, 16 Nov). To check: import fonts with real GSUB/GPOS (Noto Sans Tamil, Kannada, Devanagari, a Latin font with kerning and mark positioning), export without changes, and compare the rules and shaping before and after (HarfBuzz on the same text; tools/font/fea-dump.ts for the generated feature code). Find what's lost or changed: lookups, contextual rules, mark classes, kerning classes, feature/script/language tags | You, 16 Nov | P1 | M | – | Measure first, then fix what breaks; report a list of what import keeps, changes and drops |
| 112 | On a phone in Tamil, the grid's progress line ("476/478 … (100%)") overlaps the "What do these mean?" link | 16 Nov (row 81 check) | P2 | S | – | |
| 113 | Tour tips from the new tutorial open on the grid and over the header without being asked (seen by the start-page check) | 16 Nov (row 81 check) | P1 | S | – | Tours should start only from Help → Tours or at the place they belong, once |

### Features (after the beta)

| # | Item | Sources | Priority | Ease | Your input | Recommendation |
|---|---|---|---|---|---|---|
| 90 | Version number and licence picker at export. Today every export says "Version 0.1" in its name table but 1.0 in `head`, and its unique ID has no version, so re-installs are unreliable | M10, Beginner, checked today | P1 (version: do with 40, before the beta) | S | – | Version stored in the project, starting at 1.000, raised by 0.001 on every export and editable in Settings; written consistently to name ID 5, `head.fontRevision` and name ID 3; used in the file name instead of the timestamp |
| 91 | Choosing and ordering the features below | M1–M13, Beginner §5 | P2 | – | Yes | See decisions |
| 92 | WOFF2 and TTF export | M11, UX "amateur" | P2 | S | – | |
| 93 | See the letter in words while drawing | M3, Beginner §5 | P2 | M | – | |
| 94 | Quick font: draw only the letters you need first | M1 | P2 | M | – | |
| 95 | Light / Regular / Bold from one set of drawings; alternates; pre-export check; clean-up tools; pen pressure; size waterfall | M6, M8, M9, M12, UX | P2 | L | – | |
| 96 | Paper sheet + one photo, cut into letters (**Tamil first**, as you asked on 14 November) | M2, F4, you | P2 | L | – | **Print:** a PDF writing sheet: boxes with the letter printed small in the corner, faint coloured lines for the letter's bottom and top, ◌ for vowel signs, four corner squares and a dot code for the page ID; fits A4 and US Letter, still works when scaled down; drawn in the browser so Tamil renders correctly, without a PDF library. Tamil needs 55 boxes (9 vowels, 25 consonants with Grantha and க்ஷ, 11 signs, 10 u/uu letters such as கு and கூ): 2 pages, with an optional third for numerals and symbols. **Scan:** a phone photo or scan per page; find the corner squares, straighten, read the page ID, cut out each box, trace it with the new photo tracer, ignoring the printed lines. Letters keep their true size and position (் and ா relative to க), because the box lines map onto the drawing lines. **Review:** a grid of every traced letter with keep / retrace / skip; empty boxes skipped; asks before replacing letters already drawn; added through the same route as "import glyphs". Keep the sheet and scan parts independent of the language, so other languages only need their letter list. About a week, including tests on simulated tilted, shadowed and scaled photos |

Code clean-up (unused files, leftover `console.log`, the cascade worker's drifted copy of the letter-assembly code, `RulesPage` never reporting unsaved changes) is P2, S, no input; listed under "Technical notes" in FUNCTIONALITY_REVIEW.md.

---

## Suggested order for the P0 rows

About a week and a half of work, plus your decisions and the user sessions.

1. **Quick fixes (1 day):** 2–8, 18, 19, 36–38, 41, 47, 50, 51, 55, 56, 63, 83, and the Supported Scripts list from 66.
2. **Bugs that need care (3 days):** 1, 13–16, 28, 29.
3. **Your decisions, then build them (2–3 days):** 40, 27 with 30, 57, 26, 80.
4. **Release (1–2 days):** 10, 74, 82, 70, 84, 85, then code review, commit and deploy (86).
5. **Beta:** user sessions (88), then the P1 rows by what people actually hit.
