/**
 * On phones the drawing toolbar shows only the tools everyone needs, with their names;
 * the rest sit under "More tools". Tutorial steps that point at a tool under "More tools"
 * point at that button instead.
 */
export const COMPACT_TOOLBAR_QUERY = '(max-width: 639px)';

/** The `data-tour` names of the tools that stay on the phone toolbar. */
export const COMPACT_MAIN_TOOLS = ['toolbar-pen', 'tool-eraser', 'tool-select', 'action-undo', 'action-redo'];

export const toolTourTarget = (tour: string): string => {
    const compact = typeof window !== 'undefined' && window.matchMedia?.(COMPACT_TOOLBAR_QUERY).matches;
    return compact && !COMPACT_MAIN_TOOLS.includes(tour) ? '[data-tour="tool-more"]' : `[data-tour="${tour}"]`;
};
