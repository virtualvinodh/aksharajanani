
import React from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import { useProject } from '../../contexts/ProjectContext';
import { TransformIcon, SettingsIcon, TrashIcon, CloseIcon, CheckCircleIcon, CopyIcon, PasteIcon } from '../../constants';

interface DrawingBatchToolbarProps {
    selectionSize: number;
    onSelectAll: () => void;
    onSelectNone: () => void;
    onTransform: () => void;
    onProperties: () => void;
    onDelete: () => void;
    onClose: () => void;
    showAccept?: boolean;
    onAccept?: () => void;
    showTransform?: boolean;
    onCopy?: () => void;
    onPaste?: () => void;
    clipboardSize?: number;
    isSelectionVirtual?: boolean;
}

const DrawingBatchToolbar: React.FC<DrawingBatchToolbarProps> = (props) => {
    const { t } = useLocale();
    const { script } = useProject();

    const getCopyTooltip = () => {
        if (props.isSelectionVirtual) return t('cannotCopyVirtual');
        return t('copySelection');
    };

    const getPasteTooltip = () => {
        if (props.isSelectionVirtual) return t('cannotPasteVirtual');
        if (props.clipboardSize && props.selectionSize !== props.clipboardSize) {
            return t('pasteCountMismatch', { target: props.selectionSize, source: props.clipboardSize });
        }
        return t('pasteSelection');
    };

    const btn = 'flex items-center gap-2 px-3 py-2 text-white font-bold text-sm rounded-xl disabled:opacity-30 transition-all shadow-md active:scale-95';
    const label = 'hidden @3xl:inline';
    const pasteDisabled = props.selectionSize === 0 || props.isSelectionVirtual || props.selectionSize !== props.clipboardSize;

    // Sits at the bottom of the letter grid, not over the whole window, so with a letter open next
    // to the grid it never covers the editor's Back button or title (F15). It sizes to the grid's
    // width (container queries): names show when there's room, icons with tooltips otherwise.
    return (
        <div className="@container absolute inset-x-0 bottom-3 flex justify-center z-[60] px-2 pointer-events-none">
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2 flex flex-wrap items-center justify-center gap-2 @2xl:gap-3 pointer-events-auto animate-fade-in-up max-w-4xl">

                {/* How many are selected, and select all / none */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 flex-shrink-0" aria-label={t('selectedCount', { count: props.selectionSize })}>
                        <span className="font-black text-sm">{props.selectionSize}</span>
                    </div>
                    <button onClick={props.onSelectAll} className="px-2 py-1 text-[11px] font-bold uppercase tracking-tight bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                        {t('selectAll')}
                    </button>
                    <button onClick={props.onSelectNone} disabled={props.selectionSize === 0} className="px-2 py-1 text-[11px] font-bold uppercase tracking-tight bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-30 transition-colors">
                        {t('selectNone')}
                    </button>
                </div>

                {/* What to do with them */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                    {props.showAccept && (
                        <button onClick={props.onAccept} disabled={props.selectionSize === 0} title={t('acceptAllDefaults')} aria-label={t('acceptAllDefaults')}
                            className={`${btn} bg-green-600 hover:bg-green-700`}>
                            <CheckCircleIcon className="w-4 h-4" />
                            <span className={label}>{t('acceptAllDefaults')}</span>
                        </button>
                    )}
                    {props.onCopy && (
                        <button onClick={props.onCopy} disabled={props.selectionSize === 0 || props.isSelectionVirtual} title={getCopyTooltip()} aria-label={t('copy')}
                            className={`${btn} bg-blue-600 hover:bg-blue-700`}>
                            <CopyIcon className="w-4 h-4" />
                            <span className={label}>{t('copy')}</span>
                        </button>
                    )}
                    {/* Only when something was copied ("&&" with a 0 count would print a bare "0"). */}
                    {props.onPaste && (props.clipboardSize ?? 0) > 0 && (
                        <button onClick={props.onPaste} disabled={pasteDisabled} title={getPasteTooltip()} aria-label={t('paste')}
                            className={`${btn} bg-blue-600 hover:bg-blue-700`}>
                            <PasteIcon className="w-4 h-4" />
                            <span className={label}>{t('paste')} ({props.clipboardSize})</span>
                        </button>
                    )}
                    {props.showTransform && (
                        <button onClick={props.onTransform} disabled={props.selectionSize === 0} title={t('transform')} aria-label={t('transform')}
                            className={`${btn} bg-teal-600 hover:bg-teal-700`}>
                            <TransformIcon className="w-4 h-4" />
                            <span className={label}>{t('transform')}</span>
                        </button>
                    )}
                    <button onClick={props.onProperties} disabled={props.selectionSize === 0} title={t('editProperties')} aria-label={t('editProperties')}
                        className={`${btn} bg-indigo-600 hover:bg-indigo-700`}>
                        <SettingsIcon className="w-4 h-4" />
                        <span className={label}>{t('editProperties')}</span>
                    </button>
                    <button onClick={props.onDelete} disabled={props.selectionSize === 0 || script?.isImportedFont}
                        title={script?.isImportedFont ? t('deletionDisabledImported') : t('delete')} aria-label={t('delete')}
                        className={`${btn} bg-red-600 hover:bg-red-700`}>
                        <TrashIcon className="w-4 h-4" />
                        <span className={label}>{t('delete')}</span>
                    </button>
                    <button onClick={props.onClose} title={t('exitSelectionMode')} aria-label={t('exitSelectionMode')}
                        className="p-2 bg-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(DrawingBatchToolbar);
