import React, { useState, useEffect, useMemo } from 'react';
import KerningPage from './KerningPage';
import { RecommendedKerning } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useLocale } from '../contexts/LocaleContext';
import { useKerning } from '../contexts/KerningContext';

interface KerningWorkspaceProps {
    recommendedKerning: RecommendedKerning[] | null;
    kerningProgress: { completed: number; total: number };
}

/**
 * The Spacing screen, top to bottom: the overall spacing strip (in KerningPage, above the list),
 * then "Pair fixes": what they are, the tabs, a one-line status and the pair list.
 */
const KerningWorkspace: React.FC<KerningWorkspaceProps> = (props) => {
    const { kerningProgress, recommendedKerning } = props;
    const { settings } = useSettings();
    const { t } = useLocale();
    const { kerningMap, suggestedKerningMap, ignoredPairs } = useKerning();

    // Default to 'recommended' (Suggestions) only if there are actual suggestions (static or dynamic).
    // Otherwise, default to 'all' (All Pairs) to avoid showing an empty list initially.
    const [activeTab, setActiveTab] = useState<'recommended' | 'all' | 'spaced'>(() => {
        const hasStatic = recommendedKerning && recommendedKerning.length > 0;
        const hasDynamic = suggestedKerningMap && suggestedKerningMap.size > 0;
        return (hasStatic || hasDynamic) ? 'recommended' : 'all';
    });

    // Pairs whose fix changes something (the font's spacing for them isn't "as usual").
    const fixedCount = useMemo(() => {
        const keys = new Set<string>();
        suggestedKerningMap.forEach((v, k) => { if (v) keys.add(k); });
        kerningMap.forEach((v, k) => { if (v) keys.add(k); else keys.delete(k); });
        ignoredPairs.forEach(k => keys.delete(k));
        return keys.size;
    }, [kerningMap, suggestedKerningMap, ignoredPairs]);

    // Notify Tutorial Manager that the view has loaded
    useEffect(() => {
        window.dispatchEvent(new Event('aksharajanani:view-loaded'));
    }, []);

    if (!settings) return null;

    const { completed, total } = kerningProgress;
    const left = Math.max(0, total - completed);
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 100;
    const status = [
        t('pairFixesCount', { count: fixedCount }),
        total > 0 ? (left > 0 ? t('pairFixesLeftToCheck', { count: left }) : t('pairFixesAllChecked', { count: total })) : null,
    ].filter(Boolean).join(' · ');

    const tab = (id: 'recommended' | 'spaced' | 'all', label: string, dataTour: string) => (
        <button
            onClick={() => setActiveTab(id)}
            data-tour={dataTour}
            aria-pressed={activeTab === id}
            className={`flex-shrink-0 py-2 px-3 sm:px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                    ? 'border-accent text-accent'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
        >
            {label}
        </button>
    );

    const header = (
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" data-tour="kerning-tabs">
            <div className="px-4 pt-2 flex flex-wrap items-center gap-x-4 gap-y-1"
                data-testid="spacing-status" data-completed={completed} data-total={total} data-fixed={fixedCount}>
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">{t('pairFixesTitle')}</h2>
                <div className="flex items-center gap-2 min-w-0">
                    {total > 0 && (
                        <div className="w-20 sm:w-32 flex-shrink-0 bg-gray-300 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-accent h-1.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}
                                role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label={status} />
                        </div>
                    )}
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{status}</p>
                </div>
            </div>
            <p className="px-4 text-xs text-gray-500 dark:text-gray-400">{t('pairFixesExplain')}</p>
            <nav className="flex space-x-2 px-2 sm:px-4 pt-1 overflow-x-auto no-scrollbar">
                {tab('recommended', t('kerningTabSuggestions'), 'tab-suggestions')}
                {tab('spaced', t('kerningTabSpaced'), 'tab-spaced')}
                {tab('all', t('kerningAllPairs'), 'tab-all')}
            </nav>
        </div>
    );

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <KerningPage
                recommendedKerning={recommendedKerning}
                mode={activeTab}
                showRecommendedLabel={activeTab === 'all'}
                onSwitchToAllPairs={() => setActiveTab('all')}
                header={header}
            />
        </div>
    );
};

export default React.memo(KerningWorkspace);
