// End-to-end: build a complete font in the app (draw every glyph, position marks, space pairs),
// try it in Test and Creator, export it, then show the exported font. Optionally recorded.
//
//   node tools/e2e/e2e.cjs                  English, against BASE (default: npm run dev on :3000)
//   SCRIPT=spanish VIDEO=1 node tools/e2e/e2e.cjs
//   DEBUG_GLYPHS=D,t SCRIPT=spanish node tools/e2e/e2e.cjs   only draw these, one screenshot each
//
// Strokes come from alphabet.cjs (hand-made) and, for scripts traced from a font with
// trace-glyphs.py, from strokes/<script id>.json.
//
// Output: tools/e2e/out/<script>/ (numbered screenshots, <script>.otf, <script>-studio.png,
// summary.json, and <script>.webm with VIDEO=1). See tools/README.md.
const { chromium, launchOptions, BASE } = require('../lib/browser.cjs');
const { G, guides } = require('./alphabet.cjs');
const fs = require('fs'), path = require('path');
const SCRIPT = process.env.SCRIPT || 'english';
const RESUME = process.env.RESUME ? require('path').resolve(process.env.RESUME) : null; // a project file to start from
// Each script: its data file id, a sample for the Test page and a line for Creator.
const CONFIGS = {
    english: { id: 'latin', creator: 'Hello World',
        sample: 'The quick brown fox jumps over the lazy dog.\nPack my box with five dozen liquor jugs.\nAVATAR  Wave  Type  LOVE  Toy' },
    spanish: { id: 'spanish', creator: '¡Hola, Mañana!',
        sample: 'El pingüino Wenceslao hizo kilómetros bajo exhaustiva lluvia y frío,\nañoraba a su querido cachorro. ÑANDÚ  Árbol  Ícono  Óvalo  Último' },
    french: { id: 'french', creator: 'Ça va, Noël !',
        sample: 'Portez ce vieux whisky au juge blond qui fume.\nÇà et là, l\'été, Zoé mangeait des œufs à côté de l\'île. ÉCOLE  Être  ŒUVRE  Ægée  Ÿ' },
    portuguese: { id: 'portuguese', creator: 'Olá, Ação!',
        sample: 'À noite, vovô Kowalsky vê o ímã cair no pé do pinguim\nqueixoso e vovó põe açúcar no chá de tâmaras do jabuti feliz. AÇÃO  Ônibus  Último  Àquele' },
    german: { id: 'german', creator: 'Grüße, Straße!',
        sample: 'Victor jagt zwölf Boxkämpfer quer über den großen Sylter Deich.\nFalsches Üben von Xylophonmusik quält jeden größeren Zwerg. ÄRGER  Öl  Übung  STRAẞE' },
    greek: { id: 'greek', creator: 'Καλημέρα!',
        sample: 'Ξεσκεπάζω την ψυχοφθόρα βδελυγμία.\nΤάχιστη αλώπηξ βαφής ψημένη γη, δρασκελίζει υπέρ νωθρού κυνός. ΑΘΗΝΑ  Ώρα  Ένα  Ϊ  ΰ' },
    malayalam: { id: 'malayalam', creator: 'നമസ്കാരം!',
        sample: 'മനുഷ്യരെല്ലാവരും തുല്യാവകാശങ്ങളോടും അന്തസ്സോടും\nസ്വാതന്ത്ര്യത്തോടുംകൂടി ജനിച്ചിട്ടുള്ളവരാണ്. ക്ക ങ്ങ ച്ച ഞ്ഞ ട്ട ണ്ണ ത്ത ന്ന പ്പ മ്മ ള്ള റ്റ ക്ര പ്ര' },
    telugu: { id: 'telugu', creator: 'నమస్కారం!',
        sample: 'ప్రతిపత్తిస్వత్వముల విషయమున మానవులెల్లరును\nజన్మతః స్వతంత్రులును సమానులును నగుదురు. క్ష శ్రీ క్క ర్క ష్ట్ర కై కొ కౌ' },
    tamil: { id: 'tamil', creator: 'வணக்கம்!',
        sample: 'யாமறிந்த மொழிகளிலே தமிழ்மொழி போல்\nஇனிதாவது எங்கும் காணோம். கூடு, பூ, தீ, ஸ்ரீ ௧௨௩' },
    cyrillic: { id: 'cyrillic', creator: 'Привет, мир!',
        sample: 'Съешь же ещё этих мягких французских булок, да выпей чаю.\nЇжак і ґудзик, Єва. Ђак, Љубав, Њива, Ћерка, Џеп. ЁЛКА  Йод  Ўзбек  Қазақ  Әже' },
    hebrew: { id: 'hebrew', creator: 'שָׁלוֹם!',
        sample: 'כל בני האדם נולדו בני חורין ושווים בערכם ובזכויותיהם.\nשָׁלוֹם עוֹלָם  בְּרֵאשִׁית  ך ם ן ף ץ' },
    gurmukhi: { id: 'gurmukhi', creator: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ!',
        sample: 'ਸਾਰਾ ਮਨੁੱਖੀ ਪਰਿਵਾਰ ਆਪਣੀ ਮਹਿਮਾ, ਸ਼ਾਨ ਅਤੇ ਹੱਕਾਂ ਦੇ ਪੱਖੋਂ\nਜਨਮ ਤੋਂ ਹੀ ਆਜ਼ਾਦ ਹੈ। ਪ੍ਰ ਕ੍ਰ ਸ੍ਵ ਗੁ ਕੂ' },
    lao: { id: 'lao', creator: 'ສະບາຍດີ!',
        sample: 'ມະນຸດທຸກຄົນເກີດມາມີກຽດ ແລະ ສິດເທົ່າທຽມກັນ\nສະບາຍດີ ໜ້າ ໝາ ຫຼາຍ ກິ່ ກູ້' },
    thai: { id: 'thai', creator: 'สวัสดี!',
        sample: 'มนุษย์ทั้งหลายเกิดมามีอิสระและเสมอภาคกันในเกียรติศักดิ์และสิทธิ\nสวัสดีครับ น้ำ กี่ ปู่ ปั้ ฎุ ญู' },
    devanagari: { id: 'devanagari', creator: 'नमस्ते!',
        sample: 'सभी मनुष्यों को गौरव और अधिकारों के मामले में\nजन्मजात स्वतन्त्रता और समानता प्राप्त है। क्ष त्र ज्ञ श्र द्ध र्क कि कु कृ' },
    kannada: { id: 'kannada', creator: 'ನಮಸ್ಕಾರ!',
        sample: 'ಎಲ್ಲಾ ಮಾನವರೂ ಸ್ವತಂತ್ರರಾಗಿಯೇ ಜನಿಸಿದ್ದಾರೆ.\nಘನತೆ ಮತ್ತು ಹಕ್ಕುಗಳಲ್ಲಿ ಸಮಾನರಾಗಿದ್ದಾರೆ. ಕ್ಷ ರ್ಕ ಕ್ರ ಸ್ತ್ರ ಕೈ ಕೊ' },
    sinhala: { id: 'sinhala', creator: 'ආයුබෝවන්!',
        sample: 'සියලු මනුෂ්‍යයෝ නිදහස්ව උපත ලබා ඇත.\nශ්‍රී ලංකාව ආයුබෝවන් ක්‍ෂ ක්‍ය ක්‍ර කු කූ කෘ' },
    malayalam_traditional: { id: 'malayalam_traditional', creator: 'നമസ്കാരം!',
        sample: 'മനുഷ്യരെല്ലാവരും തുല്യാവകാശങ്ങളോടും അന്തസ്സോടും\nസ്വാതന്ത്ര്യത്തോടുംകൂടി ജനിച്ചിട്ടുള്ളവരാണ്. ക്ക ങ്ങ ച്ച ട്ട ത്ത ന്ന പ്പ ള്ള റ്റ ക്ര കു കൂ' },
    iast: { id: 'latin_indic', creator: 'Namaste!',
        sample: 'saṃskṛtaṃ bhāratasya gauravam |\ntathāgatasya śāsanaṃ akṣaraiḥ eva jñāyate || ĀĪŪ ṚṜ ṄÑ ṬḌṆ ŚṢ' },
    // Languages without a ready-made set, started from "Don't see your language?" (tools/e2e/language.cjs).
    norwegian: { language: 'nb', creator: 'Hei, blåbær!',
        sample: 'Alle mennesker er født frie og med samme menneskeverd og menneskerettigheter.\nVår sære Zulu fra badeøya spilte jo whist og quickstep i min taxi. ÆRE  Øl  Åpen  Café  Fôr' },
    japanese: { language: 'ja', creator: 'こんにちは！',
        sample: 'いろはにほへと ちりぬるを わかよたれそ つねならむ\nイロハニホヘト チリヌルヲ ワカヨタレソ ツネナラム がぎぐげご パピプペポ ゞ ヴ ー' },
    georgian: { language: 'ka', creator: 'გამარჯობა!',
        sample: 'ყოველი ადამიანი იბადება თავისუფალი და თანასწორი\nთავისი ღირსებითა და უფლებებით. ქართული ენა' },
};
const CONFIG = CONFIGS[SCRIPT];
if (!CONFIG) { console.error(`Unknown SCRIPT ${SCRIPT}; one of ${Object.keys(CONFIGS).join(', ')}`); process.exit(1); }
const SAMPLE = CONFIG.sample;
const OUT = path.join(__dirname, 'out', SCRIPT);
const REPO = path.resolve(__dirname, '../..');
const LANGUAGE = CONFIG.language ? require('./language.cjs').languageProject(CONFIG.language) : null;
const DATA_ID = LANGUAGE ? LANGUAGE.script.id : CONFIG.id;
const scriptDef = LANGUAGE ? LANGUAGE.script : (() => { const j = JSON.parse(fs.readFileSync(`${REPO}/scripts.json`, 'utf8')); return (Array.isArray(j) ? j : Object.values(j).find(Array.isArray)).find(x => x.id === DATA_ID); })();
const en = JSON.parse(fs.readFileSync(`${REPO}/locales/en.json`, 'utf8'));
const SCRIPT_NAME = LANGUAGE ? LANGUAGE.name : en[scriptDef.nameKey];
const TILE = new RegExp(`${SCRIPT_NAME}$`);
const sets = [...(LANGUAGE ? LANGUAGE.definitions : JSON.parse(fs.readFileSync(`${REPO}/data/characters_${DATA_ID}.json`, 'utf8'))), ...JSON.parse(fs.readFileSync(`${REPO}/data/characters_basic.json`, 'utf8'))]
    .filter(st => st.characters);
// Hidden glyphs aren't in the grid; linked ones (i = ı + dot) the app makes by itself.
const ORDER = sets.flatMap(st => st.characters.filter(c => !c.hidden).map(c => ({
    name: c.name, set: en[st.nameKey] || st.nameKey, positioned: !!c.position, built: !!c.composite, parts: c.composite || [], linked: !!c.link,
})));
// Strokes for each glyph. The hand-made alphabet is drawn on the European guide lines (baseline
// 660), so it moves with the script's baseline; traced strokes are already on the script's lines.
const shiftY = scriptDef.metrics.baseLineY - guides.B;
const STROKES = Object.fromEntries(Object.entries(G).map(([n, ss]) => [n, ss.map(st => st.map(([x, y]) => [x, y + shiftY]))]));
const tracedFile = path.join(__dirname, 'strokes', `${DATA_ID}.json`);
const TRACED = fs.existsSync(tracedFile) ? JSON.parse(fs.readFileSync(tracedFile, 'utf8')).strokes : {};
Object.assign(STROKES, TRACED);
// A built glyph starts from its parts in the editor. Hand-made strokes go on top of that start
// (Ґ = Г + upturn). In a traced script the start is only a starting point (ஆ starts as அ, ஞூ as
// ஞு), so it's finished the way a person would: cleared and written whole, as the font has it.
const finishesFromTrace = (it) => it.built && !G[it.name] && !!TRACED[it.name];
const canDraw = (it) => !it.positioned && !it.linked && (it.built ? !!G[it.name] || finishesFromTrace(it) : !!STROKES[it.name]);
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(`[${SCRIPT}]`, ...a);

(async () => {
    const browser = await chromium.launch(launchOptions());
    const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 }, acceptDownloads: true,
        ...(process.env.VIDEO ? { recordVideo: { dir: OUT, size: { width: 1440, height: 900 } } } : {}),
    });
    await ctx.addInitScript(() => { try { localStorage.setItem('themePreference', 'light'); localStorage.setItem('donateNoticeDismissed', 'true'); localStorage.setItem('tutorial_dismissed', 'true'); } catch { /* storage blocked */ } });
    const p = await ctx.newPage(); p.setDefaultTimeout(10000); global.__page = p;
    const errors = []; p.on('pageerror', e => errors.push(e.message.slice(0, 200))); p.on('dialog', d => d.accept());
    const shot = (n) => p.screenshot({ path: path.join(OUT, `${n}.png`) });

    // On-screen caption so the video explains each step.
    const caption = async (text) => {
        log(text);
        await p.evaluate((t) => {
            let el = document.getElementById('__e2e_caption');
            if (!el) {
                el = document.createElement('div'); el.id = '__e2e_caption';
                Object.assign(el.style, { position: 'fixed', left: '16px', bottom: '16px', zIndex: 2147483647, pointerEvents: 'none', background: 'rgba(17,24,39,.88)', color: '#fff', font: '600 15px/1.35 system-ui, sans-serif', padding: '8px 12px', borderRadius: '8px', maxWidth: '640px' });
                document.body.appendChild(el);
            }
            el.textContent = t;
        }, text).catch(() => {});
    };
    // Close any tips/hints that pop up (they are part of a normal first run).
    let celebrated = false; const celebrations = [];
    const closeTips = async () => {
        // The app celebrates when every glyph is done; continue to spacing from there.
        const celebration = p.locator('div.fixed.inset-0.z-\\[200\\]');
        const fineTune = celebration.getByText(/^Fine-tune spacing$/i).first();
        if (await fineTune.isVisible().catch(() => false)) {
            celebrated = true;
            await caption('Every glyph is done: the app says the font is ready. Continue to fine-tune spacing');
            await p.waitForTimeout(2500); await shot('06-font-ready');
            // The celebration's floating letters can cover the link: press it directly if a click doesn't land.
            await fineTune.click({ timeout: 3000 }).catch(() => fineTune.evaluate(b => b.click()).catch(() => {})); await p.waitForTimeout(1500);
        }
        // After an export the app explains how to use the font; read, then close it.
        const useFont = p.locator('[role="dialog"]').filter({ hasText: 'Your font is downloaded' }).first();
        if (await useFont.isVisible().catch(() => false)) {
            await shot('11b-use-your-font');
            await useFont.getByRole('button', { name: 'Close', exact: true }).click().catch(() => p.keyboard.press('Escape'));
            await p.waitForTimeout(500);
        }
        // A tip can sit on top of a celebration (opening a finished project in a new browser): close tips first.
        for (let i = 0; i < 3; i++) {
            const btn = p.locator('[data-tutorial-tooltip] button[data-action="close"], [data-tutorial-tooltip] button[data-action="skip"], [data-tutorial-tooltip] button[data-action="primary"]').last();
            if (!(await btn.count())) break;
            await btn.click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(250);
        }
        // Scripts with marks to place (Malayalam, Telugu…) hand over to Positioning first.
        for (const label of ['Go to Positioning', 'Go to Spacing', 'Done']) {
            const next = celebration.getByRole('button', { name: label, exact: true }).first();
            if (await next.isVisible().catch(() => false)) {
                await caption(`The app says this step is done: ${label}`); celebrations.push(label);
                await p.waitForTimeout(2000); await shot(`06-celebration-${label.replace(/\W+/g, '-').toLowerCase()}`);
                // The celebration's floating letters can cover the button: press it directly.
                await next.evaluate(b => b.click()).catch(() => {}); await p.waitForTimeout(1500);
            }
        }
        for (let i = 0; i < 4; i++) {
            const btn = p.locator('[data-tutorial-tooltip] button[data-action="close"], [data-tutorial-tooltip] button[data-action="skip"], [data-tutorial-tooltip] button[data-action="primary"]').last();
            if (!(await btn.count())) break;
            await btn.click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(250);
        }
    };
    const canvasBox = async () => (await p.$$eval('canvas', cs => cs.map(c => c.getBoundingClientRect().toJSON()))).sort((a, c) => c.width * c.height - a.width * a.height)[0];
    const tipOpen = async () => (await p.locator('[data-tutorial-tooltip]').count()) > 0;
    const canvasCursor = () => p.$eval('[data-tour="drawing-canvas"]', c => c.style.cursor).catch(() => '');
    const stroke1 = async (pts) => {
        await p.mouse.move(...pts[0]); await p.waitForTimeout(40);
        // The glyph's spacing lines grab any drag that starts on them, even with the pen. If the
        // start point is on one (cursor turns into ↔), draw the stroke from its other end.
        if ((await canvasCursor()) === 'col-resize') { pts = [...pts].reverse(); await p.mouse.move(...pts[0]); await p.waitForTimeout(40); }
        await p.mouse.down();
        for (const pt of pts.slice(1)) await p.mouse.move(...pt, { steps: 4 });
        await p.mouse.up(); await p.waitForTimeout(60);
    };
    // The editor may zoom and pan to fit a letter that opens with content outside the drawing area
    // (a built letter pre-filled from its parts, its sign below the area). A person draws against
    // the guide lines, which move with the view; the test reads the view from the canvas's props
    // (screen = point * zoom + offset) once its fit animation has settled.
    const readView = () => p.evaluate(() => {
        const c = document.querySelector('[data-tour="drawing-canvas"]'); if (!c) return null;
        let f = c[Object.keys(c).find(k => k.startsWith('__reactFiber'))];
        for (; f; f = f.return) { const pr = f.memoizedProps; if (pr && typeof pr.zoom === 'number' && pr.viewOffset) return { zoom: pr.zoom, x: pr.viewOffset.x, y: pr.viewOffset.y }; }
        return null;
    }).catch(() => null);
    const settledView = async () => {
        let v = await readView();
        for (let i = 0; i < 20; i++) { await p.waitForTimeout(100); const w = await readView(); if (JSON.stringify(w) === JSON.stringify(v)) return w; v = w; }
        return v;
    };
    const isNormal = (v) => !v || (Math.abs(v.zoom - 1) < 1e-3 && Math.abs(v.x) < 0.5 && Math.abs(v.y) < 0.5);
    // Put the view back to normal (as a person would pan back), until it stays there: the editor's
    // fit animation can still be running and undo a single reset.
    const resetView = async () => {
        for (let i = 0; i < 15; i++) {
            const v = await settledView();
            if (isNormal(v)) return v;
            await p.evaluate(() => {
                const c = document.querySelector('[data-tour="drawing-canvas"]'); if (!c) return;
                let f = c[Object.keys(c).find(k => k.startsWith('__reactFiber'))];
                for (; f; f = f.return) { const pr = f.memoizedProps; if (pr && pr.setZoom && pr.setViewOffset) { pr.setZoom(1); pr.setViewOffset({ x: 0, y: 0 }); return; } }
            }).catch(() => {});
            await p.waitForTimeout(300);
        }
        return settledView();
    };
    const drawGlyph = async (name) => {
        const box = await canvasBox(); const s = box.width / 1000;
        const v = (await resetView()) || { zoom: 1, x: 0, y: 0 };
        if (!isNormal(v)) log(`  the editor's view stayed zoomed ${v.zoom.toFixed(2)}x, moved ${Math.round(v.x)}, ${Math.round(v.y)}: drawing against it`);
        // Never let a stroke leave the canvas: outside it, the mouse would click the page instead.
        const inside = ([x, y]) => x > box.x + 2 && x < box.x + box.width - 2 && y > box.y + 2 && y < box.y + box.height - 2;
        for (const stroke of STROKES[name]) {
            const pts = stroke.map(([x, y]) => [box.x + ((500 + x) * v.zoom + v.x) * s, box.y + (y * v.zoom + v.y) * s]).filter(inside);
            if (pts.length < 2) continue;
            if (await tipOpen()) await closeTips();
            await stroke1(pts);
            // A tip that opened mid-stroke swallows the rest of it: dismiss it and draw that stroke again
            // (if it had landed, the redraw lies exactly on top of it).
            if (await tipOpen()) { await closeTips(); await stroke1(pts); }
        }
        await p.waitForTimeout(1100);
        if (await tipOpen()) await closeTips();
    };
    const back = async () => {
        await closeTips();
        const b = p.locator('[data-tour="header-back"], button:has-text("Back")').first();
        if (await b.isVisible().catch(() => false)) { await b.click(); await p.waitForTimeout(1200); await closeTips(); }
    };
    // Both the drawing and the positioning editor centre their title between the prev/next arrows.
    const navRow = () => p.locator('div.flex-1.flex.justify-center.items-center').filter({ has: p.locator('h2') }).first();

    // 1. Start a project
    await p.goto(BASE); await p.waitForTimeout(2500);
    if (!/Aksharajanani/.test(await p.title())) throw new Error(`${BASE} is not the app (title: "${await p.title()}"); start it with npm run dev and pass BASE=<its URL>`);
    await caption(`Start a new ${SCRIPT_NAME} font`);
    await p.waitForTimeout(1200);
    if (RESUME) {
        // Open a project saved after drawing (see the checkpoint below) instead of drawing again.
        await caption(`Open the ${SCRIPT_NAME} project saved after drawing`);
        const chooser = p.waitForEvent('filechooser');
        await p.getByRole('button', { name: /Load Saved Project/ }).first().click();
        await (await chooser).setFiles(RESUME); await p.waitForTimeout(4000); await closeTips();
    } else if (LANGUAGE) {
        await caption(`${SCRIPT_NAME} has no ready-made set: find it in the language list`);
        const more = p.getByRole('button', { name: /Don’t see your language\?/ }).first();
        await more.scrollIntoViewIfNeeded(); await p.waitForTimeout(800); await more.click(); await p.waitForTimeout(1000);
        await p.locator('input[type=search]').fill(LANGUAGE.lang.name.split(' ')[0]); await p.waitForTimeout(1200);
        await shot('00-language-search');
        await p.getByRole('listitem').filter({ hasText: SCRIPT_NAME }).first().click(); await p.waitForTimeout(1500);
        await caption(`The letters ${SCRIPT_NAME} uses are picked; accented ones are built from a letter and an accent`);
        await p.waitForTimeout(1500); await shot('00-language-letters');
        await p.getByRole('button', { name: 'Start Project' }).click();
        await p.waitForTimeout(3000); await closeTips();
    } else {
    await p.getByRole('button', { name: TILE }).first().click(); await p.waitForTimeout(2000);
    // Scripts with variant letters (Telugu క్ర…) ask which to use first: keep the defaults.
    const startProject = p.getByRole('button', { name: 'Start Project' });
    if (await startProject.isVisible().catch(() => false)) { await shot('00-variants'); await startProject.click(); log('variants: kept the defaults'); }
    await p.waitForTimeout(2000); await closeTips();
    }
    await shot('01-grid');

    // Open a glyph from the grid (its set's tab first, since the grid only renders what's near).
    const openGlyph = async (item) => {
        const sel = `[data-tour=${JSON.stringify('grid-item-' + item.name)}]`;
        let tile = p.locator(sel).first();
        if (!(await tile.isVisible().catch(() => false))) {
            const gridTab = p.getByRole('button', { name: /Character Grid$/ }).first();
            if (await gridTab.isVisible().catch(() => false)) { await gridTab.click(); await p.waitForTimeout(1000); await closeTips(); }
            await p.getByRole('button', { name: item.set, exact: true }).first().click().catch(() => {});
            await p.waitForTimeout(700);
        }
        tile = p.locator(sel).first();
        // With an editor open, the grid is a narrow side list that only renders the cards near where
        // it's scrolled, and a tip can cover it (Malayalam Traditional: ഡൃ after ഠൃ). If the card
        // isn't there or won't take a click, open the letter through the search (Ctrl+K) instead.
        const viaSearch = async () => {
            await closeTips();
            await p.keyboard.press('Control+k'); await p.waitForTimeout(500);
            const input = p.locator('input[placeholder*="command"]').last();
            if (!(await input.isVisible().catch(() => false))) return false;
            await input.fill(item.name); await p.waitForTimeout(600);
            const hit = p.locator('li > button').filter({ has: p.locator('div.font-semibold').getByText(item.name, { exact: true }) }).first();
            if (!(await hit.count())) { await p.keyboard.press('Escape'); return false; }
            await hit.click(); await p.waitForTimeout(1300); await closeTips();
            return true;
        };
        if (!(await tile.count())) {
            if (await viaSearch()) return true;
            // Not every letter in the data is in the project: of two variants (Telugu క్ര), only the
            // one chosen at the start is. Report it and go on.
            log(`“${item.name}” isn't in this project (a variant not chosen?)`); return false;
        }
        await tile.scrollIntoViewIfNeeded().catch(() => {});
        // A grid tip (with a dark overlay) can open just as we get back to the grid: close it and retry.
        await closeTips();
        const clicked = await tile.click({ timeout: 5000 }).then(() => true).catch(async () => {
            await p.waitForTimeout(800); await closeTips();
            return tile.click({ timeout: 5000 }).then(() => true).catch(() => false);
        });
        if (!clicked) return viaSearch();
        await p.waitForTimeout(1300); await closeTips();
        return true;
    };
    // Clear a built letter's starting point and pick the pen (the editor may open with Select).
    const clearForFinishing = async () => {
        await closeTips();
        await p.locator('button[title="Clear"]').first().click().catch(() => {}); await p.waitForTimeout(400);
        await p.locator('[data-tour="toolbar-pen"]').first().click().catch(() => {}); await p.waitForTimeout(200);
        // The editor fitted its view to the pre-filled parts, which can leave the letter's top out of
        // sight. A person would pan back; the test puts the view back to normal.
        await resetView();
    };
    const saveProjectFile = async (file) => {
        await closeTips();
        const dl = p.waitForEvent('download', { timeout: 60000 }).catch(() => null);
        await p.locator('button[title="More"]').first().click().catch(() => {}); await p.waitForTimeout(500);
        await p.getByRole('button', { name: /(Export JSON|Download a backup)$/ }).first().click().catch(() => {});
        const f = await dl;
        if (f) { await f.saveAs(path.join(OUT, file)); log('saved', file); }
        await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(500);
    };
    const title = async () => (await navRow().locator('h2').first().innerText().catch(() => '')).trim();

    if (process.env.DEBUG_GLYPHS) {
        for (const name of process.env.DEBUG_GLYPHS.split(',')) {
            const item = ORDER.find(o => o.name === name);
            await openGlyph(item); await p.waitForTimeout(1500); await closeTips();
            if (finishesFromTrace(item)) await clearForFinishing();
            if (STROKES[name] && (!item.built || canDraw(item))) await drawGlyph(name);
            // The code point keeps Ω and ω apart (macOS treats their file names as the same).
            const cp = [...name].map(ch => ch.codePointAt(0).toString(16)).join('-');
            await p.screenshot({ path: path.join(OUT, `dbg-${name}-${cp}.png`) });
            await back();
        }
        await p.screenshot({ path: path.join(OUT, 'dbg-grid.png') });
        await browser.close(); return;
    }

    // 2. Draw every glyph. The editor's Next arrow steps through the set; accented letters are
    //    skipped here (the app builds them by placing a mark on a letter; see step 3).
    const toDraw = ORDER.filter(canDraw);
    const drawn = []; const missing = [];
    if (!RESUME) {
    await caption('Draw every glyph; the editor\'s Next arrow steps through the whole set');
    await openGlyph(toDraw[0]);
    for (const item of toDraw) {
        if ((await title()) !== item.name) {
            // Not reached by Next (an accented letter sits in between): reopen from the grid.
            await back();
            if (!(await openGlyph(item)) || (await title()) !== item.name) { missing.push(item.name); continue; }
        }
        if (finishesFromTrace(item)) {
            await caption(`Finish “${item.name}”: the app starts it from ${item.parts.join(' + ')}; write the whole letter  (${drawn.length + 1} of ${toDraw.length})`);
            await clearForFinishing();
        } else {
            await caption(`Draw “${item.name}”  (${drawn.length + 1} of ${toDraw.length})`);
        }
        await drawGlyph(item.name); drawn.push(item.name); await p.waitForTimeout(120); await closeTips();
        if (['A', 'g', '&', '5'].includes(item.name)) await shot(`02-draw-${encodeURIComponent(item.name)}`);
        const next = navRow().locator(':scope > button').last();
        if (await next.isEnabled().catch(() => false)) { await next.click(); await p.waitForTimeout(600); await closeTips(); }
    }
    log(`drew ${drawn.length} of ${toDraw.length}${missing.length ? '; could not open: ' + missing.join(' ') : ''}`);
    await back(); await p.waitForTimeout(1500); await shot('03-grid-drawn');

    // 2b. Letters the app builds from two others (Æ = A + E): open each and keep what the app made.
    const toBuild = ORDER.filter(it => it.built && !canDraw(it)); // the rest were drawn or finished above
    for (const item of toBuild) {
        await caption(`“${item.name}” is built by the app from letters already drawn: check it`);
        if (!(await openGlyph(item))) continue;
        await p.waitForTimeout(1200);
        const save = p.locator('button[title="Save"]').first();
        if (await save.count() && await save.isEnabled().catch(() => false)) await save.click().catch(() => {});
        drawn.push(item.name); await back();
    }

    // Checkpoint: save the project once everything is drawn, so a later run can start here with
    // RESUME=tools/e2e/out/<script>/<script>-drawn.json instead of drawing it all again.
    await saveProjectFile(`${SCRIPT}-drawn.json`);
    }

    // 3. Positioning: every accented letter, with one adjusted by hand
    const toPosition = ORDER.filter(it => it.positioned);
    const positioned = [];
    const notOpened = [];
    for (const item of toPosition) {
        await openGlyph(item);
        if ((await title()) !== item.name) { notOpened.push(item.name); log(`could not open “${item.name}” to position it`); continue; }
        const acceptPos = p.locator('[data-tour="header-accept-pos"]').first();
        const clickSafely = async (loc) => { await closeTips(); await loc.click({ timeout: 3000 }).catch(() => loc.click({ force: true }).catch(() => {})); };
        if (positioned.length === 0) {
            await caption(`Position “${item.name}”: nudge the accent up by hand, then save`);
            const box = await canvasBox(); const sc = box.width / 1000;
            await p.mouse.move(box.x + 500 * sc, box.y + 395 * sc); await p.mouse.down();
            await p.mouse.move(box.x + 500 * sc, box.y + 365 * sc, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(700);
            await shot('04-position-by-hand');
            const save = p.locator('button[title="Save"]').first();
            if (await save.count() && await save.isEnabled().catch(() => false)) await clickSafely(save);
            else if (await acceptPos.count()) await clickSafely(acceptPos);
        } else {
            await caption(`Position “${item.name}”: accept the suggested placement`);
            if (await acceptPos.count() && await acceptPos.isEnabled().catch(() => false)) await clickSafely(acceptPos);
        }
        positioned.push(item.name); await p.waitForTimeout(600);
        await back();
    }
    if (toPosition.length) { log(`positioned ${positioned.length}: ${positioned.join(' ')}`); await shot('05-positioned'); }

    // 3b. The Positioning workspace (scripts whose rules place marks on whole groups of letters:
    //     Malayalam, Telugu…). Rule by rule: check the pairs and accept the suggestions. In the
    //     first rule, move a class representative by hand first: every pair synced with it should
    //     follow (tools/font/rulecheck.py checks that in the exported font).
    const posTab = p.getByRole('button', { name: /^\d\.\s*Positioning$/ }).first();
    let positioningProgress = null; const handMoved = [];
    if (await posTab.count()) {
        await caption('Place the marks: the app suggests a place for every letter + mark pair, rule by rule');
        await closeTips(); await posTab.click(); await p.waitForTimeout(2000); await closeTips();
        await shot('05b-positioning-rules');
        const rulesCount = await p.locator('[data-tour^="start-positioning-rule-"]').count();
        for (let i = 0; i < rulesCount; i++) {
            await p.locator('[data-tour^="start-positioning-rule-"]').nth(i).click().catch(() => {}); await p.waitForTimeout(1500); await closeTips();
            // Rule Details: pages of letter + mark pairs. A card with a "+N" badge stands for a class:
            // N more pairs are synced with it.
            if (i === 0) {
                const badge = p.locator('div.absolute.bg-indigo-600').filter({ hasText: /^\+\d+$/ }).first();
                if (await badge.count()) {
                    const synced = Number((await badge.innerText()).replace('+', ''));
                    const bb = await badge.boundingBox();
                    await shot('05c-rule-pairs');
                    await p.mouse.click(bb.x - 25, bb.y + 35); await p.waitForTimeout(1500); await closeTips();
                    const name = await title();
                    await caption(`Move one mark by hand: “${name}” stands for ${synced} more pairs, which should follow`);
                    const y = p.locator('xpath=//label[normalize-space()="y" or normalize-space()="Y"]/following-sibling::input[1]').first();
                    if (name && await y.count()) {
                        const before = Number(await y.inputValue()) || 0;
                        await y.fill(String(before - 40)); await y.press('Enter'); await p.waitForTimeout(800);
                        await shot('05d-moved-by-hand');
                        const acc = p.locator('[data-tour="header-accept-pos"]').first();
                        if (await acc.count()) await acc.click().catch(() => {});
                        await p.waitForTimeout(800);
                        handMoved.push({ pair: name, synced, dy: -40 }); log(`moved “${name}” up by 40 by hand (${synced} synced pairs)`);
                    }
                    const backBtn = p.locator('[data-tour="header-back"]').first();
                    if (await backBtn.isVisible().catch(() => false)) { await backBtn.click(); await p.waitForTimeout(1200); await closeTips(); }
                }
            }
            const pageText = await p.getByText(/^Page \d+ of \d+$/).first().innerText().catch(() => 'Page 1 of 1');
            const pages = Number(pageText.split(' of ')[1]) || 1;
            await caption(`Accept the suggested places for rule ${i + 1} of ${rulesCount} (${pages} pages)`);
            for (let pg = 1; pg <= pages; pg++) {
                const acceptPage = p.getByRole('button', { name: /^Accept (Page|All)/ }).first();
                if (await acceptPage.isVisible().catch(() => false) && await acceptPage.isEnabled().catch(() => false)) { await acceptPage.click(); await p.waitForTimeout(700); await closeTips(); }
                if (i === 0 && pg === 1) await shot('05e-rule-accepted');
                if (pg < pages) {
                    await p.locator('xpath=//*[starts-with(normalize-space(text()),"Page ") and contains(text()," of ")]/following-sibling::button[1]').last().click().catch(() => {});
                    await p.waitForTimeout(500);
                }
            }
            const toRules = p.locator('button[title="Back to Rules"]').first();
            if (await toRules.isVisible().catch(() => false)) { await toRules.click(); await p.waitForTimeout(1000); await closeTips(); }
        }
        positioningProgress = await p.getByText(/pairs positioned/).first().innerText().catch(() => '');
        log('positioning:', positioningProgress); await shot('05f-positioning-done');
    }
    const skipped = ORDER.filter(it => !it.positioned && !it.linked && !it.built && !canDraw(it)).map(it => it.name);

    // 4. Spacing. Scripts that recommend pairs (Tamil: 3,295) get those auto-kerned on the
    //    Suggestions tab, as the app offers first; the others (no recommendations) auto-kern every
    //    pair from All Pairs. (Select All in All Pairs on Tamil means 36,828 pairs.)
    const spacingTab = p.getByRole('button', { name: /Spacing|Kerning/ }).first();
    let spacingMode = 'none';
    const waitAutoKern = async () => {
        // Big scripts with no suggested pairs (Sinhala: every pair of ~580 glyphs) take many minutes.
        const t0 = Date.now();
        for (let t = 0; t < 1800; t++) { await p.waitForTimeout(1000); if (!(await p.getByText(/Auto-?kerning|Auto-spacing the|Calculating|Kerning\.\.\.|^Spacing\.\.\.$/i).count())) break; }
        log(`auto-kern took ${Math.round((Date.now() - t0) / 1000)} s`);
        await p.waitForTimeout(1500); await closeTips();
    };
    // "C/T recommended pairs spaced (P%)" from the Spacing screen's status line (its numbers are in
    // data attributes since the redesign; older builds show the sentence itself).
    const spacingStatus = async () => {
        const st = p.locator('[data-testid="spacing-status"]').first();
        if (await st.count()) {
            const c = Number(await st.getAttribute('data-completed')), tt = Number(await st.getAttribute('data-total'));
            return `${c}/${tt} recommended pairs spaced (${tt ? Math.round(c / tt * 100) : 100}%)`;
        }
        return p.getByText(/recommended pairs spaced/).first().innerText().catch(() => '');
    };
    if (!(await spacingTab.count())) {
        log('no Spacing step for this script');
    } else {
        await spacingTab.click(); await p.waitForTimeout(1800); await closeTips();
        const suggestionsTab = p.locator('[data-tour="tab-suggestions"]').first();
        if (await suggestionsTab.count()) { await suggestionsTab.click(); await p.waitForTimeout(1000); await closeTips(); }
        const progress = await spacingStatus();
        const recommended = Number((progress.match(/\/(\d+)/) || [])[1] || 0);
        if (recommended > 0) {
            spacingMode = `suggested (${recommended} pairs)`;
            await caption(`Spacing: auto-kern the ${recommended} pairs this script suggests`);
            await shot('06-suggested-pairs');
        } else {
            spacingMode = 'all pairs';
            await caption('Spacing: auto-kern every pair of letters');
            await p.locator('[data-tour="tab-all"]').first().click(); await p.waitForTimeout(800); await closeTips();
            for (const sa of await p.getByRole('button', { name: 'Select All' }).all()) await sa.click().catch(() => {});
            await p.waitForTimeout(800); await shot('06-all-pairs');
        }
        // One button; the spacing is applied straight away, with Undo (no separate Accept step).
        await p.locator('[data-tour="auto-kern-btn"]').first().click();
        await waitAutoKern(); await shot('07-autokerned');
        await caption('The spacing is in the font already (Undo is there if needed)');
        if (!(await p.locator('[data-tour="undo-auto-space-btn"]').count())) log('WARNING: no Undo button after automatic spacing');
        log('spacing:', spacingMode, '|', await spacingStatus());
        await shot('08-spacing-done');
        if (spacingMode === 'all pairs') await saveProjectFile(path.join(OUT, `${SCRIPT}-spaced.json`));
    }

    // 5. Try it: Test page. Building the font can take a while for big scripts: wait for it.
    await caption('Try the font on the Test page');
    await closeTips(); // the spacing celebration may be up (its "One Last Test" opens the Test page)
    let t0 = Date.now();
    if (!(await p.locator('textarea').first().isVisible().catch(() => false))) await p.getByRole('button', { name: /^Test$/ }).first().click();
    const ea = p.getByRole('button', { name: /^(Export Anyway|Export what I have)$/ });
    const area = p.locator('textarea').first();
    for (let t = 0; t < 300; t++) {
        if (await ea.count()) { await ea.click(); }
        if (await area.isVisible().catch(() => false)) break;
        await p.waitForTimeout(1000);
    }
    const testSeconds = Math.round((Date.now() - t0) / 1000);
    log(`Test page ready after ${testSeconds} s`);
    await p.waitForTimeout(1500);
    if (await area.count()) { await area.fill(SAMPLE); await p.waitForTimeout(2500); }
    await shot('09-test-page');
    await back();

    // 6. Creator
    // The header buttons stay greyed out while the app builds the font (minutes with all-pairs spacing).
    { const t1 = Date.now(); const exp = p.locator('[data-tour="header-export"]').first();
      const busy = async () => !(await exp.isEnabled().catch(() => true)) || (await p.locator('header .animate-spin, [data-tour="header-export"] ~ * .animate-spin').count()) > 0;
      for (let t = 0; t < 1800 && await busy(); t++) await p.waitForTimeout(1000);
      if (await busy()) log('the app was still building the font after 30 min');
      const waited = Math.round((Date.now() - t1) / 1000); if (waited > 2) log(`waited ${waited} s for the app to finish building the font`); }
    await caption('Make something with it in Creator');
    const create = p.getByRole('button', { name: /^Create$/ }).first();
    if (await create.count()) {
        await create.click({ timeout: 300000 }); // greyed out while the app is busy
        // Creator opens once the font is built: seconds for most scripts, minutes with all-pairs spacing.
        const t2 = Date.now();
        await p.locator('div.fixed.inset-0.z-50 header').first().waitFor({ timeout: 1800000 }).catch(() => {});
        const built = Math.round((Date.now() - t2) / 1000); if (built > 10) log(`Creator opened after ${built} s`);
        await p.waitForTimeout(2000); await closeTips();
        const text = p.locator('div.fixed.inset-0.z-50').locator('textarea, [contenteditable="true"], input[type="text"]').first();
        if (await text.count()) { await text.fill(CONFIG.creator).catch(() => {}); await p.waitForTimeout(2500); }
        await shot('10-creator');
        const studio = p.locator('div.fixed.inset-0.z-50 header');
        const imgP = p.waitForEvent('download', { timeout: 30000 }).catch(() => null);
        await studio.locator('button').nth(1).click().catch(() => {});
        const img = await imgP;
        if (img) { await img.saveAs(path.join(OUT, `${SCRIPT}-studio.png`)); log('saved Studio image'); }
        await p.waitForTimeout(1000);
        await studio.locator('button').first().click(); await p.waitForTimeout(1500); await closeTips();
    }

    // 7. Export
    await caption('Export the font');
    t0 = Date.now();
    const dlP = p.waitForEvent('download', { timeout: 300000 }).catch(() => null);
    await closeTips(); await p.locator('[data-tour="header-export"]').first().click(); await p.waitForTimeout(800);
    // The export may stop with a warning (unfinished letters) or a rules error, once compiling is
    // done: note it, and take "Export Anyway" as a person would.
    let exportError = null;
    for (let t = 0; t < 240; t++) {
        if (await ea.isVisible().catch(() => false)) {
            const dialog = await p.locator('[role="dialog"], .fixed.inset-0').filter({ has: ea }).last().innerText().catch(() => '');
            if (/error/i.test(dialog)) { exportError = dialog.replace(/\s+/g, ' ').slice(0, 300); log('EXPORT ERROR:', exportError); await shot('11-export-error'); }
            await ea.click().catch(() => {}); await p.waitForTimeout(1000);
        }
        // The first export asks what the font should be called (prefilled): keep the name.
        const useName = p.getByRole('button', { name: /^(Use this name|இந்தப் பெயரைப் பயன்படுத்து)$/ });
        if (await useName.isVisible().catch(() => false)) { log('font name asked:', JSON.stringify(await p.locator('#font-name-prompt-input').inputValue().catch(() => ''))); await useName.click().catch(() => {}); await p.waitForTimeout(800); }
        if (await Promise.race([dlP.then(d => !!d), new Promise(r => setTimeout(() => r(false), 1000))])) break;
    }
    const dl = await dlP;
    const fontFile = path.join(OUT, `${SCRIPT}.otf`);
    const exportSeconds = Math.round((Date.now() - t0) / 1000);
    if (dl) { await dl.saveAs(fontFile); log(`exported after ${exportSeconds} s:`, fontFile); } else log('NO DOWNLOAD');
    await p.waitForTimeout(1500); await shot('11-exported');

    // 7b. Keep the project file too: it says which glyph is which (letters without a code point
    //     get one at export), and it's what tools/font/rulecheck.py checks the font against.
    await saveProjectFile(`${SCRIPT}-project.json`);

    // 8. Show the exported font itself
    if (dl) {
        const b64 = fs.readFileSync(fontFile).toString('base64');
        const letters = ORDER.map(o => o.name).filter(n => n.length === 1 && /\p{L}/u.test(n)).join(' ');
        await p.setContent(`<!doctype html><meta charset="utf-8"><style>
            @font-face { font-family: Made; src: url(data:font/otf;base64,${b64}); }
            body { margin: 40px; font-family: system-ui; color: #111; }
            h1 { font: 600 18px system-ui; color: #555; margin: 0 0 18px; }
            .big { font-family: Made; font-size: 64px; line-height: 1.15; white-space: pre-wrap; }
            .med { font-family: Made; font-size: 34px; line-height: 1.3; margin-top: 24px; white-space: pre-wrap; }
            .label { font: 13px system-ui; color: #777; margin-top: 18px; }
        </style>
        <h1>The exported ${SCRIPT_NAME} font (${path.basename(fontFile)}), rendered by the browser</h1>
        <div class="big">${SAMPLE.split('\n')[0]}</div>
        <div class="med">${SAMPLE.split('\n').slice(1).join('\n')}</div>
        <div class="label">Every letter in the font (accented ones were positioned in the app):</div>
        <div class="med">${letters}</div>`);
        await p.waitForTimeout(1500);
        await caption('The exported font, rendered by the browser');
        await p.waitForTimeout(4000); await shot('12-exported-font');
    }

    log('page errors:', errors.length ? errors : 'none');
    await ctx.close();
    if (process.env.VIDEO) {
        const vids = fs.readdirSync(OUT).filter(f => f.endsWith('.webm') && !f.startsWith(SCRIPT));
        for (const v of vids) fs.renameSync(path.join(OUT, v), path.join(OUT, `${SCRIPT}.webm`));
    }
    await browser.close();
    fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ drawn, positioned, notOpened, skipped, fontReadyShown: celebrated, celebrations, positioningProgress, handMoved, spacingMode, testSeconds, exportSeconds, exportError, errors, exported: !!dl }, null, 2));
})().catch(async e => { console.log(`[${SCRIPT}] FAILED:`, e.message.split('\n')[0]); await global.__page?.screenshot({ path: path.join(OUT, 'FAILED.png') }).catch(() => {}); console.log(e.message.split("\n").slice(0,6).join(" / ")); process.exit(1); });
