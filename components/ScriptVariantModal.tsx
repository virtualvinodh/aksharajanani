
import React, { useState, useEffect } from 'react';
import { Character, ScriptConfig } from '../types';
import { useLocale } from '../contexts/LocaleContext';
import Modal from './Modal';

export interface VariantGroup {
  optionKey: string;
  variants: Character[];
  description: string;
}

interface ScriptVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedVariants: Map<string, string>) => void;
  script: ScriptConfig;
  variantGroups: VariantGroup[];
}

const ScriptVariantModal: React.FC<ScriptVariantModalProps> = ({ isOpen, onClose, onConfirm, script, variantGroups }) => {
  const { t } = useLocale();
  const [selections, setSelections] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (isOpen) {
      const initialSelections = new Map<string, string>();
      variantGroups.forEach(group => {
        // Default to the first variant in each group
        if (group.variants.length > 0) {
          initialSelections.set(group.optionKey, group.variants[0].name);
        }
      });
      setSelections(initialSelections);
    }
  }, [isOpen, variantGroups]);

  const handleSelectionChange = (optionKey: string, name: string) => {
    setSelections(new Map(selections).set(optionKey, name));
  };

  const handleConfirm = () => {
    onConfirm(selections);
  };

  const guideStyle: React.CSSProperties = {
    fontFamily: script.guideFont?.fontName ? `'${script.guideFont.fontName}', sans-serif` : 'sans-serif',
    fontFeatureSettings: script.guideFont?.stylisticSet || 'normal',
  };
  const languageName = t(script.languagesKey || script.nameKey);

  // F11: a plain question with big samples, instead of "Configure Variants" and an unlabelled code.
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('variantQuestionTitle')}
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600">
            {t('cancel')}
          </button>
          <button type="button" onClick={handleConfirm} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">
            {t('startProject')}
          </button>
        </>
      }
    >
      <p className="mb-4 text-gray-700 dark:text-gray-300">{t('variantQuestionText', { language: languageName })}</p>
      <div className="space-y-6">
        {variantGroups.map((group, groupIndex) => (
          <fieldset key={group.optionKey}>
            <legend className="sr-only">{t('variantQuestionTitle')} {variantGroups.length > 1 ? groupIndex + 1 : ''}</legend>
            <div className="grid grid-cols-2 gap-3">
              {group.variants.map(variant => {
                const checked = selections.get(group.optionKey) === variant.name;
                return (
                  <label key={variant.name} className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${checked ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 hover:border-indigo-300'}`}>
                    <span className="text-6xl leading-tight text-gray-900 dark:text-gray-100" style={guideStyle}>
                      {variant.desc?.split(':')[1] || variant.desc}
                    </span>
                    <input
                      type="radio"
                      name={group.optionKey}
                      value={variant.name}
                      checked={checked}
                      onChange={() => handleSelectionChange(group.optionKey, variant.name)}
                      aria-label={variant.desc?.split(':')[1] || variant.desc || variant.name}
                      className="h-5 w-5 text-indigo-600 focus:ring-accent border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:checked:bg-indigo-500"
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{t('variantQuestionNote')}</p>
    </Modal>
  );
};

export default ScriptVariantModal;
