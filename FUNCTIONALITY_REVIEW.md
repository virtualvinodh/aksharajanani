# Functionality review: what a beginner and an amateur font maker run into

*Aksharajanani · 11–12 November 2026 · branch `claude` at `7e896d3` · reviewed by Claude*

A review of the whole app, done independently of `UX_REVIEW.md`, in two passes. It has 52 findings, nearly all of them missing from both `UX_REVIEW.md` and `REVIEW_ISSUES.md`. Ten are worth fixing before anyone outside sees the app, and most of those are small. F1–F33 come from the first pass; F34–F52 from the second, which read the rest of the code and tested the flows the first one skipped.

**Contents:** [The short version](#the-short-version) · [What was checked](#what-was-checked) · [Fix first](#fix-first) · [Findings by step](#findings-by-step) · [Second pass: further findings](#second-pass-further-findings) · [Missing and improved functionality](#missing-and-improved-functionality) · [For the amateur font maker](#for-the-amateur-font-maker) · [Corrections to UX_REVIEW.md](#corrections-to-ux_reviewmd) · [Documents out of date](#documents-out-of-date) · [Suggested order](#suggested-order)

---

## The short version

The drawing-to-font path works. In my runs nothing crashed. The browser console stayed clean except in one case (F41). What a newcomer trips on is mostly at the edges of that path:

1. **The font isn't called what you named it.** Rename the project "Amma Handwriting", export, install: the font shows up in Word as "RomanSimple Medium". Every English font anyone makes has that same name.
2. **The tutorial can't be started again** once "Exit Tutorial" has been pressed, even by accident on its first step.
3. **A Hindi beginner's first screen is "Combining Signs"**, 0 of 248 characters, and then 0 of 1,944 pairs to place. Nothing says which letters to start with.
4. **Photographing your handwriting, the feature the tagline suggests, has no button.** The image tracer is still in the code, but the toolbar button was removed.
5. **Spacing suggestions go into the exported font whether or not you press Accept**, so the "to review" state on screen doesn't mean what it looks like.
6. **"Perfect Alignment!" pops up every time a finished project is opened.**
7. **The interface language goes back to English on every reload.**
8. **The start page downloads about 9 MB** before the visitor has clicked anything.
9. **Working through the "Incomplete" filter strands you after every letter.** The letter you just finished leaves the list, and Previous and Next both go grey.
10. **Loading a backup inside an open project can put English letters into a Tamil project** and report success.

Everything below has a note on how it was checked. Severity uses the same scale as `UX_REVIEW.md`: **Blocker** stops or misleads, **High** costs work or trust, **Medium** confuses, **Low** is polish.

---

## What was checked

**Documents, read in full:** all 13 Markdown files (`README`, `CONTRIBUTING`, `TESTING`, `TRANSLATION`, `REVIEW_ISSUES`, `UX_REVIEW`, `data_flow`, `data_structure`, the four `*_json.md` guides, `virtual_characters`, `tools/README`), plus all the English text the app shows (`locales/en.json`, the Help guide and the tutorial).

**Code, read in full (first pass):** the start screen, app shell and header, the character grid and cards, the drawing editor (header, workspace, toolbar, selection toolbar, canvas drawing code, pen tool, shortcuts), the placement screens (page, rule block, editor header), the Spacing screens (workspace, page, pair list, pair editor header, spacing state), Test, Creator, Settings, the phone drawer, tips and tutorial (all four files), celebrations, export, saving, project actions, progress counting, dialogs and notifications, language and theme.

**Code, read in full (second pass):** project loading and the browser database; letter actions (save, delete, the linked-letter cascade); the edit session and letter construction; multi-select; filters; every other drawing tool (select, edit points, eraser, curve, shapes, slice, pan) and the copy, paste and transform code; the Properties panel; all the placement code (page, grid, rules view, editor, canvas, toolbar, related-pairs strip, the three placement hooks, the placement service); all the Spacing code (editor, canvas, toolbar, the two spacing services and the worker); the command palette, Compare, every import and add dialog, the photo tracer, snapshots, Save Copy, Help, About, Test Cases; the font-building side (`fontBuilder`, `fontService`, `feaService`, `pythonFontService`, `importFontService`, the three workers, the drawing and stroke helpers); both rules editors and everything under `components/rules/`; the Settings tabs; and the remaining state containers. To fit them in, I read most of these with styling and import lines stripped out.

**Not read line by line:** `types.ts`, `constants.tsx`, `index.css`, a handful of small helpers (`geometryUtils`, `pathUtils`, `undoHelpers`, `cloneUtils`, `optionalFetch`, `domUtils`, `legacySettings`, two scrolling hooks, two small Creator inputs), the unit tests, and the scripts under `tools/` and `scripts/` apart from the end-to-end runner. Four files were read only in part, in the first pass: `DrawingCanvas`, `useDrawingCanvas`, `settings/GeneralSettings` and `LocaleContext`. Together I estimate that as roughly a tenth of the 48,600 lines.

**Data:** all 20 scripts counted and cross-checked by script (characters per script, how each is made, group labels, sample texts), not read by eye.

**The running app** (headless Chromium, 1440×900 and 390×844): start screen in light, dark and phone width; first run with tips on; English, Hindi and Tamil projects; the tutorial; drawing; Properties; the placement workspace and editor; Spacing; Test; Export (the exported font opened and its name read); every header menu; command palette; multi-select; Compare; Settings; the rules editor; the four "other ways to start"; the Tamil interface; reopening projects after a reload. I also looked at the screenshots from your eight end-to-end runs.

**Added in the second pass (headless Chromium, 1440×900):** every drawing tool, with undo, copy and paste, grouping and Clear; grid filters with a letter open; deleting a letter that others depend on; snapshots; Save Copy; project file export and load, from the start screen and from inside another project; Spanish accents through to an exported font; Import Font with a font the app made; adding a character; Help; the rules screens for Hindi; emptying the Metrics boxes and exporting; exporting with nothing drawn.

**Not checked:** a real phone or tablet, a stylus, Safari or Firefox, a screen reader, the full 90-step tutorial, importing a WOFF2 font or a font from another tool, adding and exporting a hand-made OpenType rule, how long auto-spacing takes on a large project, the quality of the Tamil wording. A script is also not a beginner, so the caveat in `UX_REVIEW.md` holds here too.

Screenshots and the scripts that made them are in `tools/out/functionality-review/` (ignored by git); the second pass is in its `pass2/` folder.

---

## Fix first

| # | Finding | Severity | Effort |
|---|---|---|---|
| F1 | Renaming the project doesn't rename the font | High | ½ day |
| F2 | The tutorial can't be restarted | High | 15 minutes |
| F3 | No "start here": Hindi opens on Combining Signs, 248 characters | High | ½–1 day |
| F4 | Photo tracing has no button | High | 1 hour |
| F5 | Unaccepted spacing suggestions are exported anyway | Medium | decision + ½ day |
| F6 | "Perfect Alignment!" on every open | Medium | 1 hour |
| F7 | Interface language resets on reload | Medium | 15 minutes |
| F8 | 9 MB download on the start page | Medium | ½ day |
| F34 | "Incomplete" filter: Previous and Next go grey after each letter | High | 1 hour |
| F35 | Loading a backup inside a project mixes languages silently | High | 2 hours |

Close behind these, all quick: the stray "0" and the stuck accents when deleting a letter (F36), Settings accepting empty numbers (F37), and the code names in Help (F42).

---

## Findings by step

Each finding says how it was checked: **seen** (in the running app), **read** (traced in the code), or **measured**.

### 1. Arriving

**F8 · Medium · The start page downloads about 9 MB before anyone clicks** (measured)
- Opening the start page fetched 9.1 MB from other sites in 28 requests. About 7.9 MB of that is the font compiler (Pyodide, the Python standard library, lxml, fontTools); the rest is one guide font per language tile.
- It starts on page load (`components/AppContainer.tsx` 45–47), so someone on mobile data pays for it just to look.
- *Suggestion:* start the compiler download when a project is opened, or at the first Test or Export, and show "Getting the font builder ready…" then. Load tile fonts only for tiles on screen.

**F7 · Medium · The interface language goes back to English on every reload** (seen)
- Chose தமிழ், reloaded, the selector was back on English. The choice is kept only in memory (`contexts/LocaleContext.tsx` 34) and the browser's own language isn't looked at.
- *Suggestion:* remember the choice (as the theme already is), and start in Tamil for a browser set to Tamil.

**F9 · Low · Only English and Tamil, though eighteen other languages are offered as fonts**
- A Hindi, Malayalam or Telugu speaker gets an English interface. `TRANSLATION.md` and `data_structure.md` list ten interface languages; two exist.
- *Suggestion:* not urgent, but Hindi would cover the largest group. Fix the documents either way.

**F10 · Low · "Select a Script" and "Other ways to start" sit above the language tiles**
- The heading says "Script" while the tiles carefully say languages. Above the tiles, the first choices a newcomer reads are "Build from Unicode Blocks" and "Create Custom Project".
- *Suggestion:* "Choose your language"; move "Other ways to start" below the tiles.

### 2. Starting a project

**F11 · Medium · Telugu opens a question with no explanation** (seen)
- Clicking Telugu shows "Configure Variants for Telugu" with one unlabelled choice, "క్ర/క", and two radio buttons showing small glyphs. Nothing says what is being chosen or that either answer is fine.
- *Suggestion:* a plain title ("Which shape do you write?"), one sentence, bigger samples in the guide font, and the usual one preselected with "you can change this later" (if that's true).

**F12 · Medium · Every new font has the same name, and nothing asks for one** (seen)
- Two English projects started one after the other both appear as "RomanSimple" under Recent Projects, told apart only by the time. The delete button is invisible until the mouse is over the card (long-press on touch).
- *Suggestion:* see F1 for the name. Show the delete button (or a ⋮ menu) on the card always.

**F13 · Medium · The logo is the only way home, and it's labelled "New Font"** (seen)
- To get back to your list of fonts you click the logo, whose tooltip says "New Font". Clicked within a second or two of an edit, it asks "You have unsaved changes. Do you want to save your project before starting a new font?" with "Start New without Saving", although autosave is on. After three seconds the same click goes straight through.
- *Suggestion:* call it "My fonts" (or Home). With autosave on, just save and go.

### 3. The character grid

**F3 · High · Nothing says where to start, and "ready" means everything** (seen, counted)
- Hindi, Punjabi, Malayalam, Telugu, Kannada and Sinhala all open on **"Combining Signs"**: vowel signs on dotted circles, the hardest thing to draw without context. A learner expects अ आ इ first.
- The progress bar counts every character, and the "your font is ready" moment only comes at 100%. For English that includes 38 punctuation marks and symbols (`{ } ~ ^ ₹` …) on top of the 52 letters and 10 digits.
- The amount of work, as the app counts it:

| Language | To complete | Drawn by hand | Language | To complete | Drawn by hand |
|---|---|---|---|---|---|
| English | 100 | 100 | Hindi | 248 | 156 |
| German | 109 | 103 | Tamil | 238 | 133 |
| Spanish | 119 | 104 | Malayalam | 220 | 193 |
| Greek | 119 | 99 | Kannada | 478 | 113 |
| Portuguese | 134 | 107 | Sinhala | 594 | 141 |
| French | 139 | 106 | Telugu | 614 | 135 |
| Cyrillic | 169 | 140 | Malayalam Traditional | 1,258 | 403 |

- Hindi then shows "0/1944 pairs positioned" on its second tab.
- Only 8 characters in all the data are marked optional, all in Tamil.
- *Suggestion:* put vowels and consonants first in every script (data only). Split each script into "the letters you need" and "extras", count the first group for "ready", and say so: "Draw these 52 letters to get a working font. Add digits and punctuation when you like."

**F14 · Medium · Card colours and badges have no key** (seen)
- A Hindi grid shows grey dashed, yellow dashed, blue dashed and solid borders, plus four small corner badges. The only explanation is one tip about dashed borders, shown once.
- *Suggestion:* a small "What do these mean?" key next to the progress bar, with three states in words: to draw, made for you (check it), done.

**F15 · Low · Multi-select covers the editor's header** (seen)
- With a letter open in the split view, turning on multi-select puts the selection bar over the editor's Back button and title. The bar also shows a bare "0" next to Copy (the clipboard count).
- *Suggestion:* keep the bar over the grid side only; label the count or hide it at 0.

**F16 · Low · A tip can open half off the screen**
- In your Tamil end-to-end run (`tools/e2e/out/tamil/FAILED.png`) the "Pending Characters" tip is cut off at the left edge: it's attached to a card that had scrolled out of view.
- *Suggestion:* only show a tip when its target is on screen. This is the same tip `UX_REVIEW.md` reports as blocking the grid.

### 4. Drawing

**F4 · High · Photo tracing is in the code but has no button** (read, git history)
- The tracer (file picker, dialog, "Insert as Vector Path") is still wired up in `DrawingModal`, and D1 and D2 fixed it recently. But `DrawingToolbar` receives `onImageTraceClick` and never uses it. The button was removed in `497c031` (5 Dec 2025, "Remove unused import and component"), which looks accidental.
- This is the closest thing the app has to "write on paper, take a photo". The tagline makes people expect exactly that.
- *Suggestion:* put the button back, labelled "From a photo". Longer term, a photo of a whole sheet of letters would be the feature that best fits the tagline.
- **Correction and fix (14 November):** the removal was deliberate: the tracer produced unusable traces. Measured on eleven test photos:
  - letter holes came out filled;
  - shadows left hundreds of specks;
  - the background colour came from one corner pixel;
  - outlines were ragged, with up to 975 segments;
  - traces were stretched to full height.

  The tracer is rewritten (`services/imageTracerService.ts`): it evens out the light, cleans up specks and ruled lines, zooms in on small letters, traces smooth outlines and places the result over the guide letter. The camera button is back in the drawing toolbar.

**F17 · Medium · The pencil isn't the pen** (seen)
- In the toolbar, the pencil icon is "Edit" (move points). The pen, the tool everyone needs, is a square with a pencil in it, the usual "compose" icon. In the header, search uses a magnifier with a plus, the same picture as Zoom In in the toolbar.
- *Suggestion:* pencil for the pen, a point-on-a-curve icon for Edit, a plain magnifier for search.

**D16, more evidence · A natural Hindi stroke moves the spacing** (seen)
- Drawing क: the stem first, then the loop starting from the stem. The second stroke started on the left spacing line, which sits on the stem, and dragged the spacing to −125 instead of drawing. Any letter whose strokes branch from its leftmost stem will do this, which is most of Devanagari.

**F18 · Low · The tutorial calls the spacing lines yellow**
- "These yellow dashed lines are the Side Bearing guides" (`locales/tutorial/en.json`, `explainBearings`). They are grey since the monochrome theme.

### 5. Accents and joined letters (placement)

**F19 · Medium · The placement screen shows internal names** (seen)
- In Hindi the first rule block is labelled **"CONSFUSED"** and "1 MARKS". The label is the group's internal id when no translation exists (`components/positioning/PositioningRuleBlock.tsx` 192–198). Six ids have none: `consFused`, `aboveMarks`, `spacingMarksRight`, `consAll`, `nonSpacingOttus`, `uUCons`, across Hindi, Punjabi, Lao, Telugu and Thai.
- The rest of the screen says "Rule Details", "Leader", "Synced", "Exception", "Related Pairs", "Components". For Hindi this is step 2 of the main path, not an expert corner.
- *Suggestion:* add the six labels now ("Letters with a joined stem"…). Then plain words: "This placement is shared with 12 similar letters" in place of Leader/Synced, "Place this one separately" in place of Exception.

**F6 · Medium · "Perfect Alignment!" appears every time the project is opened** (seen)
- With all pairs placed, the full-screen celebration came back on each of two reloads. The "seen" flag is kept in memory only (`contexts/LayoutContext.tsx` 128; `components/CelebrationManager.tsx` 67–87). The Spacing celebration works the same way.
- In the same test it fired with 7 of 60 characters drawn, and its button says "Next: Kerning" while the tab says Spacing. When it is the last milestone its title is "Engineering Complete!".
- The drawing celebration has the opposite problem (read, not run): its flag is one browser-wide key, so a person's second font never gets "Font ready".
- *Suggestion:* store "celebrated" in the project, per milestone. Hold the placement celebration until drawing is done.

**F20 · Low · Three near-identical ways to undo a pair**
- A pair's ⋮ menu offers Reset and a red "Delete"; Spacing adds "Ignore". In the placement and Spacing workspaces Delete does nearly the same as Reset (read).
- *Suggestion:* one "Reset" there; keep "Ignore" for Spacing with a line saying what it does.

### 6. Spacing

**F5 · Medium · Suggestions are exported whether you accept them or not** (read)
- Export and Test build the font from the suggestions first and the accepted values on top (`hooks/actions/useExportActions.ts` 162–168). So after Auto-kern, the dashed "to review" pairs are already in the font. The only way to keep a bad suggestion out is "Ignore", in the pair's ⋮ menu.
- Progress, the tab's tick and the export warning count only accepted pairs, so the screen says "not done" about spacing that is in fact applied.
- This matters for U16: two of its five steps (go to Suggestions, press Accept) change nothing in the font.
- *Suggestion:* pick one rule. The simpler one for beginners: auto-spacing applies straight away, with Undo, and "Accept" disappears. Then "Space all letters automatically" is one click.

### 7. Trying the font

**F21 · Medium · The sample text has stray backslashes in ten languages** (seen, counted)
- The English Test page opens with `{ } \" ' @` and `\\\"Is this really all the digits?\\\"`. The sample files for English, Spanish, French, German, Portuguese, Greek, Cyrillic, Hebrew (29 lines), Tamil and old Tamil contain literal `\"`.
- Hindi, Punjabi, Kannada, Thai and Lao have no sample sentence at all; the Test page starts with a generated list of characters.
- *Suggestion:* clean the files; add one real sentence per language.

**F22 · Low · "The input box on the left… the panel on the right"**
- The two boxes are always stacked top and bottom (the page is a single column).

**F23 · Low · Test opens with nothing drawn**
- Export and Create say "No characters have been drawn". Test opens anyway and shows the sample in the browser's serif font.

**F24 · Low · Creator's tip can't be followed**
- "Pro Tip: Use transparent backgrounds for stickers" (`components/CreatorPage.tsx` 445). There's no way to make the background transparent: the picker only gives solid colours. The size slider has no label, and the "Made with Aksharajanani" mark is white, so it vanishes on a light background.

### 8. Exporting and using the font

**F1 · High · Renaming the project doesn't rename the font** (seen)
- Renamed a project "Amma Handwriting" with the pencil in the header and exported. The file was `Amma Handwriting_2026-11-11T22-32-01-105Z.otf`. Inside it, the family name was **RomanSimple** and the full name **RomanSimple Medium**.
- The header name is the project name. The font's own name is a separate field in Settings → Font Meta Data (`services/fontBuilder.ts` 429–430).
- Consequences: the person looks for "Amma Handwriting" in Word's font list and it isn't there. Two English fonts from the same person, or from two people, have the same name and replace each other when installed.
- All 20 scripts use the style name "Medium", which is why "Medium" appears after the name.
- *Suggestion:* one name. The header name is the font name unless someone sets a different one in Settings. Style "Regular". Ask "What should your font be called?" at the first export.

**F25 · Low · File names: a long timestamp, and non-English names become underscores** (seen, read)
- Every export is `Name_2026-11-11T22-32-01-105Z.otf`. Letters outside a–z and 0–9 are replaced (`useExportActions.ts` 57), so a project called அம்மா exports as `_____2026-….otf`.
- *Suggestion:* keep any letter or digit in any script; drop the timestamp or shorten it to the date.

**F26 · Low · Progress messages in engineer's words**
- "Applying OpenType features…" appeared as a toast when I opened Test. The same set of messages includes "Preparing Python environment…" and "Applying Unicode CMAP patch…".
- *Suggestion:* one message, "Building your font…".

### 9. Saving and getting around

**F27 · Low · Ctrl+S downloads a file** (seen in the second pass)
- With autosave on (the default), Ctrl/Cmd+S calls the same action as "Export JSON" (`App.tsx` 246–261). Someone who presses it by habit gets a `.json` in Downloads each time. With autosave off it saves normally.
- *Suggestion:* with autosave on, show "Saved" and nothing else. Offer the backup download by name.

**F28 · Medium · Messages disappear after three seconds, errors included** (read)
- Every toast, including errors and the ones with an Undo button, closes after 3 s (`components/Notification.tsx`). A long error can't be read in that time, and Undo for a deleted letter is gone before most people react.
- *Suggestion:* errors stay until closed; Undo stays 8–10 s.

### 10. Tips and tutorial

**F2 · High · The tutorial can't be restarted** (seen)
- Start tutorial → "Exit Tutorial" on the first step → back to the start screen → "Start tutorial" again. The second time, the tutorial project opens with no tutorial.
- "Exit" writes a permanent `tutorial_dismissed` flag (`components/tutorial/TutorialTooltip.tsx` 23) and nothing clears it. The banner "New here? Try the tutorial first." stays on the start screen and keeps leading nowhere.
- *Suggestion:* clear the flag when "Start tutorial" is pressed.

**F29 · Medium · The tutorial is about 90 steps, with no "step 12 of 90"** (read)
- It walks through every toolbar button one by one, then linking, unlinking, relinking, shared placement, exceptions and three Spacing tabs. The tooltip doesn't show progress, and a reload starts it again from step 1.
- *Suggestion:* a 10-step tutorial for the main path (draw two letters, try them, export), with the rest as separate short tours offered where they apply. Show progress.

### 11. Phone and tablet

**F30 · Medium · 23 unlabelled tool buttons, 38 px each** (seen, measured)
- At phone width the drawing toolbar is three rows of icon-only buttons, 38×38 px, below the 44 px usually recommended for touch. There's no hover on a phone, so the icons are the only explanation.
- The drawer's top has eight more icon-only buttons; one is the command palette, whose label is "Command Palette (Ctrl+K)".
- Good: no sideways scrolling, and the canvas uses the full width.
- *Suggestion:* on phones show the five or six drawing tools people need (pen, eraser, undo, redo, select) and put the rest behind "More tools", with names.

### 12. Translation

**F31 · Medium · At least 80 pieces of English are written into the code** (counted)
- 25 notifications, 28 tooltips and 31 placeholders are fixed English strings, and so is visible text such as "Detect new pairs", "Accept Suggestions", "Command", "Leader / Synced / Exception", "Studio", all three celebrations, several tips, "Debugging Tools" and five Settings switches.
- The main Tamil screens are well covered: on the start screen, grid, editor and Spacing I found only "Command", "Detect new pairs" and two tooltips in English.
- *Suggestion:* move them into `locales` in one pass; the list is easy to produce with a search.

### 13. Keyboard and screen readers

**F32 · Medium · Letters can't be opened from the keyboard, and dialogs ignore Escape** (read, seen)
- Character, pair and combination cards are plain `div`s with a click handler: no focus, no Enter, no role. A keyboard or screen-reader user can't open a letter.
- Escape did not close Help, Test, New Project, Unicode Blocks or Import Font. `Modal.tsx`, which the export warning and most other dialogs use, has no key handling and doesn't move focus into the dialog.
- The page language is always marked as English (`index.html`).
- *Suggestion:* make cards buttons; add Escape and focus handling once, in `Modal`.

### 14. Things only developers need, shown to everyone

**F33 · Low · "Test Cases" and "Debugging Tools"**
- More → Test Cases opens the 424-item QA checklist for testing the app itself. Settings → Editor Settings ends with "Debugging Tools".
- *Suggestion:* show both only in development builds or behind a URL flag.

---

## Second pass: further findings

Added on 12 November, after reading the rest of the code and testing the flows the first pass skipped. Numbering continues from F33.

### Things that lose or strand work

**F34 · High · With the "Incomplete" filter on, finishing a letter strands you** (seen)
- Set the grid filter to "Incomplete", open a letter and draw it. The letter is now complete, so it drops out of the filtered list while you are still in it. Both the Previous and Next arrows go grey and the letter vanishes from the side list. The only way on is Back. Screenshot `n01-filter-incomplete-after-draw.png`.
- "Incomplete" is the filter a beginner is most likely to work with, because it is the to-do list.
- Where: `components/UnifiedEditorModal.tsx` 115–126 looks the open letter up in the filtered list and gets −1. Spacing had the same bug (K1) and was fixed by remembering the last position.
- *Suggestion:* the same fix as K1: keep the last known position, so Next goes to the next unfinished letter.

**F35 · High · Loading a backup inside an open project mixes two languages without a word** (seen)
- In a Tamil project, Ctrl+K → "Load", pick an English backup file. The app says "Project loaded successfully!". The header then reads "RomanSimple / Tamil", and the project is saved as a Tamil project holding English letters.
- Where: `hooks/actions/useProjectLoad.ts` line 423 only stops files with no letter sets at all. The warning texts for this case exist (`mismatchedScript…`) and are never used.
- *Suggestion:* when the file is for another language, say so and offer "Open as its own project" as the main button.

**F36 · Medium · Deleting a letter that others are built from** (seen and read)
- Spanish: delete "a". The accented á stays in the grid, greyed, with the tooltip "To edit this, first draw: a", but there is no "a" card left to draw. `handleDeleteGlyph` (`hooks/actions/useGlyphActions.ts` 331–373) converts linked and copied letters that depended on it, and leaves base-plus-mark letters as they are.
- Multi-select delete (`useBatchOperations.handleBulkDelete`) doesn't look at dependents at all (read).
- The confirm dialog shows a stray "0" on its own line between the message and the buttons whenever nothing depends on the letter (`components/DeleteConfirmationModal.tsx` 44: `dependentCount && …` prints the 0). Screenshot `r03-delete-dialog.png`.
- The dialog says "permanently delete", but an Undo message follows. It lasts three seconds (F28).
- *Suggestion:* count base-plus-mark dependents too and name them in the dialog ("á, à and 4 more will stop working"); fix the 0 with `dependentCount > 0 &&`; drop "permanently".

**F37 · Medium · Settings accept empty and impossible numbers, and export then fails** (seen)
- Settings → Metrics: I emptied "Ascender" and typed 0 for "Units per em". Nothing objected, and the project autosaved like that. Export then stopped with "An error occurred during font generation: When creating a new Font object, unitsPerEm is required."
- Where: `components/settings/MetricsSettings.tsx`, `handleMetricsChange` stores an empty box as `undefined`; no minimum or maximum on any box.
- *Suggestion:* keep the last good value when a box is emptied, limit each box to a sane range, and add a "Reset to defaults" button on that tab.

### Drawing

**F38 · Medium · The Curve tool does nothing the way people will try it** (seen)
- One drag with Curve leaves no mark. It needs a drag for the straight line, then a move and a click to bend it. Nothing says so, there is no preview on touch, and a half-made curve stays in the tool if you switch away (`hooks/drawingTools/useCurveTool.ts`).
- *Suggestion:* show a one-line hint under the toolbar while Curve is active ("Drag a line, then click where it should bend"), or make it one gesture.

**F39 · Medium · No way back after zooming or panning** (seen)
- The drawing canvas has Zoom In, Zoom Out and Pan, and no "fit" or "reset view". After a few pinches a beginner has lost the letter. The placement canvas is the same (read), and on touch it has no pinch zoom at all.
- *Suggestion:* a "Fit" button next to the zoom buttons, and double-tap to fit.

**F40 · Low · Smaller drawing quirks** (seen)
- The eraser is exactly as wide as the pen, so it can't nibble. On a traced or imported shape it says "SVG elements cannot be erased".
- Slice turns a 3-point stroke into two strokes of 80+ points, which makes them heavy to edit afterwards.
- A traced photo and an imported SVG are always stretched to fill topline-to-baseline and centred, so a small mark such as a comma comes in as tall as a capital (`ImageTracerModal.handleInsert`, `useImportLogic.handleSvgImport`).

### Errors and loose ends

**F41 · Medium · 18 uncaught errors with a filter on and a letter open** (seen)
- With a grid filter active, opening a letter threw "Maximum call stack size exceeded" 18 times from the grid's layout code (react-virtuoso `gridLayout`, the flat grid squeezed into the narrow side panel). The screen kept working, so a user sees nothing, but it corrects my first-pass statement that the console stayed clean everywhere.
- *Suggestion:* use the list layout (not the grid) for the side panel when a filter flattens the groups.

**F42 · Medium · Help → "Supported Scripts" shows code names** (seen)
- The list has five raw entries: `scriptTutorialMessage`, `scriptGurmukhiMessage`, `scriptThaiMessage`, `scriptLaoMessage`, `scriptHebrewMessage`. Every real line ends "Full", and the entries are named by writing system, not by language.
- *Suggestion:* build this list from `scripts.json` so it can't drift, and name languages.

**F43 · Medium · Auto-spacing can't be stopped** (read)
- The progress dialog has no Cancel (`components/AutoKerningProgressModal.tsx`). "Select All" on Tamil is 36,828 pairs.
- *Suggestion:* a Cancel button that keeps what has been measured so far.

**F44 · Low · Celebration buttons promise more than they do** (read)
- "Finish & Export" and "One Last Test" only close the celebration (`CelebrationManager.handleProceed('final')`). The titles "Engineering Complete!" and "Visual Rhythm Mastered!… professional flow and balance" are a lot for a hobbyist's first font.
- *Suggestion:* make the buttons go where they say, and use plain titles ("All letters placed", "Spacing done").

**F45 · Low · Import and add: small confusions** (read; WOFF2 not tested)
- "Import from Project" lists saved projects by font name, not project name, so every renamed English project reads "RomanSimple" (`ImportGlyphsModal`). This is F1 showing up in a second place.
- Added letters land in three differently named groups: "Custom Glyphs" (command palette), "Custom_Glyphs" (quick add and import, a raw key) and "Imported" (font merge).
- "Add Block" puts the new characters into whichever group tab happens to be open. The block picker lists code ranges and no sizes.
- Import Font says "Supports TTF, OTF, WOFF" while the file picker also accepts `.woff2`, which the font reader in use (opentype.js 1.3.4) most likely can't open. I had no WOFF2 file to try.

**F46 · Low · Placement and Spacing details** (read)
- In placement "Rule Details", the page count under the title counts all pairs while the pager counts one representative per group, so the two numbers disagree. Accept works one page (36) at a time.
- In the pair editor only the right-hand letter can be dragged, and a pair the auto-spacer left at zero still counts as done.

**F47 · Low · The start page reads every saved project in full** (read)
- `dbService.getRecentProjects(100)` loads up to 100 whole projects, drawings included, to show their names. With a few large projects this delays the first screen on a phone.
- *Suggestion:* keep a small index of name, language and date.

### For the amateur font maker: the rules screens

Read in full this time, opened in the browser without errors, and not exercised rule by rule.

**F48 · Medium · Export depends on three outside websites** (read)
- Every export downloads the font builder from `cdn.jsdelivr.net`, `piwheels.org` and `files.pythonhosted.org` (`services/pythonFontService.ts`). If any one is slow, blocked at a school, or down, there is no font. The error text is good ("The font compiler could not start… Check your internet connection"), but there is no offline path.
- *Suggestion:* host the three files alongside the app. This also helps F8.

**F49 · Medium · Two prefixes for one idea** (read)
- "Manage Rules" (placement) writes groups as `$name`. OpenType Rules → Glyph Groups calls the same thing `@name`, and its help line says "using an @ prefix". The code treats both alike.
- *Suggestion:* pick one and show only that.

**F50 · Medium · Rules can be lost quietly** (read)
- Deleting one rule asks first. Deleting a whole lookup or a whole group doesn't, and there is no undo.
- Deleting a group that rules still use leaves those rules pointing at nothing, and export then drops them without saying so (`generateFea`, `isItemDrawnOrNonEmptyGroup`).
- In "Manage Rules", pressing Save with no base or no mark does nothing and says nothing. Spacing pairs accept any typed name unchecked, while the OpenType rule editor rejects unknown names.
- The Save button shown when autosave is off does nothing extra: every change is already applied (`hooks/useRulesState.ts`).
- *Suggestion:* confirm lookup and group deletes and list what uses them; make empty saves say what is missing.

**F51 · Low · Code words in the rules screens** (read)
- Attachment points appear as `topLeft`, `midRight`; card badges as "group", "class", "@PosGroup"; the placement editor shows "Synced" / "Override" and "Exception (Unlinked)"; position boxes are labelled only "x" and "y"; the Properties panel says "Label (Ghost)" and "Codepoint".
- The suggestion list for glyph names has no arrow-key selection and draws every letter in the project each time it opens (1,258 for Malayalam Traditional).

**F52 · Low · More English written into the code** (read; adds to F31)
- Roughly 60 more fixed strings, by my tally, on the screens read in this pass. Among them: "Detach Rule?", "Detach & Edit", "Same Base (Other Marks)", "Related Pairs", "Components", "By Rule / By Base / By Mark", "Kern", "X-Dist", "Auto-Generated Rules", "Script Tag:", "Inline Rules", "Select a lookup...", "Revert Changes?", "Unsaved Changes", "Contrast Ratio (Thick/Thin)", "Authoring Information", and the labels on the Metrics diagram.
- Three labels are glued together from parts (`{t('add')} Rule`, `… Anchor`, `… Lookup`), which won't translate. One whole English sentence is used as a translation key (`PositioningEditorPage.tsx` 330).

### What worked

Checked in the running app in this pass, with no errors:

- All twelve drawing tools, undo and redo (buttons and Ctrl/Cmd+Z), copy, cut and paste, Backspace to delete, drag-select, group and ungroup, Clear followed by Undo.
- Add a character (€), take and restore a snapshot, Save Copy, Export project file, "Load Saved Project" from the start screen.
- Spanish accents end to end: a + ´ gives á "to review"; Accept, Detach and Reset all work; the exported font opens.
- Import Font with a font this app exported: opens in about a second, 6 of 6 letters complete.
- Export with nothing drawn gives a clear message ("No characters have been drawn…").
- Not run, but read: there is protection for the same project open in two tabs. One tab owns it, and handing over saves first (`hooks/useProjectTabLock.ts`).

### Technical notes

Not user-facing; listed so they aren't lost.

- Files nothing imports: `components/AddBlockModal.tsx`, `components/DrawingModalHeader.tsx` (284 lines), `components/PositioningHeader.tsx` (an older copy of `components/positioning/PositioningHeader.tsx`), `components/SettingsModal.tsx` (empty).
- `console.log` left in `contexts/ProjectContext.tsx` 115, `hooks/useDrawingCanvas.ts` 161, `hooks/positioning/usePositioningSession.ts` 300. `useProjectLoad` 377 reads a `font-creator-settings-<id>` key that nothing writes.
- `workers/cascadeWorker.js` carries its own copy of the letter-assembly code from `services/glyphRenderService.ts`, and the two have drifted (the worker has no `scaleX`/`scaleY` and no `center` point). The script data uses neither today, so nothing shows yet.
- `ReusePreviewCard` shifts stroke points only, so a traced mark is drawn unshifted in the "copy position from" previews. `GlyphTile` ignores the contrast setting.
- `RulesPage` never calls `onHasUnsavedChanges`, so `UnsavedRulesModal` can't appear.

---

## Missing and improved functionality

Added on 12 November. This section is about what the app could do, not what is broken. It is written for total beginners and amateur font makers, and it keeps your progressive-disclosure choice: no Simple/Advanced switch, with tools appearing as a person reaches the step that needs them.

**Checked against the code:** the app exports OTF only (no web font, no TTF); there is no printable write-on-paper sheet ("Export Template" is a developer tool for defining a new language); there is no screen for drawing alternate versions of a letter, though the font builder can use them. **Judgement, not checked:** everything under "Why" below, and whether stylus pressure works.

**Already there, so not on this list:** a ghost guide letter to trace over, letters built from other letters, automatic spacing and placement, calligraphy pen, snapshots, font import, Compare, Test, the command palette.

### For total beginners

**M1 · A start that fits the person** (answers F3)
- Ask first what they want to write: their name, a word. Show only those letters. Finishing a short word in minutes is a win, and the rest unlock afterwards.
- *Why:* Hindi opens on 248 characters with nothing saying where to begin.

**M2 · Paper first, then photo** (answers F4)
- Offer a printable sheet with a box per letter. Accept one photo of the filled sheet and cut it into letters automatically.
- Keep the per-letter tracer as the fallback and restore its button (F4).
- *Why:* the tagline is "Where your handwriting becomes a font", and today nothing gets handwriting in from paper without drawing it again on screen.

**M3 · See your font in use while you draw**
- A small strip beside the editor showing their name or a chosen word in their own letters. Test is a separate trip today and opens empty (F23).

**M4 · Say plainly that spacing and accents are automatic** (answers F5)
- Both are already automatic. Show "we've placed these for you, look if you like", and put the hand tools behind "Fine-tune". That turns F5 from a bug into the design, provided Accept then means what it says.

**M5 · A "ready to use" moment, with an install guide**
- After the starter letters, say the font can be installed now, with three plain steps each for phone, Windows, Mac, Word and Canva. I found no install guidance in the app.

**M6 · A plain-language check before export**
- Examples: "3 letters look much thinner than the rest", "'g' has a gap that doesn't close", "there is no space character". It would replace today's vague export warning.

**M7 · Backup reminders**
- Projects live in the browser, so clearing site data deletes them. Remind people to download a backup, and ask the browser to keep the data (I did not check whether it already does).

### For amateur font makers

**M8 · Light, Regular and Bold from one set of drawings**
- Letters are stored as strokes and the thickness is applied only when the font is built (`services/fontBuilder.ts`), so exporting three weights as one family should be cheap. It would also give a proper style name in place of "Medium" (F1).

**M9 · Alternate versions of a letter**
- "Draw 2–3 versions" and rotate them automatically, so repeated letters look hand-written. The OpenType rules already exist; this is mostly interface work.

**M10 · Proper font identity**
- Link the project name to the font name (F1), add a style and a version, and replace the free-text licence box with a picker (SIL Open Font License, personal use only, and so on).

**M11 · More export formats**
- WOFF2 for websites and TTF for older software, plus a specimen image to share.

**M12 · Clean-up tools**
- "Smooth this letter", "make all strokes the same thickness", "snap height to the guide lines".

**M13 · Advanced tools appear when earned**
- Show spacing, placement and OpenType rules once most letters are drawn. Hide "Test Cases", "Debugging Tools" and "Export Template" by default (F33).

### Suggested order

| Order | Feature | Why first | Effort |
|---|---|---|---|
| 1 | Font name, style and version (M10 with F1) | Foundation for the rest | ½ day |
| 2 | Name-first start and live preview strip (M1, M3) | Biggest help to beginners finishing | 2–3 days |
| 3 | Pre-export checker (M6) | Builds trust, replaces a weak warning | 2 days |
| 4 | Weights from one drawing set (M8) | Distinctive for amateurs | 2–3 days |
| 5 | Printable sheet plus photo split (M2) | Matches the tagline; the largest piece | 1–2 weeks |
| 6 | Alternates, WOFF2/TTF, licence picker (M9, M11, M10) | Good once the above is in | about 1 week |

Open questions that only real users can settle: whether Hindi and Tamil beginners want a name-first start or would rather learn from vowels outward, and whether a stylus works well enough for drawing.

---

## For the amateur font maker

`UX_REVIEW.md` already lists what this group will like and miss. Four additions from this pass:

- **Naming and style (F1).** This is the first thing someone with a little experience checks, and it's the easiest to get wrong here: two names, a style called "Medium", and no version number.
- **Photo tracing (F4).** Amateurs often start from scans. The tool exists and can't be reached.
- **Spacing semantics (F5).** Someone who knows what kerning is will expect unaccepted suggestions to stay out of the font. They don't.
- **Metrics in two unit systems.** Settings → Metrics mixes font units (Ascender, Descender) with canvas positions ("Top Line Y (Canvas)") in one list. A short diagram with the four lines named would serve both audiences.

---

## Corrections to UX_REVIEW.md

Four statements there don't match what I found:

1. **"`Ctrl+S` 'Save Project' has no handler anywhere."** It has one, in `App.tsx` 246–261. With autosave on it downloads the project file (F27).
2. **"Import from an existing font, SVG, or a traced image"** under what amateurs will like. The traced-image route has no button (F4).
3. **Font names** ("it becomes the name of the installed font"). True for the default name, but renaming the project doesn't change it (F1), which is the larger problem.
4. **Help → "Supported Scripts" is described as empty.** It is a closed section that opens to a list, and the list has five code names in it (F42).

I can confirm these from my own runs: D16, the vague export warning, undrawn letters looking drawn on Test, dialogs ignoring Escape (five more of them, see F32), and no sideways scrolling on a phone.

---

## Documents out of date

| Document | Says | Actually |
|---|---|---|
| `README.md` | "professional-grade… empowers designers"; code under `/src`; "See `LICENSE`" | Audience is beginners; no `src` folder; no `LICENSE` file |
| `TESTING.md` | "We do not have automated E2E tests" | `tools/e2e/` builds whole fonts |
| `TRANSLATION.md` | Files in `public/locales`; `de`, `es`…; `node check_translations.js`; `supportedLocales` in `src/contexts` | `locales/`; only `en` and `ta`; `npm run check:translations`; `availableLocales` in `contexts/` |
| `CONTRIBUTING.md`, `scripts_json.md` | `"editorMode": "simple"` in the examples | Removed (T4) |
| `data_flow.md` | Libraries loaded by `<script>` tags in `index.html`; Pyodide started from there | Bundled; started from `AppContainer` |
| `data_structure.md` | Ten interface languages | Two |
| Help guide | Pencil and rectangle tools, purple Create button, "By Pair" mode, a green and orange "heatmap" | None of these exist (in addition to the list in `UX_REVIEW.md`) |

---

## Suggested order

These slot into the list at the end of `UX_REVIEW.md`. The first five are small and remove the most embarrassing moments.

| # | Change | Fixes | Effort |
|---|---|---|---|
| 1 | Clear the dismissed flag on "Start tutorial"; remember the interface language | F2, F7 | 30 minutes |
| 2 | One name for project and font, style "Regular", friendlier file name | F1, F12, F25 | ½ day |
| 3 | Put the photo-trace button back | F4 | 1 hour |
| 4 | Celebrations once per project, in order | F6 | 1 hour |
| 5 | Clean the sample texts; add the six missing group labels; fix the Test and Creator tips | F19, F21, F22, F24 | 2 hours |
| 6 | Vowels and consonants first; "letters you need" versus extras | F3 | ½–1 day |
| 7 | Decide what Accept means in Spacing (do this with U16) | F5 | decision + ½ day |
| 8 | Start the font builder download later | F8 | ½ day |
| 9 | Escape and focus in dialogs; cards as buttons; errors that stay | F28, F32 | ½ day |
| 10 | Icons, colour key, phone toolbar | F14, F17, F30 | 1 day |
| 11 | Move fixed English into `locales` | F31 | ½ day + Tamil review |
| 12 | Shorter tutorial with progress | F29 | 1 day |
| 13 | Hide Test Cases and Debugging Tools; update the documents | F33 | 2 hours |

From the second pass. The first three belong near the top of the list above, next to row 1.

| # | Change | Fixes | Effort |
|---|---|---|---|
| 14 | Keep Previous and Next working when the open letter leaves a filtered list | F34 | 1 hour |
| 15 | Warn before loading another language's backup into a project | F35 | 2 hours |
| 16 | Delete dialog: remove the "0", count accents that depend on the letter | F36 | 2 hours |
| 17 | Guard the Metrics boxes; add "Reset to defaults" | F37 | 2 hours |
| 18 | Build Help's language list from `scripts.json` | F42 | 1 hour |
| 19 | Curve hint; "Fit" button on the drawing and placement canvases | F38, F39 | ½ day |
| 20 | Fix the grid layout errors in the filtered side panel | F41 | ½ day |
| 21 | Cancel for auto-spacing; celebration buttons that go where they say | F43, F44 | ½ day |
| 22 | Host the font builder files with the app (do this with row 8) | F48, F8 | ½ day |
| 23 | Rules screens: one group prefix, confirm lookup and group deletes, no silent saves | F49, F50 | 1 day |
| 24 | Remove the four unused files and the leftover `console.log` lines | Technical notes | 30 minutes |

None of these is in `REVIEW_ISSUES.md` yet.
