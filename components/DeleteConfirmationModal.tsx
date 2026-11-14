import React, { useMemo } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { useProject } from '../contexts/ProjectContext';
import { Character } from '../types';
import { findDependents, visibleDependents } from '../utils/deleteHelpers';
import Modal from './Modal';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  character: Character;
  isStandardGlyph?: boolean;
  /** Not used any more: the dialog finds and names the letters built from this one itself. */
  dependentCount?: number;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, character, isStandardGlyph = false }) => {
  const { t } = useLocale();
  const { characterSets } = useProject();

  // Letters built from this one (linked, copied, or with an accent), named (F36).
  const dependentNames = useMemo(
    () => isOpen ? visibleDependents(findDependents(characterSets, new Set([character.name]))).map(c => c.name) : [],
    [isOpen, characterSets, character.name]
  );
  const shown = dependentNames.slice(0, 6).join(', ');
  const list = dependentNames.length > 6 ? t('deleteDependentsMore', { list: shown, count: dependentNames.length - 6 }) : shown;

  const message = isStandardGlyph
    ? t('deleteStandardGlyphMessage', { name: character.name })
    : t('deleteGlyphMessage', { name: character.name });
  
  const titleColor = isStandardGlyph ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('deleteGlyphTitle')}
      titleClassName={titleColor}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors">
            {t('cancel')}
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">
            {t('delete')}
          </button>
        </>
      }
    >
      <p>{message}</p>
      {dependentNames.length > 0 && (
        <p className="mt-4 text-gray-700 dark:text-gray-300" data-testid="delete-dependents">
            {t('deleteDependencyWarning', { list, name: character.name })}
        </p>
      )}
    </Modal>
  );
};

export default React.memo(DeleteConfirmationModal);
