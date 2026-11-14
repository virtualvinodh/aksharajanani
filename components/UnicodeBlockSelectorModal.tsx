
import React, { useState, useEffect, useMemo } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import Modal from './Modal';
import { UnicodeBlock, Character } from '../types';
import { getUnicodeBlocks, getAssignedCodepointsInBlock } from '../services/unicodeService';
import { SpinnerIcon } from '../constants';
import { useLayout } from '../contexts/LayoutContext';

import UnicodeProperties from 'unicode-properties';

interface UnicodeBlockSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 'pick' hands the characters back (starting an empty project); 'addBlocks' adds them to the open project. */
  mode: 'pick' | 'addBlocks';
  // For 'pick' mode
  onPick?: (chars: Character[], blockNames: string[]) => void;
  // For 'addBlocks' mode
  onAddBlock?: (chars: Character[]) => void;
  onCheckExists?: (unicode: number) => boolean;
}

const UnicodeBlockSelectorModal: React.FC<UnicodeBlockSelectorModalProps> = ({ 
  isOpen, onClose, mode, onPick, onAddBlock, onCheckExists
}) => {
  const { t } = useLocale();
  const { showNotification } = useLayout();
  const [blocks, setBlocks] = useState<UnicodeBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isConfirmingAdd, setIsConfirmingAdd] = useState(false);
  const [pendingCharacters, setPendingCharacters] = useState<Character[] | null>(null);
  
  const formId = "unicode-block-selector-form";

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setSearchTerm('');
      setSelectedBlocks(new Set());
      setIsConfirmingAdd(false);
      setPendingCharacters(null);
      getUnicodeBlocks().then(data => {
        setBlocks(data);
        setIsLoading(false);
      });
    }
  }, [isOpen]);

  const filteredBlocks = useMemo(() => {
    if (!searchTerm) return blocks;
    return blocks.filter(block => block.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [blocks, searchTerm]);

  const handleToggleBlock = (blockName: string) => {
    setSelectedBlocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blockName)) {
        newSet.delete(blockName);
      } else {
        newSet.add(blockName);
      }
      return newSet;
    });
  };
  
  const handleConfirmAdd = () => {
    if (pendingCharacters) handOver(pendingCharacters);
    onClose();
  };
  
  const handleCancelConfirm = () => {
    setIsConfirmingAdd(false);
    setPendingCharacters(null);
  };

  const selectedBlockNames = () => blocks.filter(b => selectedBlocks.has(b.name)).map(b => b.name);

  const handOver = (chars: Character[]) => {
    if (mode === 'pick') onPick?.(chars, selectedBlockNames());
    else onAddBlock?.(chars);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBlocks.size === 0) return;

    const selectedBlockObjects = blocks.filter(b => selectedBlocks.has(b.name));
    const allCodepoints: number[] = selectedBlockObjects.flatMap(block => getAssignedCodepointsInBlock(block));
    
    const uniqueCodepoints = [...new Set(allCodepoints)];

    const allCharacters: Character[] = uniqueCodepoints
      .filter((cp: number) => (mode === 'addBlocks' && onCheckExists) ? !onCheckExists(cp) : true)
      .map(cp => {
        const category = UnicodeProperties.getCategory(cp);
        const glyphClass = (category === 'Mn' || category === 'Mc' || category === 'Me') ? 'mark' : 'base';
        
        const newChar: Character = {
          unicode: cp,
          name: String.fromCodePoint(cp),
          glyphClass: glyphClass,
          isCustom: true,
        };
        
        if (category === 'Mn') {
            newChar.advWidth = 0;
        }
        return newChar;
    });

    const hasMarks = allCharacters.some(c => c.glyphClass === 'mark');

    if (mode === 'addBlocks' && allCharacters.length === 0) {
        showNotification(t('allGlyphsFromBlockExist'), 'info');
        onClose();
        return;
    }

    if (hasMarks) {
        setPendingCharacters(allCharacters);
        setIsConfirmingAdd(true);
    } else {
        handOver(allCharacters);
        onClose();
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={isConfirmingAdd ? handleCancelConfirm : onClose}
      title={isConfirmingAdd ? t('incompleteFontTitle') : (mode === 'addBlocks' ? t('addBlockModalTitle') : t('unicodeBlockSelectorTitle'))}
      size="lg"
      footer={isConfirmingAdd ? (
          <>
            <button type="button" onClick={handleCancelConfirm} className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors">{t('cancel')}</button>
            <button type="button" onClick={handleConfirmAdd} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors">{mode === 'addBlocks' ? t('addBlockAction') : t('unicodeBlockPickAction')}</button>
          </>
        ) : (
          <>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors">{t('cancel')}</button>
            <button type="submit" form={formId} disabled={isLoading || selectedBlocks.size === 0} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400">{mode === 'addBlocks' ? t('addBlockAction') : t('unicodeBlockPickAction')}</button>
          </>
        )
      }
    >
      {isConfirmingAdd ? (
        <p>{t('warningAddBlockWithMarks')}</p>
      ) : (
        <form id={formId} onSubmit={handleSubmit} className="flex flex-col h-[70vh]">
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{t('unicodeBlockSelectorDescription')}</p>
          {isLoading ? (
            <div className="flex items-center justify-center flex-grow">
              <SpinnerIcon />
              <span className="ml-2">{t('loadingUnicodeBlocks')}</span>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('searchBlocks')}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-2 mb-2 flex-shrink-0"
              />
              <div className="flex-grow overflow-y-auto border rounded-md p-2 dark:border-gray-600">
                {filteredBlocks.map(block => (
                  <label key={`${block.start}-${block.end}`} className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBlocks.has(block.name)}
                      onChange={() => handleToggleBlock(block.name)}
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-accent border-gray-300 dark:border-gray-600 dark:bg-gray-900"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                      {block.name}
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                        (U+{block.start.toString(16).toUpperCase()}..U+{block.end.toString(16).toUpperCase()})
                      </span>
                    </span>
                  </label>
                ))}
                {filteredBlocks.length === 0 && <p className="text-sm text-center text-gray-500 py-4">{t('noResultsFound')}</p>}
              </div>
            </>
          )}
        </form>
      )}
    </Modal>
  );
};

export default UnicodeBlockSelectorModal;
