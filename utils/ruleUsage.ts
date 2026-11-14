/**
 * What still uses a group or a lookup in the rules screens, so deleting one can say so first
 * (F50: deleting either used to ask nothing, and export then left the rules out without a word).
 */

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** True when `value` (any JSON) mentions the group as `$key` or `@key`, in a value or an object key. */
export const mentionsGroup = (value: unknown, key: string): boolean => {
    const re = new RegExp(`(^|[^\\w-])[$@]${escapeRegExp(key)}(?![\\w-])`);
    const walk = (v: unknown): boolean => {
        if (typeof v === 'string') return re.test(v);
        if (Array.isArray(v)) return v.some(walk);
        if (v && typeof v === 'object') return Object.entries(v).some(([k, x]) => re.test(k) || walk(x));
        return false;
    };
    return walk(value);
};

/** Number of rules in a lookup: the entries of each rule type it holds. */
export const countLookupRules = (lookup: unknown): number => {
    if (!lookup || typeof lookup !== 'object') return 0;
    let n = 0;
    for (const [k, v] of Object.entries(lookup as Record<string, unknown>)) {
        if (k === 'lookupflags' || k === 'flags' || k === 'children') continue;
        if (Array.isArray(v)) n += v.length;
        else if (v && typeof v === 'object') n += Object.keys(v).length;
    }
    return n;
};

const isFeatureContainer = (k: string) => k !== 'groups' && k !== 'lookups';

/** Where a group is still used: features (by tag), lookups, other groups, and extra named sources. */
export const findGroupUsages = (
    key: string,
    rules: Record<string, any> | null | undefined,
    extra: { label: string; value: unknown }[] = [],
): string[] => {
    const found: string[] = [];
    if (rules) {
        for (const [scriptTag, features] of Object.entries(rules)) {
            if (!isFeatureContainer(scriptTag) || !features || typeof features !== 'object') continue;
            for (const [tag, feature] of Object.entries(features as Record<string, unknown>)) {
                if (mentionsGroup(feature, key)) found.push(tag);
            }
        }
        for (const [name, lookup] of Object.entries(rules.lookups || {})) {
            if (mentionsGroup(lookup, key)) found.push(name);
        }
        for (const [name, members] of Object.entries(rules.groups || {})) {
            if (name !== key && mentionsGroup(members, key)) found.push(`$${name}`);
        }
    }
    for (const e of extra) if (mentionsGroup(e.value, key)) found.push(e.label);
    return found;
};

/** The feature tags that list a lookup. */
export const findLookupUsages = (name: string, rules: Record<string, any> | null | undefined): string[] => {
    const found: string[] = [];
    if (!rules) return found;
    for (const [scriptTag, features] of Object.entries(rules)) {
        if (!isFeatureContainer(scriptTag) || !features || typeof features !== 'object') continue;
        for (const [tag, feature] of Object.entries(features as Record<string, any>)) {
            if (Array.isArray(feature?.children) && feature.children.some((c: any) => c?.type === 'lookup' && c.name === name)) found.push(tag);
        }
    }
    return found;
};
