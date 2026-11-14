import { CharacterSet } from '../types';

/**
 * Rules that use a group (`$name` or `@name`) that no longer exists are left out of the exported
 * font (feaService skips them). This finds those groups and how many rules use them, so export can
 * say so in plain words instead of dropping them silently (F50). Kept out of feaService, which is
 * only loaded when a font is built.
 */
export const findRulesWithMissingGroups = (
    fontRules: any,
    characterSets: CharacterSet[] | null | undefined
): { groups: string[]; rules: number } => {
    const known = new Set<string>([
        ...Object.keys(fontRules?.groups || {}),
        ...(characterSets || []).map(s => s.nameKey),
    ]);
    const missing = new Set<string>();
    let rules = 0;

    const refsIn = (value: unknown, out: string[]) => {
        if (typeof value === 'string') {
            if ((value.startsWith('$') || value.startsWith('@')) && value.length > 1) out.push(value.slice(1));
        } else if (Array.isArray(value)) value.forEach(v => refsIn(v, out));
        else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => { refsIn(k, out); refsIn(v, out); });
    };

    // A feature (or named lookup) holds rule blocks by type: { liga: { output: [inputs] }, context: {…}, … }.
    const checkContainer = (container: unknown) => {
        if (!container || typeof container !== 'object' || Array.isArray(container)) return;
        for (const [type, block] of Object.entries(container as Record<string, unknown>)) {
            if (type === 'lookupflags' || type === 'lookups' || !block || typeof block !== 'object' || Array.isArray(block)) continue;
            for (const [key, value] of Object.entries(block as Record<string, unknown>)) {
                const refs: string[] = [];
                refsIn(key, refs); refsIn(value, refs);
                const unknown = refs.filter(r => !known.has(r));
                if (unknown.length) { rules++; unknown.forEach(r => missing.add(r)); }
            }
        }
    };

    for (const [key, value] of Object.entries(fontRules || {})) {
        if (key === 'groups' || !value || typeof value !== 'object') continue;
        // 'lookups' holds named lookups; every other key is a script holding features.
        Object.values(value as Record<string, unknown>).forEach(checkContainer);
    }
    return { groups: [...missing].sort(), rules };
};
