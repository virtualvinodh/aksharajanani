
import React from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { SpinnerIcon } from '../constants';

interface AutoKerningProgressModalProps {
  isOpen: boolean;
  progress: number;
  /** Stop the run, keeping what has been measured so far (F43). */
  onStop?: () => void;
}

const AutoKerningProgressModal: React.FC<AutoKerningProgressModalProps> = ({ isOpen, progress, onStop }) => {
  const { t } = useLocale();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-gray-900/80 z-50 flex items-center justify-center p-4 animate-fade-in-up" style={{ animationDuration: '0.2s' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title" onKeyDown={e => { if (e.key === 'Escape' && onStop) onStop(); }} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
            <SpinnerIcon />
            <h2 id="modal-title" className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('autoKerningInProgress')}
            </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{t('autoKerningStarted')}</p>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
          <div
            className="bg-indigo-600 h-4 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          ></div>
        </div>
        <p className="mt-2 text-lg font-semibold text-indigo-600 dark:text-indigo-400">{progress}%</p>
        {onStop && (
          <div className="mt-4">
            <button type="button" onClick={onStop} autoFocus className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg">{t('autoKerningStop')}</button>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('autoKerningStopHint')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(AutoKerningProgressModal);
