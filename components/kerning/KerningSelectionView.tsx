
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Character, RecommendedKerning, KerningMap } from '../../types';
import { useLocale } from '../../contexts/LocaleContext';
import { SparklesIcon, UndoIcon, SearchIcon, GridViewIcon } from '../../constants';
import { calculateAutoKerning } from '../../services/kerningService';
import { useMeasurableGlyphs } from '../../hooks/kerning/useMeasurableGlyphs';
import PairCard from '../PairCard';
import CharacterSelectionPanel from './CharacterSelectionPanel';
import CharacterSelectionRow from './CharacterSelectionRow';
import { useKerning } from '../../contexts/KerningContext';
import { useProject } from '../../contexts/ProjectContext';
import { useRules } from '../../contexts/RulesContext';
import { useGlyphData } from '../../contexts/GlyphDataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useLayout } from '../../contexts/LayoutContext';
import AutoKerningProgressModal from '../AutoKerningProgressModal';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import Modal from '../Modal';

interface KerningSelectionViewProps {
    filteredPairs: { left: Character, right: Character }[];
    onEditPair: (pair: { left: Character, right: Character }) => void;
    selectedLeftChars: Set<number>;
    setSelectedLeftChars: React.Dispatch<React.SetStateAction<Set<number>>>;
    selectedRightChars: Set<number>;
    setSelectedRightChars: React.Dispatch<React.SetStateAction<Set<number>>>;
    mode: 'recommended' | 'all' | 'spaced';
    showRecommendedLabel: boolean;
    hasHiddenRecommended?: boolean;
    kerningMap: KerningMap;
    suggestedKerningMap: KerningMap;
    onSwitchToAllPairs?: () => void;
    emptyStateTitle?: string;
    emptyStateMessage?: string;
}

const KerningSelectionView: React.FC<KerningSelectionViewProps> = ({ 
    filteredPairs, onEditPair, selectedLeftChars, setSelectedLeftChars, selectedRightChars, setSelectedRightChars, mode, showRecommendedLabel,
    hasHiddenRecommended, kerningMap, suggestedKerningMap, emptyStateTitle, emptyStateMessage
}) => {
    const { t } = useLocale();
    const { showNotification, filterMode, searchQuery } = useLayout();
    const { dispatch: kerningDispatch, discoverKerning } = useKerning();
    const { characterSets, allCharsByUnicode, setRecommendedKerning, recommendedKerning } = useProject();
    const { state: rulesState } = useRules();
    const { version: glyphVersion } = useGlyphData();
    // Own drawings plus the built shape of letters the app makes, so their pairs can be spaced (K20).
    const glyphDataMap = useMeasurableGlyphs();
    const { settings, metrics } = useSettings();

    const [isAutoKerning, setIsAutoKerning] = useState(false);
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [kerningProgressValue, setKerningProgressValue] = useState(0);
    const [isResetVisibleConfirmOpen, setIsResetVisibleConfirmOpen] = useState(false);
    const [showLetterFilters, setShowLetterFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    // Set by the progress dialog's Stop button; each run checks it (F43).
    const stopRequested = useRef(false);
    const [stopRun, setStopRun] = useState<(() => void) | null>(null);
    // The spacing before the last automatic spacing or reset, for Undo (row 27: applied straight away).
    const [undoSnapshot, setUndoSnapshot] = useState<{ kerning: KerningMap; suggested: KerningMap } | null>(null);
    const restore = (snap: { kerning: KerningMap; suggested: KerningMap }) => {
        kerningDispatch({ type: 'SET_MAP', payload: new Map(snap.kerning) });
        kerningDispatch({ type: 'SET_SUGGESTIONS', payload: new Map(snap.suggested) });
        setUndoSnapshot(null);
        showNotification(t('spacingUndone'), 'info');
    };

    const isLargeScreen = useMediaQuery('(min-width: 1024px)');
    const PAGE_SIZE = isLargeScreen ? 100 : 20;

    const drawnCharacters = useMemo(() => {
        return characterSets?.flatMap(s => s.characters)
            // Marks attach to their base (mark positioning), so they're never kerned (as in Detect new pairs).
            .filter(c => !c.hidden && c.unicode !== undefined && glyphDataMap.has(c.unicode) && c.glyphClass !== 'mark')
            .sort((a,b) => a.unicode! - b.unicode!) || [];
    }, [characterSets, glyphDataMap]);

    const totalPages = Math.ceil(filteredPairs.length / PAGE_SIZE);
    // A narrower search can leave us past the last page; snap back so results stay visible.
    useEffect(() => {
        if (currentPage > Math.max(1, totalPages)) setCurrentPage(Math.max(1, totalPages));
    }, [currentPage, totalPages]);
    const paginatedPairs = filteredPairs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const handleAutoKern = async () => {
        if (!metrics || !settings) return;
        setIsAutoKerning(true);
        const pairsToKern = filteredPairs.filter(p => !kerningMap.has(`${p.left.unicode}-${p.right.unicode}`));
        
        if (pairsToKern.length === 0) {
            showNotification(t('noPairsToKern'), 'info');
            setIsAutoKerning(false);
            return;
        }

        setKerningProgressValue(0);
        setIsProgressModalOpen(true);
        stopRequested.current = false;
        setStopRun(() => () => { stopRequested.current = true; });
        const snap = { kerning: new Map(kerningMap), suggested: new Map(suggestedKerningMap) };
        try {
            const results = await calculateAutoKerning(pairsToKern, glyphDataMap, metrics, settings.strokeThickness, setKerningProgressValue, recommendedKerning, { groups: rulesState.fontRules?.groups || {}, characterSets }, () => stopRequested.current);
            // Applied straight away (they go into the font as they are); stopping keeps what was
            // measured so far. Undo puts the spacing back as it was.
            if (results.size > 0) {
                kerningDispatch({ type: 'MERGE_SUGGESTIONS', payload: results });
                setUndoSnapshot(snap);
                const undo = { onUndo: () => restore(snap) };
                if (stopRequested.current) showNotification(t('autoKerningStopped', { count: results.size }), 'info', undo);
                else showNotification(t('autoKerningComplete', { count: results.size }), 'success', undo);
            } else if (stopRequested.current) showNotification(t('autoKerningStopped', { count: 0 }), 'info');
        } finally {
            setStopRun(null);
            setIsProgressModalOpen(false);
            setIsAutoKerning(false);
        }
    };
    
    const handleDiscoverKerning = async () => {
        setIsAutoKerning(true);
        setIsProgressModalOpen(true);
        setKerningProgressValue(0);

        // Determine calculation mode based on settings
        const shouldCalculateValues = settings?.isBackgroundAutoKerningEnabled ?? false;

        // The search runs in a worker that can't be interrupted; Stop closes the dialog at once and
        // its result is then ignored (nothing is added).
        let stopped = false;
        const finish = () => { setStopRun(null); setIsProgressModalOpen(false); setIsAutoKerning(false); };
        setStopRun(() => () => { stopped = true; finish(); showNotification(t('detectPairsStopped'), 'info'); });

        const resultsMap = await discoverKerning((progress) => {
            if (!stopped) setKerningProgressValue(progress);
        }, shouldCalculateValues, true); // Return results, do NOT dispatch to suggestions

        if (stopped) return;
        finish();
        
        if (resultsMap.size > 0) {
            // Merge results into recommendedKerning list
            const newPairs: RecommendedKerning[] = [];
            const existingSet = new Set(recommendedKerning?.map(r => `${r[0]}-${r[1]}`));

            resultsMap.forEach((val, key) => {
                 const [lUni, rUni] = key.split('-').map(Number);
                 const lChar = allCharsByUnicode.get(lUni);
                 const rChar = allCharsByUnicode.get(rUni);
                 
                 if (lChar && rChar) {
                     const pairKey = `${lChar.name}-${rChar.name}`;
                     if (!existingSet.has(pairKey)) {
                         newPairs.push([lChar.name, rChar.name]);
                         existingSet.add(pairKey);
                     }
                 }
            });

            if (newPairs.length > 0) {
                setRecommendedKerning([...(recommendedKerning || []), ...newPairs]);
                showNotification(t('findPairsAdded', { count: newPairs.length }), 'success');
            } else {
                showNotification(t('findPairsNoneNew'), 'info');
            }

        } else {
            showNotification(t('findPairsNoneFound'), 'info');
        }
    };

    // "Back to usual" for one pair: it follows the overall spacing again. Kept as a choice made by
    // hand ("as usual"), so it counts as checked and automatic spacing doesn't fix it again.
    const handleBackToUsual = (key: string, label: string) => {
        const snap = { kerning: new Map(kerningMap), suggested: new Map(suggestedKerningMap) };
        const next = new Map(kerningMap); next.set(key, 0);
        kerningDispatch({ type: 'SET_MAP', payload: next });
        kerningDispatch({ type: 'REMOVE_SUGGESTIONS', payload: [key] });
        showNotification(t('pairFixBackToUsualDone', { pair: label }), 'success', { onUndo: () => restore(snap) });
    };

    const handleResetVisible = () => {
        const snap = { kerning: new Map(kerningMap), suggested: new Map(suggestedKerningMap) };
        const newMap = new Map(kerningMap);
        const keysToRemove: string[] = [];
        let count = 0;
        
        filteredPairs.forEach(p => {
            const key = `${p.left.unicode}-${p.right.unicode}`;
            let modified = false;

            // 1. Remove from saved map
            if (newMap.has(key)) { 
                newMap.delete(key); 
                modified = true; 
            }
            
            // 2. Remove from suggestions map
            if (suggestedKerningMap.has(key)) {
                keysToRemove.push(key);
                modified = true;
            }

            if (modified) count++;
        });

        kerningDispatch({ type: 'SET_MAP', payload: newMap });
        
        if (keysToRemove.length > 0) {
            kerningDispatch({ type: 'REMOVE_SUGGESTIONS', payload: keysToRemove });
        }
        
        if (count > 0) setUndoSnapshot(snap);
        showNotification(t('kerningResetSuccess', { count }), 'success', count > 0 ? { onUndo: () => restore(snap) } : undefined);
        setIsResetVisibleConfirmOpen(false);
    };

    const isSearching = searchQuery.trim().length > 0;
    const isFiltered = filterMode !== 'none' || isSearching;

    // Use "Filter" title for both Recommended and Spaced modes
    const leftTitle = mode === 'all' ? "kerningSelectLeftChars" : "kerningFilterLeftChars";
    const rightTitle = mode === 'all' ? "kerningSelectRightChars" : "kerningFilterRightChars";

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex flex-1 overflow-hidden">
                {isLargeScreen && (
                    <div className="w-64 flex-shrink-0 h-full border-r dark:border-gray-700">
                        <CharacterSelectionPanel title={leftTitle} characters={drawnCharacters} selectedChars={selectedLeftChars} onSelectionChange={(u, s) => setSelectedLeftChars(prev => { const n = new Set(prev); if (s) { n.add(u); } else { n.delete(u); } return n; })} onSelectAll={() => setSelectedLeftChars(new Set(drawnCharacters.map(c => c.unicode!)))} onSelectNone={() => setSelectedLeftChars(new Set())} />
                    </div>
                )}
                
                <main className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-gray-900/50">
                    {mode === 'recommended' && hasHiddenRecommended && !isFiltered && (
                        <div className="flex-shrink-0 m-4 p-3 bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 rounded-md text-sm text-blue-700 dark:text-blue-300">
                            {t('kerningShowOnlyComplete')}
                        </div>
                    )}

                    {!isLargeScreen && mode !== 'all' && (
                        // On phones the letter filters are folded away, so the pairs come first. "All
                        // pairs" needs them to choose letters, so there they stay open.
                        <button type="button" onClick={() => setShowLetterFilters(v => !v)} aria-expanded={showLetterFilters}
                            className="mx-4 mt-3 self-start text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                            <span aria-hidden="true" className={`inline-block mr-1 transition-transform ${showLetterFilters ? 'rotate-90' : ''}`}>▸</span>{t('filterByLetter')}
                        </button>
                    )}
                    {!isLargeScreen && (mode === 'all' || showLetterFilters) && (
                        <div className="p-4 space-y-4 border-b dark:border-gray-700">
                             <CharacterSelectionRow title={leftTitle} characters={drawnCharacters} selectedChars={selectedLeftChars} onSelectionChange={(u, s) => setSelectedLeftChars(prev => { const n = new Set(prev); if (s) { n.add(u); } else { n.delete(u); } return n; })} onSelectAll={() => setSelectedLeftChars(new Set(drawnCharacters.map(c => c.unicode!)))} onSelectNone={() => setSelectedLeftChars(new Set())} />
                             <CharacterSelectionRow title={rightTitle} characters={drawnCharacters} selectedChars={selectedRightChars} onSelectionChange={(u, s) => setSelectedRightChars(prev => { const n = new Set(prev); if (s) { n.add(u); } else { n.delete(u); } return n; })} onSelectAll={() => setSelectedRightChars(new Set(drawnCharacters.map(c => c.unicode!)))} onSelectNone={() => setSelectedRightChars(new Set())} />
                        </div>
                    )}

                    <div className="px-4 py-3 border-b dark:border-gray-700 flex items-center gap-3 flex-wrap bg-white dark:bg-gray-800">
                        <button onClick={handleAutoKern} disabled={isAutoKerning} data-tour="auto-kern-btn" title={t('spaceAllAutomaticallyHint')} className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"><SparklesIcon /> {t('spaceAllAutomatically')}</button>
                        {undoSnapshot && (
                            <button onClick={() => restore(undoSnapshot)} data-tour="undo-auto-space-btn" className="inline-flex items-center gap-2 px-4 py-2 bg-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"><UndoIcon /> {t('undoSpacing')}</button>
                        )}
                        
                        <button onClick={handleDiscoverKerning} disabled={isAutoKerning} data-tour="detect-pairs-btn" className="inline-flex items-center gap-2 px-4 py-2 bg-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors" title={t('detectNewPairsHint')}>
                             <SearchIcon className="w-4 h-4" />
                             <span>{t('detectNewPairs')}</span>
                        </button>

                        <button onClick={() => setIsResetVisibleConfirmOpen(true)} disabled={kerningMap.size === 0 && suggestedKerningMap.size === 0} className="inline-flex items-center gap-2 px-4 py-2 bg-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 font-semibold rounded-lg disabled:opacity-50 transition-colors" title={t('resetVisibleTitle')}><UndoIcon /> {t('resetVisible')}</button>
                    </div>


                    <div className="flex-grow">
                        {paginatedPairs.length > 0 ? (
                            <div className="p-4 grid grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] gap-3 sm:gap-4">
                                {paginatedPairs.map(p => {
                                    const key = `${p.left.unicode}-${p.right.unicode}`;
                                    const savedValue = kerningMap.get(key);
                                    const suggestedValue = suggestedKerningMap.get(key);
                                    const isSuggested = savedValue === undefined && suggestedValue !== undefined;

                                    return (
                                        <PairCard 
                                            key={key} 
                                            pair={p} 
                                            onClick={() => onEditPair(p)} 
                                            isRecommended={mode === 'recommended'} 
                                            showRecommendedLabel={showRecommendedLabel} 
                                            kerningValue={savedValue ?? suggestedValue}
                                            isSuggested={isSuggested}
                                            onBackToUsual={() => handleBackToUsual(key, `${p.left.name} ${p.right.name}`)}
                                            glyphDataMap={glyphDataMap} 
                                            strokeThickness={settings!.strokeThickness} 
                                            metrics={metrics!} 
                                            glyphVersion={glyphVersion} 
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-20 text-gray-400 dark:text-gray-500 text-center h-full">
                                {emptyStateMessage ? (
                                     <>
                                        <div className="mb-4 opacity-10">
                                            <GridViewIcon className="w-24 h-24" />
                                        </div> 
                                        {emptyStateTitle && <h3 className="text-xl font-bold mb-2 text-gray-600 dark:text-gray-300">{emptyStateTitle}</h3>}
                                        <p className="text-lg max-w-md mx-auto">{emptyStateMessage}</p>
                                     </>
                                ) : (
                                     mode === 'spaced' ? (
                                          <p className="italic text-lg">{t('noSpacedPairsYet')}</p>
                                     ) : (
                                          <span className="italic text-lg">{t('noResultsFound')}</span>
                                     )
                                )}
                            </div>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="p-6 border-t dark:border-gray-700 flex justify-center gap-4">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50">{t('previous')}</button>
                            <span className="self-center">{t('pageOf', { current: currentPage, total: totalPages })}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50">{t('next')}</button>
                        </div>
                    )}
                </main>

                {isLargeScreen && (
                    <div className="w-64 flex-shrink-0 h-full border-l dark:border-gray-700">
                        <CharacterSelectionPanel title={rightTitle} characters={drawnCharacters} selectedChars={selectedRightChars} onSelectionChange={(u, s) => setSelectedRightChars(prev => { const n = new Set(prev); if (s) { n.add(u); } else { n.delete(u); } return n; })} onSelectAll={() => setSelectedRightChars(new Set(drawnCharacters.map(c => c.unicode!)))} onSelectNone={() => setSelectedRightChars(new Set())} />
                    </div>
                )}
            </div>

            <AutoKerningProgressModal isOpen={isProgressModalOpen} progress={kerningProgressValue} onStop={stopRun ?? undefined} />
            <Modal isOpen={isResetVisibleConfirmOpen} onClose={() => setIsResetVisibleConfirmOpen(false)} title={t('resetVisibleTitle')} footer={<><button onClick={() => setIsResetVisibleConfirmOpen(false)} className="px-4 py-2 bg-gray-500 text-white rounded">{t('cancel')}</button><button onClick={handleResetVisible} className="px-4 py-2 bg-red-600 text-white rounded">{t('reset')}</button></>}><p>{t('resetVisibleMessage', { count: filteredPairs.length })}</p></Modal>
        </div>
    );
};

export default React.memo(KerningSelectionView);
