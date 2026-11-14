# Persona review

*12 November 2026: Persona A, partly. 15 November 2026: Personas B and C, and a re-check of A, on the build with that day's fixes.*

Method: a headless browser (Playwright, Chromium) plays a person with a goal. Scripts and screenshots are in `tools/out/functionality-review/personas/` (`pB-*`, `pC-*`, `pA-recheck.cjs`, shared helpers in `lib.cjs`, `readfont.py` reads the exported fonts). The first Persona A scripts (`pA*-*.cjs`) were lost when the scratchpad was cleaned.

## Personas

| | Who | Goal | Setup | Status |
|---|---|---|---|---|
| A | **Meena**, 62, Tamil speaker, no typography knowledge | Make her handwriting into a font for recipe cards | Phone (390×844), Tamil interface, tips on | Partly run; re-checked 15 Nov |
| B | **Arjun**, 14, Hindi and English, impatient | A font for a school poster in 30 minutes | Small laptop (1366×768) | Run 15 Nov |
| C | **Priya**, hobbyist letterer, uses Canva, knows "kerning" vaguely | Export a font and use it in Canva; try a bold version | Desktop (1440×900), English | Run 15 Nov |

## Persona A (Meena): what I saw

Good: Tamil interface switch on the first screen and everything translated; welcome tip spotlights the first letter; Tamil opens on vowels with "0/238"; ghost letter to trace; drawing saved.

- [x] **No clear way back on a phone.** *15 Nov: mostly fixed.* The back arrow now has a name for screen readers ("பின்செல்க"), and the edge tab says "Show all letters" in Tamil (row 71). The arrow still has no visible word.
- [ ] **Button names only on hover.** *15 Nov: half fixed.* The drawing tools now show their names on a phone (பேனா, அழிப்பான், தேர்ந்தெடு, கூடுதல்; row 71). The header's Export, Create, Test and Settings are still icons only (F30).
- [ ] **Touch targets too small.** *15 Nov: still open.* 28 of 33 visible buttons on the grid screen are under 44 px (was 31 of 32).
- [x] **Tips stack up.** *15 Nov: fixed.* Only the welcome tip appeared in the first minute (row 14).
- [x] **Test page makes unfinished letters look finished.** *15 Nov: fixed.* "அம்மா" shows ம்மா in a grey box with "2 letters … aren't drawn yet: ம் மா" (row 43).
- [ ] **English default project name** ("TamilRegular") for a Tamil speaker. *15 Nov: still there* (row 40, waiting on your decision).
- [x] **Check:** progress read 2/238 after one letter. *15 Nov: it reads 1/238 after one letter, so it was my script.*
- [x] **Not finished:** exporting from the phone. *Fixed and checked on 14 November (row 74).*
- [ ] **New:** on a phone the Test page title "உங்கள் எழுத்துருவைப் பாருங்கள்" wraps to three lines and pushes the page down (`pAre-04-test.png`).
- [ ] **New:** English words in brackets in the Tamil interface: "ஒளி (Light)", "இருள் (Dark)", "குர்முகி (Gurmukhi)" (same kind as the "நகர்த்து (Pan)" note under row 65).

## Persona B (Arjun): what I saw

He opens Hindi, draws न म स (for नमस्ते), tries नमस्ते on the Test page and exports. The whole run took under a minute of app time; nothing blocked him.

Good: the tile "Hindi, Marathi, Nepali" is easy to find; drawing and going back is quick; the Test page is now "Try your font"; the export warning has plain buttons ("Keep working", "Export what I have") and the "Your font is downloaded" dialog explains installing.

- [ ] **Opens on Combining Signs, and the welcome tip points at ◌ा.** The first thing a beginner is told to draw is a vowel sign. Known: row 57 (your decision).
- [ ] **Project and font are called "DevanagariRegular", style "Medium"**, and the file is `DevanagariRegular_2026-11-14T23-20-42-020Z.otf`. Known: F1, row 40.
- [ ] **New (detail for row 40):** the time in the file name is UTC. At 00:20 on 15 November in Berlin the file says 14 November, 23-20.
- [ ] **New:** the grid header shows "Devanagari" under the project name, the one place a Hindi speaker sees the script's name instead of "Hindi" (`pB2-03-drawn-न.png`).
- [ ] **Section names are type-designer words:** "Consonant Half-Forms", "Conjuncts", "R-Conjuncts", "Special Forms", "Combining Signs". Known kind: row 65.
- [ ] **New (P1): the Test page doesn't say which letters to draw for a joined letter.** With न म स drawn, नमस्ते shows न म in his font and **स्ते** as one grey box, with "1 letters … aren't drawn yet: स्ते". He did draw स; what's missing is ्, त and े, and nothing says so (`pB2-08-test-namaste.png`).
- [ ] **New (P2):** "1 letters" — the message isn't singular for one letter.
- [ ] **New (P2): the export warning's numbers are scary for 3 letters.** "245 letters aren't drawn yet" is right, but it also says "2020 accents or joined letters haven't been checked" and "4264 letter pairs haven't been spaced", almost all of them for letters he hasn't drawn (`pB2-10-export-warning.png`). Count only the ones whose letters are drawn.
- [ ] **Donation bar** sits over the bottom of the grid. Known: row 26.
- [ ] **New (P2):** the footer says "© 2027" (hard-coded in `components/Footer.tsx`).

## Persona C (Priya): what I saw

She draws H e l o P r i a, renames the project "Priya Hand", looks for the font name and licence, exports, and then tries to make a bold version. Both exports were read with fontTools (`readfont.py`).

Good: renaming is easy (pencil next to the name); the file is now named after the project (`Priya Hand_….otf`); the export dialog has a Canva tab with the right steps; the version goes 1.000 → 1.001 in every place (row 90).

- [ ] **The font is still called "RomanSimple Medium" inside the file.** Name IDs 1/4/6/16: RomanSimple, RomanSimpleMedium. So the file says "Priya Hand" but Canva and Word will list "RomanSimple". Renaming the project doesn't change the font name in Settings either. Known: F1, row 40 (your decision). Since the file name now follows the project, the mismatch is easier to hit.
- [ ] **Style is "Medium", weight 500.** Known: F12, row 40.
- [ ] **Licence is a free-text box** ("License Description", "Font License URL" under "Font Meta Data"). Known: M10, licence picker in row 90.
- [ ] **New (P2):** left empty, the licence is written into the font as a single space (name IDs 13 and 14).
- [ ] **Settings words:** "Font Meta Data", "Contrast Ratio (Thick/Thin)", "Monoline (Uniform)", "Path Smoothing", "Units Per Em"; "Style Name" sits under Metrics, away from the font name; Editor Settings has "Composite Glyph Prefilling" and "Background Auto-Kerning". Known: UX_REVIEW §10, rows 65 and 68.
- [ ] **New (P1, detail for row 95): trying for bold changes her regular font.** The only thickness control she finds is Settings → Tools → Stroke Thickness. Moving it from 25 to 50 re-thickens **every letter already drawn**, without a word (the stem of l went from 38 to 75 units). The next export has the same name, style and weight ("RomanSimple Medium", 500), only version 1.001. Installed, it **replaces** the regular instead of sitting next to it, and the regular is gone from the project unless she moves the slider back. Until row 95 exists, the slider could at least say "This changes every letter. For a separate bold font, use Save Copy… first and name it Bold."
- [ ] Nothing in the app mentions bold or weight. Known: row 95 (Light/Regular/Bold), M6.

## Still to run

- [x] Persona B (Arjun): open Hindi, find where to start, draw three letters, type नमस्ते on Test (conjuncts and vowel signs), export with few letters and read the warning.
- [x] Persona C (Priya): draw several English letters, rename the project, set the font name and licence, export, read the font name from the file (expect the F1 problem), try for a bold version.
- [ ] Add a fourth persona if wanted: a teacher running a class on school tablets (backup, sharing, many projects).
- [x] Copy the persona scripts and screenshots into `tools/out/functionality-review/` (now in `personas/`; the first A scripts were lost).
- [x] Link the findings to the F, M and row numbers (done above; new ones are marked **New**).

## Notes for next time

- Headless tips and the phone drawer swallow clicks, so close tips after every step (`closeTips` in `personas/lib.cjs`).
- In the phone editor the back button is `[data-tour="header-back"]`.
- Tamil interface: set `localStorage.interfaceLocale = 'ta'` and reload. Pick the Tamil tile by its text "தமிழ்", leaving out "கன்னடம்" (Kannada's Tamil name also starts with க).
- The dev server for these runs was on port 3001 (`BASE=http://localhost:3001/`).
