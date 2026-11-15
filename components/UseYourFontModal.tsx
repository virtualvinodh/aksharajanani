import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useLocale } from '../contexts/LocaleContext';
import { renderFormattedText } from '../utils/formattedText';
import { DonateIcon, DONATE_URL } from '../constants';
import { FeedbackLinks } from './FeedbackLinks';

/** Donations are asked for once, the first time someone gets a font out (MASTER_LIST 26). */
const DONATE_ASKED_KEY = 'donateAskedAfterExport';
const donationNotAskedYet = (): boolean => {
    try { return localStorage.getItem(DONATE_ASKED_KEY) !== 'true'; } catch { return false; }
};

export const USE_YOUR_FONT_DISMISSED_KEY = 'useYourFontDismissed';

/** Shown after export unless turned off: is it worth opening? */
export const shouldShowUseYourFont = (): boolean => {
    try { return localStorage.getItem(USE_YOUR_FONT_DISMISSED_KEY) !== 'true'; } catch { return true; }
};

const PLACES = ['Windows', 'Mac', 'Word', 'Canva', 'Phone', 'Web'] as const;

interface UseYourFontModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileName?: string;
    /** Something the person should know about this font, e.g. rules that were left out. */
    warning?: string;
    /** Downloads the same font as WOFF2 or TTF; resolves to the file name (M11). */
    onOtherFormat?: (format: 'woff2' | 'ttf') => Promise<string>;
}

/** The OTF that was downloaded, also as WOFF2 (websites) or TTF (older apps). */
const OtherFormats: React.FC<{ onOtherFormat: (format: 'woff2' | 'ttf') => Promise<string> }> = ({ onOtherFormat }) => {
    const { t } = useLocale();
    const [busy, setBusy] = useState<'woff2' | 'ttf' | null>(null);
    const [done, setDone] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const get = async (format: 'woff2' | 'ttf') => {
        setBusy(format); setFailed(false); setDone(null);
        try { setDone(await onOtherFormat(format)); } catch (e) { console.error(e); setFailed(true); } finally { setBusy(null); }
    };
    const button = (format: 'woff2' | 'ttf', label: string) => (
        <button type="button" onClick={() => get(format)} disabled={!!busy}
            className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 hover:border-indigo-500 disabled:opacity-50">
            {busy === format ? t('fontFormatPreparing') : label}
        </button>
    );
    return (
        <div className="mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('fontFormatOther')}</p>
            <div className="flex flex-wrap gap-2">
                {button('woff2', t('fontFormatWoff2'))}
                {button('ttf', t('fontFormatTtf'))}
            </div>
            {done && <p className="mt-2 text-sm text-green-700 dark:text-green-400" role="status">{t('fontFormatDownloaded', { file: done })}</p>}
            {failed && <p className="mt-2 text-sm text-red-600" role="alert">{t('fontFormatFailed')}</p>}
        </div>
    );
};

/** After export: where the file went and how to use it, per place people use fonts (UX §8, M5). */
const UseYourFontModal: React.FC<UseYourFontModalProps> = ({ isOpen, onClose, fileName, warning, onOtherFormat }) => {
    const { t } = useLocale();
    const [place, setPlace] = useState<typeof PLACES[number]>(() => {
        const ua = navigator.userAgent;
        if (/iPhone|iPad|Android/.test(ua)) return 'Phone';
        // iPads ask for desktop pages and say they're a Mac; only they have a touch screen.
        if (/Mac/.test(ua)) return navigator.maxTouchPoints > 1 ? 'Phone' : 'Mac';
        return 'Windows';
    });
    const [dontShow, setDontShow] = useState(false);
    // Decided once when the dialog opens, so it doesn't vanish while being read.
    const [askForDonation] = useState(donationNotAskedYet);
    useEffect(() => {
        if (isOpen && askForDonation) { try { localStorage.setItem(DONATE_ASKED_KEY, 'true'); } catch { /* storage blocked */ } }
    }, [isOpen, askForDonation]);

    const close = () => {
        if (dontShow) { try { localStorage.setItem(USE_YOUR_FONT_DISMISSED_KEY, 'true'); } catch { /* storage blocked */ } }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={close} title={t('useYourFontTitle')} size="xl"
            footer={
                <div className="w-full flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                        <input type="checkbox" checked={dontShow} onChange={e => setDontShow(e.target.checked)} className="h-4 w-4 rounded border-gray-300 dark:border-gray-600" />
                        {t('useYourFontDontShow')}
                    </label>
                    <button type="button" onClick={close} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">{t('close')}</button>
                </div>
            }>
            {warning && <p role="alert" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700 p-3 text-sm">{warning}</p>}
            <p className="mb-4">{renderFormattedText(t('useYourFontIntro', { file: fileName || t('useYourFontTheFile') }))}</p>
            <div className="flex flex-wrap gap-2 mb-3" role="tablist">
                {PLACES.map(p => (
                    <button key={p} type="button" role="tab" aria-selected={place === p} onClick={() => setPlace(p)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${place === p ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500'}`}>
                        {t(`useYourFontPlace${p}`)}
                    </button>
                ))}
            </div>
            <div role="tabpanel" className="rounded-lg bg-gray-50 dark:bg-gray-900/50 p-4 leading-relaxed">
                {renderFormattedText(t(`useYourFontHow${place}`))}
            </div>
            {onOtherFormat && <OtherFormats onOtherFormat={onOtherFormat} />}
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{renderFormattedText(t('useYourFontUpdating'))}</p>
            {/* Said here rather than in a message, which would cover this dialog on a phone. */}
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{renderFormattedText(t('backupReminderAfterExport'))}</p>
            {askForDonation && (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 p-4">
                    <p className="flex-grow text-sm">{renderFormattedText(t('donateAfterExport'))}</p>
                    <a href={DONATE_URL} target="_blank" rel="noopener noreferrer"
                        className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 flex-shrink-0">
                        <DonateIcon /> {t('donateAction')}
                    </a>
                </div>
            )}
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400"><FeedbackLinks compact /></p>
        </Modal>
    );
};

export default UseYourFontModal;
