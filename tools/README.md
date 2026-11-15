# tools/

Scripts for testing the app from the outside: driving it in a real browser, checking the script
data, and inspecting the fonts it exports. None of this is part of the app or its build.
Everything they write goes to `out/` folders, which git ignores.

(The checks that run as npm scripts, such as `npm run check:translations`, live in `scripts/`.)

## Setup

The browser scripts use Playwright, which isn't a project dependency. Install it once:

```sh
npm i --no-save playwright && npx playwright install chromium
```

`npm install` or `npm ci` removes it again, so re-run that line after either.
Set `CHROME_PATH=/path/to/chrome` to use a different Chromium.

The browser scripts expect the app to be running already, by default at `npm run dev` (http://localhost:3000/).
To test the production build, run `npm run build && npm run preview` and pass `BASE=http://localhost:4173/`.

The font scripts need fontTools (plus uharfbuzz for `fontcheck.py`). The easiest way to get them is [uv](https://docs.astral.sh/uv/):
`uv run --with fonttools --with uharfbuzz python3 tools/font/...`.

## Browser

### `e2e/e2e.cjs`: build a whole font, end to end

Does what a person would do, in any of the European scripts or Tamil:

1. Starts a new project.
2. Draws every glyph with the pen: European letters from the hand-made strokes in `e2e/alphabet.cjs`, Tamil from strokes traced from its guide font (`e2e/strokes/tamil.json`, see below). Letters the app builds from others (Æ, ஆ) are opened and kept as built.
3. Positions the accented letters (the first by hand, the rest with "Accept Default Position").
   Scripts that place marks by rule (Malayalam, Telugu) also go through the Positioning workspace:
   one class representative is moved by hand (its synced pairs should follow), then every rule's
   suggestions are accepted.
4. Spaces the letters with "Space all automatically" (applied straight away, no Accept step): the script's suggested pairs if it has any (Tamil), otherwise every pair (All pairs → Select All).
5. Types a sample on the Test page.
6. Makes a picture in Creator and saves it.
7. Exports the font and shows it rendered by the browser.

```sh
node tools/e2e/e2e.cjs                       # English
SCRIPT=spanish node tools/e2e/e2e.cjs     # english spanish french portuguese german greek cyrillic hebrew iast
                                           # tamil malayalam telugu kannada devanagari gurmukhi sinhala thai lao
SCRIPT=norwegian node tools/e2e/e2e.cjs   # norwegian georgian japanese: started from "Don't see your language?"
RESUME=tools/e2e/out/malayalam/malayalam-drawn.json SCRIPT=malayalam node tools/e2e/e2e.cjs  # start from the saved checkpoint, skip drawing
SCRIPT=spanish VIDEO=1 node tools/e2e/e2e.cjs  # also record a video (with on-screen captions)
DEBUG_GLYPHS=D,t SCRIPT=spanish node tools/e2e/e2e.cjs  # draw only these glyphs, one screenshot each (dbg-<glyph>-<code point>.png)
```

Output goes to `tools/e2e/out/<script>/`:
- numbered screenshots of each step (`FAILED.png` if a step fails);
- `<script>.otf` (the exported font) and `<script>-studio.png` (the Creator picture);
- `<script>-project.json` (the project at the end, for `font/rulecheck.py`) and `<script>-drawn.json`
  (a checkpoint saved once everything is drawn, for `RESUME`);
- `summary.json` (glyphs drawn and positioned, page errors);
- with `VIDEO=1`, `<script>.webm`.

A run takes about 7 minutes (Tamil about 25; Kannada and Sinhala about 2 hours, Sinhala's every-pair spacing alone 6 minutes).
The editor zooms and pans to fit a letter that opens with content outside the drawing area (a built
letter pre-filled from its parts): the test reads the editor's view from the canvas and puts it back
to normal before drawing, and never lets a stroke leave the canvas. The log and `summary.json` say how long the Test page and the export took to build the font. To get an mp4, use `ffmpeg -i english.webm -c:v libx264 -pix_fmt yuv420p english.mp4`.

Adding another script means:
- adding it to `CONFIG` in `e2e.cjs` (its id in `scripts.json`, a sample for the Test page, a line for Creator);
- giving it strokes: run `trace-glyphs.py` (below), or add hand-made ones to `alphabet.cjs`. Hand-made strokes win only for glyphs the app builds from others, where they're drawn on top (Ґ = Г + upturn).

A language from the language list (no ready-made set) takes `language: '<CLDR code>'` instead of `id`.
The run starts it from "Don't see your language?" with the picker's defaults (every main letter, capitals).
`e2e/language.cjs` works out its letter sets with the app's own `services/languageService.ts` (bundled
with esbuild, which comes with Vite); its id is `lang_<code>`, so traced strokes go in
`strokes/lang_<code>.json`. To trace them, give `trace-glyphs.py` a folder with the project's script and
data (its guide font is the Noto font for the language, in `data/languages.json`):

```sh
node tools/e2e/language.cjs ka /tmp/lang-ka     # writes scripts.json and data/ for lang_ka
REPO=/tmp/lang-ka OUT_DIR=tools/e2e uv run --with fonttools --with uharfbuzz --with freetype-py \
    --with scikit-image --with pillow python3 tools/e2e/trace-glyphs.py lang_ka NotoSansGeorgian-Regular.ttf
```

The run also skips a Spacing step if the script doesn't have one.

### `e2e/trace-glyphs.py`: strokes from a font

Shapes every glyph of a script with a font (by default its guide font from `scripts.json`, downloaded once),
thins each one to its centre line and traces that into pen strokes on the script's guide lines.

```sh
uv run --with fonttools --with uharfbuzz --with freetype-py --with scikit-image --with pillow \
    python3 tools/e2e/trace-glyphs.py tamil [font.otf] [reference-glyph]
```

Writes `tools/e2e/strokes/<script>.json` (kept in git, so runs don't need Python) and a preview of every traced
glyph, `tools/e2e/out/trace-<script>.png`. Glyphs the font lacks are listed at the end; give those hand-made
strokes in `alphabet.cjs`.

The script reads the glyph list and set names from `data/` and `locales/en.json`.

Two things in the script work around app behaviour that is still open in REVIEW_ISSUES.md:
- **D16:** a stroke that starts on a spacing line is drawn from its other end.
- **U14:** a stroke cut off by a tip is drawn again.

### `layout-sweep.cjs`: layout at many screen sizes

Seeds a small Tamil project and a small Devanagari one. At each viewport it screenshots these screens:
- the grid;
- the editor (normal, maximised, with a selection, with properties open);
- Spacing;
- the Test page;
- Positioning.

For each screen it reports:
- header and canvas sizes;
- page scroll;
- whether the toolbar is clipped or overlaps something;
- buttons that can't be clicked, and what covers them.

```sh
node tools/layout-sweep.cjs
VPS=1280x800,390x844 node tools/layout-sweep.cjs
```

Output goes to `tools/out/layout/` (screenshots and `report.txt`).

## Data checks (no browser)

| Script | Checks |
|---|---|
| `checks/script-data.py` | Every script in `scripts.json`: all glyphs that rules, positioning, kerning and composites refer to are defined; classes resolve; marks are classed as marks; substitution outputs exist. |
| `checks/data-files.py` | Invalid JSON and duplicate keys in `data/`, unresolved references per rules file, data files no script uses. |
| `checks/locales.cjs` | `en` vs `ta` for the app, help and tutorial: duplicate keys, missing or extra keys, empty or untranslated values, `{placeholder}` mismatches. |

```sh
python3 tools/checks/script-data.py
python3 tools/checks/data-files.py
node tools/checks/locales.cjs
```

### `data/build_languages.py`: the language list

Builds `data/languages.json`, which the "Don't see your language?" picker reads. For each language CLDR
lists (one entry per language, plus variants such as Serbian in Latin letters) it keeps:
- the letters the language uses, its occasional letters (names, borrowed words) and extra punctuation;
- whether it has capitals, and its own name;
- Article 1 of the Universal Declaration of Human Rights in it, as the Test page sample;
- for each writing system, the Noto font to show behind the drawing area, its OpenType tag, and whether
  its letters join (the picker then says joined shapes aren't built);
- for each mark, where it sits (above, below, attached, over the letter): from Unicode's combining class,
  or for marks without one (Hebrew points, Thai and Indic signs) from where the Noto font draws it.

Writing systems with thousands of characters (Chinese, Korean, Yi) are left out. Japanese is kept as
kana only ("Japanese (kana)": hiragana, katakana, ー ゝ ゞ; kanji then come from another font), with the
iroha poem as its sample. Its guide font ships with the app, because Noto Sans JP is about 5 MB of mostly
kanji: `public/fonts/NotoSansJPKana-Regular.ttf` (194 KB, licence next to it) is Google Fonts'
`ofl/notosansjp/NotoSansJP[wght].ttf` at weight 400, cut down to U+3000–30FF and renamed:

```sh
uv run --with fonttools python3 -c "
from fontTools.ttLib import TTFont; from fontTools.varLib import instancer; from fontTools import subset
f = instancer.instantiateVariableFont(TTFont('NotoSansJP[wght].ttf'), {'wght': 400})
o = subset.Options(); o.layout_features = ['*']; o.name_IDs = ['*']; s = subset.Subsetter(o)
s.populate(unicodes=range(0x3000, 0x3100)); s.subset(f)
for r in f['name'].names:
    if r.nameID in (1, 4, 16): r.string = 'Noto Sans JP Kana'
    elif r.nameID == 6: r.string = 'NotoSansJPKana-Regular'
f.save('public/fonts/NotoSansJPKana-Regular.ttf')"
```

Download the sources first; nothing is fetched from unicode.org, which the sandbox can't reach:

```sh
npm pack cldr-misc-full cldr-localenames-full    # then untar both
curl -L -o udhr.tgz https://codeload.github.com/eric-muller/udhr/tar.gz/refs/heads/main
curl -L -o noto.json "https://api.github.com/repos/notofonts/notofonts.github.io/contents/fonts?ref=4cf78353cd1668040ba8efa13029cd910fcdf9e2"
uv run --with fonttools python3 tools/data/build_languages.py \
    --cldr-misc cldr-misc-full/package/main --cldr-names cldr-localenames-full/package/main \
    --udhr udhr-main/data/udhr --noto-list noto.json --font-cache /tmp/noto --out data/languages.json
```

## Fonts

| Script | Does |
|---|---|
| `font/rulecheck.py font.otf project.json [guide.otf] [--sample "text"]` | Checks the font against its project: every letter present, every joining rule forms its letter, every positioning rule places its marks, every spaced pair is spaced. Writes `<font>-rulecheck.md`, and with a guide font a side-by-side picture of the sample. |
| `font/fontcheck.py font.otf "To" "ñ"` | Tables, glyph count, empty glyphs, GSUB/GPOS features, and how HarfBuzz shapes the given text. |
| `font/kerndump.py font.otf` | A few glyphs' metrics, the most negative kerning pairs, any positive ones. |
| `font/glyphsvg.py font.otf out.svg "DtB"` | Draws glyphs with origin and advance marked, to compare against what was drawn. |
| `font/svg2png.cjs out.svg out.png` | Renders that SVG to PNG. |
