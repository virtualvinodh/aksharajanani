// A project started from the language list ("Don't see your language?"), as the app sets it up:
// the app's own services/languageService.ts, bundled with esbuild (installed with Vite), builds the
// letter sets from data/languages.json with the picker's defaults (all main letters, capitals).
//
//   node tools/e2e/language.cjs ka <dir>   writes <dir>/scripts.json and <dir>/data/ for
//                                           trace-glyphs.py (REPO=<dir> ... trace-glyphs.py lang_ka)
const fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '../..');

const loadService = () => {
    const esbuild = require(path.join(REPO, 'node_modules/esbuild'));
    const built = esbuild.buildSync({
        entryPoints: [path.join(REPO, 'services/languageService.ts')],
        bundle: true, format: 'cjs', platform: 'node', write: false, logLevel: 'silent',
    });
    const m = { exports: {} };
    new Function('module', 'exports', 'require', built.outputFiles[0].text)(m, m.exports, require);
    return m.exports;
};

/** { lang, name, script, definitions } for a CLDR language code, e.g. 'nb' or 'ka'. */
const languageProject = (code) => {
    const svc = loadService();
    const data = JSON.parse(fs.readFileSync(path.join(REPO, 'data/languages.json'), 'utf8'));
    const lang = data.languages.find(l => l.code === code);
    if (!lang) throw new Error(`No language ${code} in data/languages.json`);
    const letters = svc.splitChars(lang.letters);
    const chosen = [...letters, ...(lang.caps ? svc.capitalsFor(letters, lang.code) : [])];
    const { definitions } = svc.buildLanguageSets(chosen, [], data.marks);
    const scripts = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts.json'), 'utf8')).scripts;
    const template = scripts.find(s => s.id === 'latin');
    const script = svc.buildLanguageScript(lang, data, template, definitions, []);
    return { lang, name: svc.displayName(lang), script, definitions };
};

module.exports = { languageProject };

if (require.main === module) {
    const [code, dir] = process.argv.slice(2);
    const lp = languageProject(code);
    fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
    const { characterSetData: _sets, ...script } = lp.script;
    fs.writeFileSync(path.join(dir, 'scripts.json'), JSON.stringify({ scripts: [script] }, null, 1));
    fs.writeFileSync(path.join(dir, 'data', `characters_${script.id}.json`), JSON.stringify(lp.definitions, null, 1));
    fs.copyFileSync(path.join(REPO, 'data/characters_basic.json'), path.join(dir, 'data/characters_basic.json'));
    console.log(`${lp.name}: ${script.id} -> ${dir}`);
}
