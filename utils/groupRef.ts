/**
 * References to a group (or a character set of that name) inside rules: `@consonants`, as in
 * OpenType feature code. Older data and projects wrote `$consonants`; both are read the same way,
 * but the app writes and shows only `@` (F49).
 */
export const GROUP_PREFIX = '@';

/** True for `@name` or the older `$name` (not for the bare characters "@" or "$"). */
export const isGroupRef = (s: string | null | undefined): s is string =>
    typeof s === 'string' && s.length > 1 && (s[0] === '@' || s[0] === '$');

/** The group's name without its prefix. */
export const groupRefName = (s: string): string => (isGroupRef(s) ? s.slice(1) : s);

/** `@name`. */
export const toGroupRef = (name: string): string => GROUP_PREFIX + name;

/** How a reference is shown and stored: `$name` becomes `@name`, anything else is unchanged. */
export const normalizeGroupRef = (s: string): string => (isGroupRef(s) ? toGroupRef(s.slice(1)) : s);
