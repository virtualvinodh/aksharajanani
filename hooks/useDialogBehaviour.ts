import { RefObject, useEffect, useRef } from 'react';

// Open dialogs, innermost last: Escape closes only the top one.
const openDialogs: symbol[] = [];

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * What every dialog and full-screen page should do (F32, UX §8): Escape closes it, focus moves
 * into it when it opens (unless something inside already took it, e.g. an autoFocus field), Tab
 * stays inside it, and focus goes back to where it was when it closes. Only the top dialog reacts.
 * A dialog that mustn't close mid-task passes an onClose that does nothing while busy.
 */
export const useDialogBehaviour = (isOpen: boolean, onClose: () => void, containerRef: RefObject<HTMLElement | null>) => {
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!isOpen) return;
        const id = Symbol('dialog');
        openDialogs.push(id);
        const previouslyFocused = document.activeElement as HTMLElement | null;

        const focusTimer = window.setTimeout(() => {
            const el = containerRef.current;
            if (!el || el.contains(document.activeElement)) return;
            // Prefer the dialog's content, then its buttons (Cancel comes first), over the × in the
            // header, so a habitual Enter doesn't just close the dialog.
            const within = (part: string) => FOCUSABLE.split(', ').map(s => `${part} ${s}`).join(', ');
            const target = el.querySelector<HTMLElement>('[autofocus]') ?? el.querySelector<HTMLElement>(within('main'))
                ?? el.querySelector<HTMLElement>(within('footer')) ?? el.querySelector<HTMLElement>(FOCUSABLE) ?? el;
            if (target === el && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
        }, 0);

        const onKeyDown = (e: KeyboardEvent) => {
            if (openDialogs[openDialogs.length - 1] !== id) return;
            if (e.key === 'Escape') {
                e.stopPropagation();
                e.preventDefault();
                onCloseRef.current();
                return;
            }
            // Tab and Shift+Tab stay inside the dialog instead of wandering to the page behind it.
            if (e.key === 'Tab') {
                const el = containerRef.current;
                if (!el) return;
                const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
                    .filter(n => n.tabIndex >= 0 && n.getClientRects().length > 0);
                if (items.length === 0) { e.preventDefault(); el.focus({ preventScroll: true }); return; }
                const first = items[0], last = items[items.length - 1];
                const active = document.activeElement as HTMLElement | null;
                const inside = !!active && el.contains(active);
                if (e.shiftKey && (!inside || active === first || active === el)) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && (!inside || active === last)) { e.preventDefault(); first.focus(); }
            }
        };
        window.addEventListener('keydown', onKeyDown, true);

        return () => {
            window.clearTimeout(focusTimer);
            window.removeEventListener('keydown', onKeyDown, true);
            const i = openDialogs.indexOf(id);
            if (i >= 0) openDialogs.splice(i, 1);
            if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus({ preventScroll: true });
        };
    }, [isOpen, containerRef]);
};
