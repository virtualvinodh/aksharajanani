// Prints the OpenType feature code the app would generate for a saved project, using the app's
// own generateFea. Used to check that changes to rule handling leave the features unchanged.
//   npx tsx tools/font/fea-dump.ts project.json > out.fea
//   AT_GROUPS=1 npx tsx tools/font/fea-dump.ts project.json   (first rewrite $group references as @group)
import { readFileSync } from 'fs';
import { generateFea } from '../../services/feaService';

const project = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const toAt = (v: unknown): unknown =>
    typeof v === 'string' ? (/^\$[^\s$]/.test(v) ? '@' + v.slice(1) : v)
    : Array.isArray(v) ? v.map(toAt)
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [/^\$[^\s$]/.test(k) ? '@' + k.slice(1) : k, toAt(x)]))
    : v;
const p = process.env.AT_GROUPS ? toAt(project) as any : project;
const chars = (p.characterSets || []).flatMap((s: any) => s.characters || []);
const byUnicode = new Map<number, any>(chars.filter((c: any) => c.unicode !== undefined).map((c: any) => [c.unicode, c]));
const glyphs = new Map<number, any>((p.glyphs || []).map(([k, v]: [any, any]) => [Number(k), v]));
const fontRules = { ...(p.fontRules || {}), groups: { ...(p.fontRules?.groups || {}), ...(p.groups || {}) } };
process.stdout.write(generateFea(fontRules, new Map(p.kerning || []), new Map(p.markPositioning || []), byUnicode,
    p.settings?.fontName || 'Test', p.positioningRules || null, glyphs, p.metrics, p.characterSets || [],
    p.markAttachmentRules || null, p.settings?.strokeThickness ?? 15));
