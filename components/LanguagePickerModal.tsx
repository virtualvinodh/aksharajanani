import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { useLocale } from '../contexts/LocaleContext';
import { CharacterDefinition, ScriptConfig } from '../types';
import { SearchIcon, SpinnerIcon } from '../constants';
import { appUrl, resolveAppUrl } from '../utils/appUrl';
import {
    LanguageData, LanguageEntry, buildLanguageScript, buildLanguageSets, builtInScriptFor,
    capitalsFor, displayName, lettersMissingFrom, loadLanguageData, searchLanguages, splitChars,
} from '../services/languageService';

interface LanguagePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** The app's own scripts, to point to a ready-made set when there is one. */
    scripts: ScriptConfig[];
    /** Template for metrics, grid and test page (the Latin script). */
    template?: ScriptConfig;
    onStart: (script: ScriptConfig) => void;
    onUseBuiltIn: (script: ScriptConfig) => void;
    onOpenUnicodeTable: () => void;
}

const fetchSets = async (path: string): Promise<CharacterDefinition[]> => {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to fetch ${path}`);
    return res.json();
};

/** A combining mark on its own is shown on a dotted circle, as in the rest of the app. */
const shown = (ch: string) => (/^[\p{Mn}\p{Me}]$/u.test(ch) ? `◌${ch}` : ch);

const LetterChips: React.FC<{
    letters: string[];
    selected: Set<string>;
    onToggle: (ch: string) => void;
    fontFamily?: string;
    rtl?: boolean;
}> = ({ letters, selected, onToggle, fontFamily, rtl }) => (
    <div className="flex flex-wrap gap-1.5" dir={rtl ? 'rtl' : undefined}>
        {letters.map(ch => {
            const on = selected.has(ch);
            return (
                <button
                    key={ch}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onToggle(ch)}
                    className={`min-w-9 h-9 px-1.5 rounded-md border text-lg leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${on
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white dark:bg-gray-900 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'}`}
                    style={{ fontFamily }}
                >
                    {shown(ch)}
                </button>
            );
        })}
    </div>
);

const LanguagePickerModal: React.FC<LanguagePickerModalProps> = ({ isOpen, onClose, scripts, template, onStart, onUseBuiltIn, onOpenUnicodeTable }) => {
    const { t } = useLocale();
    const [data, setData] = useState<LanguageData | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [query, setQuery] = useState('');
    const [lang, setLang] = useState<LanguageEntry | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [withCapitals, setWithCapitals] = useState(true);
    const [extra, setExtra] = useState('');
    const [withEnglish, setWithEnglish] = useState(false);
    const [isStarting, setIsStarting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setQuery('');
        setLang(null);
        setIsStarting(false);
        setLoadError(false);
        loadLanguageData().then(setData).catch(() => setLoadError(true));
    }, [isOpen]);

    const results = useMemo(() => (data ? searchLanguages(data, query) : []), [data, query]);

    const ws = lang && data ? data.scripts[lang.script] : undefined;
    const letters = useMemo(() => splitChars(lang?.letters), [lang]);
    const capitals = useMemo(() => (lang?.caps ? capitalsFor(letters, lang.code) : []), [lang, letters]);
    const more = useMemo(() => splitChars(lang?.more), [lang]);
    const punct = useMemo(() => splitChars(lang?.punct), [lang]);
    const builtIn = lang ? builtInScriptFor(lang, scripts) : undefined;
    // The ready-made set's letters it lacks for this language (null until its letter list is loaded).
    const [builtInMissing, setBuiltInMissing] = useState<string[] | null>(null);
    useEffect(() => {
        setBuiltInMissing(null);
        if (!lang || !builtIn) return;
        let cancelled = false;
        fetchSets(appUrl(`data/characters_${builtIn.id}.json`))
            .then(defs => {
                const have = new Set(defs.flatMap(d => ('characters' in d ? d.characters.map(c => c.name) : [])));
                if (!cancelled) setBuiltInMissing(lettersMissingFrom(lang, have));
            })
            .catch(() => { /* no suggestion then */ });
        return () => { cancelled = true; };
    }, [lang, builtIn]);
    // Suggest the ready-made set when it has every letter, or when its letters join (its joining
    // rules are worth more than a few letters the user can add); then say which letters it lacks.
    const suggestBuiltIn = !!builtIn && builtInMissing !== null && (builtInMissing.length === 0 || !!ws?.complex);
    const guideFamily = ws?.font ? `'${ws.font.fontName}', 'Noto Sans', sans-serif` : undefined;

    // Show each language's letters in its guide font while choosing.
    useEffect(() => {
        if (!ws?.font) return;
        const face = new FontFace(ws.font.fontName, `url(${JSON.stringify(resolveAppUrl(ws.font.fontUrl))})`);
        face.load().then(f => document.fonts.add(f)).catch(() => { /* the system font is fine */ });
    }, [ws]);

    const chooseLanguage = (l: LanguageEntry) => {
        setLang(l);
        setSelected(new Set(splitChars(l.letters)));
        setWithCapitals(true);
        setExtra('');
        setWithEnglish(false);
    };

    const toggle = (ch: string) => setSelected(prev => {
        const next = new Set(prev);
        if (next.has(ch)) next.delete(ch); else next.add(ch);
        return next;
    });
    const setAll = (chars: string[], on: boolean) => setSelected(prev => {
        const next = new Set(prev);
        chars.forEach(c => (on ? next.add(c) : next.delete(c)));
        return next;
    });

    const extraChars = useMemo(() => splitChars(extra).filter(c => c.trim() !== ''), [extra]);

    const chosen = useMemo(() => {
        if (!lang) return { letters: [] as string[], punct: [] as string[] };
        const picked = [...letters, ...more].filter(c => selected.has(c));
        const caps = withCapitals ? capitalsFor(picked, lang.code) : [];
        return {
            letters: [...picked, ...caps, ...extraChars],
            punct: punct.filter(c => selected.has(c)),
        };
    }, [lang, letters, more, punct, selected, withCapitals, extraChars]);

    const sets = useMemo(() => (data && lang ? buildLanguageSets(chosen.letters, chosen.punct, data.marks) : null), [data, lang, chosen]);

    const handleStart = async () => {
        if (!data || !lang || !sets || !template) return;
        setIsStarting(true);
        try {
            const extraSets = [...await fetchSets(appUrl('data/characters_basic.json'))];
            if (withEnglish) extraSets.push(...await fetchSets(appUrl('data/characters_latin.json')));
            onStart(buildLanguageScript(lang, data, template, sets.definitions, extraSets));
            onClose();
        } catch (e) {
            console.error('Could not start the language project', e);
            setIsStarting(false);
        }
    };

    const group = (title: string, chars: string[], extraControl?: React.ReactNode) => chars.length > 0 && (
        <section className="mb-4">
            <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
                <div className="flex items-center gap-3 text-xs">
                    <button type="button" className="text-indigo-600 dark:text-indigo-400 hover:underline" onClick={() => setAll(chars, true)}>{t('selectAll')}</button>
                    <button type="button" className="text-indigo-600 dark:text-indigo-400 hover:underline" onClick={() => setAll(chars, false)}>{t('selectNone')}</button>
                </div>
            </div>
            <LetterChips letters={chars} selected={selected} onToggle={toggle} fontFamily={guideFamily} rtl={ws?.rtl} />
            {extraControl}
        </section>
    );

    const footer = lang ? (
        <>
            <button type="button" onClick={() => setLang(null)} className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors">{t('back')}</button>
            <button type="button" onClick={handleStart} disabled={isStarting || !sets || sets.drawCount === 0} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 flex items-center gap-2">
                {isStarting && <SpinnerIcon />}{t('startProject')}
            </button>
        </>
    ) : (
        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors">{t('cancel')}</button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" footer={footer}
            title={lang ? displayName(lang) : t('languagePickerTitle')}>
            {!lang ? (
                <div className="flex flex-col h-[65vh]">
                    <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">{t('languagePickerSearchHint')}</p>
                    <div className="relative mb-2 flex-shrink-0">
                        <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            autoFocus
                            type="search"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && results[0]) chooseLanguage(results[0]); }}
                            placeholder={t('languagePickerSearchPlaceholder')}
                            aria-label={t('languagePickerSearchPlaceholder')}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-9 pr-3"
                        />
                    </div>
                    <div className="flex-grow overflow-y-auto border rounded-md dark:border-gray-600" role="list">
                        {loadError ? (
                            <p className="p-4 text-sm text-red-600 dark:text-red-400">{t('languagePickerLoadError')}</p>
                        ) : !data ? (
                            <div className="flex items-center justify-center h-full gap-2 text-gray-500"><SpinnerIcon /> {t('loading')}</div>
                        ) : results.length === 0 ? (
                            <p className="p-4 text-sm text-gray-500 dark:text-gray-400">{t('languagePickerNoResults')}</p>
                        ) : results.map(l => (
                            <button
                                key={l.code}
                                type="button"
                                role="listitem"
                                onClick={() => chooseLanguage(l)}
                                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-indigo-50 dark:focus:bg-gray-700 border-b last:border-b-0 border-gray-100 dark:border-gray-700"
                            >
                                <span className="min-w-0">
                                    <span className="font-medium text-gray-900 dark:text-white">{displayName(l)}</span>
                                    {l.native && <span className="ml-2 text-sm text-gray-500 dark:text-gray-400" lang={l.code}>{l.native}</span>}
                                </span>
                                <span className="flex-shrink-0 text-gray-400 dark:text-gray-500" lang={l.code} aria-hidden="true">
                                    {splitChars(l.letters).filter(c => !/\p{M}/u.test(c)).slice(0, 4).join(' ')}
                                </span>
                            </button>
                        ))}
                    </div>
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                        {t('languagePickerCantFind')}{' '}
                        <button type="button" onClick={() => { onClose(); onOpenUnicodeTable(); }} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                            {t('languagePickerUnicodeTable')}
                        </button>
                    </p>
                </div>
            ) : (
                <div className="max-h-[65vh] overflow-y-auto pr-1">
                    {lang.native && <p className="mb-3 text-gray-500 dark:text-gray-400" lang={lang.code} style={{ fontFamily: guideFamily }}>{lang.native}</p>}

                    {suggestBuiltIn && builtIn && (
                        <div className="mb-4 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 p-3 text-sm text-indigo-900 dark:text-indigo-100 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                            <span>
                                {t('languagePickerBuiltIn', { language: displayName(lang) })}
                                {builtInMissing && builtInMissing.length > 0 && (
                                    <> {t('languagePickerBuiltInMissing', { letters: builtInMissing.map(shown).join(' ') })}</>
                                )}
                            </span>
                            <button type="button" onClick={() => { onClose(); onUseBuiltIn(builtIn); }} className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                                {t('languagePickerUseBuiltIn')}
                            </button>
                        </div>
                    )}
                    {!suggestBuiltIn && ws?.complex && (
                        <div className="mb-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-3 text-sm text-amber-900 dark:text-amber-100">
                            {t('languagePickerComplex', { language: displayName(lang) })}
                        </div>
                    )}

                    {group(t('languagePickerLetters'), letters, capitals.length > 0 && (
                        <label className="mt-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={withCapitals} onChange={e => setWithCapitals(e.target.checked)} className="h-4 w-4 rounded text-indigo-600 border-gray-300 dark:border-gray-600" />
                            {t('languagePickerCapitals')}
                            <span className="text-gray-400" style={{ fontFamily: guideFamily }}>{capitals.slice(0, 3).join(' ')}…</span>
                        </label>
                    ))}
                    {group(t('languagePickerMore'), more)}
                    {group(t('languagePickerPunctuation'), punct)}

                    <section className="mb-4">
                        <label htmlFor="language-extra" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">{t('languagePickerExtra')}</label>
                        <input
                            id="language-extra"
                            type="text"
                            value={extra}
                            onChange={e => setExtra(e.target.value)}
                            placeholder={t('languagePickerExtraPlaceholder')}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-lg"
                            style={{ fontFamily: guideFamily }}
                        />
                    </section>

                    {lang.script !== 'Latn' && (
                        <label className="mb-4 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={withEnglish} onChange={e => setWithEnglish(e.target.checked)} className="h-4 w-4 rounded text-indigo-600 border-gray-300 dark:border-gray-600" />
                            {t('languagePickerAddEnglish')}
                        </label>
                    )}

                    {sets && (
                        <p className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
                            {sets.builtCount > 0
                                ? t('languagePickerSummary', { draw: sets.drawCount, built: sets.builtCount })
                                : t('languagePickerSummaryNoBuilt', { draw: sets.drawCount })}
                        </p>
                    )}
                </div>
            )}
        </Modal>
    );
};

export default LanguagePickerModal;
