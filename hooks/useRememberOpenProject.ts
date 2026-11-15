import { useEffect } from 'react';

/**
 * After an accidental refresh, open the same project again instead of the start page (row 52).
 * The open project's id is kept in sessionStorage, which belongs to this tab and survives a
 * reload but not closing the tab; going back to "My fonts" (the project unmounts) forgets it.
 */
const KEY = 'aksharajanani:openProjectId';

export const useRememberOpenProject = (projectId: number | undefined) => {
    useEffect(() => {
        if (projectId === undefined) return;
        try { sessionStorage.setItem(KEY, String(projectId)); } catch { /* storage blocked */ }
        // Unmounting means the project was closed; a page reload doesn't run this.
        return () => { try { sessionStorage.removeItem(KEY); } catch { /* storage blocked */ } };
    }, [projectId]);
};

/** The project to reopen after a refresh, read once and cleared so a failure can't loop. */
export const takeProjectToReopen = (): number | null => {
    try {
        const v = sessionStorage.getItem(KEY);
        sessionStorage.removeItem(KEY);
        const id = v === null ? NaN : Number(v);
        return Number.isFinite(id) ? id : null;
    } catch { return null; }
};
