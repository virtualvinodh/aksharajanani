#!/usr/bin/env node
/**
 * Downloads the font builder (Pyodide + fontTools + fontFeatures, about 20 MB; Brotli for WOFF2) into
 * public/font-builder/, so the app serves it from its own site instead of three outside
 * sites at export time (MASTER_LIST 80: schools often block CDNs; one origin is also faster).
 *
 * Every file is pinned to an exact version and checked against its SHA-256. Files already
 * present with the right hash are left alone, so this is a no-op after the first run.
 * Runs before `npm run dev` and `npm run build`. The folder is git-ignored.
 *
 * To upgrade: change the URLs and hashes here AND the file names in
 * services/pythonFontService.ts (FONT_BUILDER_FILES), then run this script.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/';
const FILES = [
    [PYODIDE + 'pyodide.js', 'b9cb64a73cc4127eef7cdc75f0cd8307db9e90e93b66b1b6a789319511e1937c'],
    [PYODIDE + 'pyodide.asm.js', '512042dfdd406971c6fc920b6932e1a8eb5dd2ab3521aa89a020980e4a08bd4b'],
    [PYODIDE + 'pyodide.asm.wasm', 'aa920641c032c3db42eb1fb018eec611dbef96f0fa4dbdfa6fe3cb1b335aed3c'],
    [PYODIDE + 'python_stdlib.zip', '52866039fa3097e549649b9a62ffae8a1125f01ace7b2d077f34e3cbaff8d0ca'],
    [PYODIDE + 'pyodide-lock.json', '6526dae570ab7db75019fe2c7ccc6b7b82765c56417a498a7b57e1aaebec39f5'],
    [PYODIDE + 'micropip-0.5.0-py3-none-any.whl', '8df6295822c842e312c71eee20c8561343b7a8f3b0f6a5debb91d390ae0d7d1e'],
    [PYODIDE + 'packaging-23.1-py3-none-any.whl', '952adfd0fbede825af3ddd33cf288778a247ef83d92de2118d02e7d188e2d917'],
    [PYODIDE + 'lxml-4.9.3-cp311-cp311-emscripten_3_1_46_wasm32.whl', 'b0591abd915683c44f04f128195aaea3f04f9406045e5b12101dea8c537bbd2e'],
    // Brotli: only loaded when a WOFF2 font is exported or imported.
    [PYODIDE + 'Brotli-1.0.9-cp311-cp311-emscripten_3_1_46_wasm32.whl', '365b3669eb68f4c02165bd264ccac110a5be339186b13bb4743085b051ece13c'],
    ['https://www.piwheels.org/simple/fonttools/fonttools-4.61.1-py3-none-any.whl', '018b2aa0b159683474b21d3a96e53f870115700525445e84c15726bbc2b552ef'],
    ['https://files.pythonhosted.org/packages/87/26/a0369ad3be7c74fa13cd2dc687c083b26d65380310957f5736c1a32395b0/fontfeatures-1.9.0-py3-none-any.whl', 'd7fcf48b77fa4f61fdffb5e28d588be05255fff0b54693c62de4013b129c3f1b'],
];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'font-builder');
const sha256 = buf => createHash('sha256').update(buf).digest('hex');

// Offline, a failed download only warns: the app then loads the font builder from the original
// sites (services/pythonFontService.ts). Set FONT_BUILDER_REQUIRED=1 to fail instead (deploys).
const required = process.env.FONT_BUILDER_REQUIRED === '1';
await mkdir(outDir, { recursive: true });
let fetched = 0, failed = 0;
for (const [url, hash] of FILES) {
    const file = path.join(outDir, path.basename(new URL(url).pathname));
    if (existsSync(file) && sha256(await readFile(file)) === hash) continue;
    process.stdout.write(`font builder: downloading ${path.basename(file)}… `);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const got = sha256(buf);
        if (got !== hash) throw new Error(`${url}: SHA-256 is ${got}, expected ${hash}`);
        await writeFile(file + '.part', buf);
        await rename(file + '.part', file);
        console.log(`${(buf.length / 1e6).toFixed(1)} MB`);
        fetched++;
    } catch (e) {
        if (required) throw e;
        console.log(`failed (${e.message}); the app will use the CDN instead`);
        failed++;
    }
}
console.log(failed ? `font builder: ${failed} file(s) missing` : fetched ? `font builder: ${fetched} file(s) downloaded to public/font-builder/` : 'font builder: up to date');
