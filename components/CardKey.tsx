import React, { useEffect, useRef, useState } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { LinkIcon, PuzzleIcon, PositioningIcon, KerningIcon } from '../constants';

/**
 * "What do the colours mean?" next to the progress bar: the card borders and corner badges
 * in plain words (F14). Each swatch uses the same classes as the cards in CharacterCard.
 */
const CardKey: React.FC = () => {
    const { t } = useLocale();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
    }, [open]);

    const swatch = (cls: string, label: string, extra?: React.ReactNode) => (
        <li className="flex items-center gap-3">
            <span className={`relative flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${cls}`} aria-hidden="true">{extra}</span>
            <span>{label}</span>
        </li>
    );
    const faint = <span className="text-base font-bold text-gray-300 dark:text-gray-600" style={{ fontFamily: 'var(--guide-font-family)' }}>a</span>;
    const drawn = <span className="text-base font-bold text-gray-800 dark:text-gray-200" style={{ fontFamily: 'var(--guide-font-family)' }}>a</span>;
    const badge = (cls: string, icon: React.ReactNode, label: string) => (
        <li className="flex items-center gap-3">
            <span className={`flex-shrink-0 w-8 flex justify-center`} aria-hidden="true"><span className={`p-1 rounded-full ${cls}`}>{icon}</span></span>
            <span>{label}</span>
        </li>
    );

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 underline underline-offset-2 whitespace-nowrap"
                data-testid="card-key-button"
            >
                {t('cardKeyButton')}
            </button>
            {open && (
                <div role="dialog" aria-label={t('cardKeyButton')} className="absolute right-0 top-full mt-2 z-40 w-[min(20rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                    <ul className="space-y-2">
                        {swatch('bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600', t('cardKeyToDraw'), faint)}
                        {swatch('bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600', t('cardKeyCheck'), drawn)}
                        {swatch('bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600', t('cardKeyFinishMe'), <>{drawn}<span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-1.5 rounded-full bg-amber-300" /></>)}
                        {swatch('bg-white dark:bg-gray-800 border-2 border-gray-400 dark:border-gray-500', t('cardKeyDone'), drawn)}
                        {swatch('bg-gray-100 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 opacity-40', t('cardKeyLocked'), faint)}
                        {swatch('bg-white dark:bg-gray-800 border-2 border-dashed border-amber-300 dark:border-amber-700', t('cardKeySigns'), faint)}
                    </ul>
                    <p className="mt-3 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('cardKeyBadges')}</p>
                    <ul className="space-y-2">
                        {badge('bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400', <LinkIcon className="w-3 h-3" />, t('cardBadgeLinked'))}
                        {badge('bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400', <PuzzleIcon className="w-3 h-3" />, t('cardBadgeCopy'))}
                        {badge('bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400', <PositioningIcon className="w-3 h-3" />, t('cardBadgePositioned'))}
                        {badge('bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400', <KerningIcon className="w-3 h-3" />, t('cardBadgePair'))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default React.memo(CardKey);
