
import React from 'react';
import { useLocale } from '../contexts/LocaleContext';
import Modal from './Modal';

interface IncompleteFontWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** How many letters, placements and spacing pairs are still to do. */
  status: {
    drawing: number;
    positioning: number;
    kerning: number;
  };
}

/** Before exporting an unfinished font: say what's missing in numbers, and let the user carry on either way. */
const IncompleteFontWarningModal: React.FC<IncompleteFontWarningModalProps> = ({ isOpen, onClose, onConfirm, status }) => {
  const { t } = useLocale();

  const lines: string[] = [];
  const line = (key: string, count: number) => t(count === 1 ? `${key}One` : key, { count });
  if (status.drawing > 0) lines.push(line('incompleteLettersLine', status.drawing));
  if (status.positioning > 0) lines.push(line('incompletePlacementLine', status.positioning));
  if (status.kerning > 0) lines.push(line('incompleteSpacingLine', status.kerning));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('exportIncompleteTitle')}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-gray-700 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 text-gray-800 dark:text-white font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
            {t('keepWorking')}
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
            {t('exportWhatIHave')}
          </button>
        </>
      }
    >
      <ul className="list-disc pl-5 space-y-1">
        {lines.map(line => <li key={line}>{line}</li>)}
      </ul>
      <p className="mt-3">{t('incompleteFontNote')}</p>
    </Modal>
  );
};

export default React.memo(IncompleteFontWarningModal);
