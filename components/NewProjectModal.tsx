
import React, { useState, useEffect } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { Character } from '../types';
import Modal from './Modal';
import UnicodeBlockSelectorModal from './UnicodeBlockSelectorModal';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: NewProjectData) => void;
  /** Open the Unicode table straight away (from the language list's "Can't find it?"). */
  openTableOnStart?: boolean;
}

export interface NewProjectData {
    projectName: string;
    fontFamily: string;
    upm: number;
    ascender: number;
    descender: number;
    includeLatin: boolean;
    /** Characters picked from the Unicode table, if any. */
    extraCharacters: Character[];
}

const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

/**
 * An empty project: numbers and punctuation, optionally English letters, and optionally any
 * characters from the Unicode table. The table used to be its own way to start; it lives here
 * now, as a step most people skip.
 */
const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, onConfirm, openTableOnStart }) => {
  const { t } = useLocale();

  const [projectName, setProjectName] = useState('My New Font');
  const [fontFamily, setFontFamily] = useState('MyFont');
  const [upm, setUpm] = useState(1000);
  const [ascender, setAscender] = useState(800);
  const [descender, setDescender] = useState(-200);
  const [includeLatin, setIncludeLatin] = useState(true);
  const [extraCharacters, setExtraCharacters] = useState<Character[]>([]);
  const [extraBlockNames, setExtraBlockNames] = useState<string[]>([]);
  const [isTableOpen, setIsTableOpen] = useState(false);

  useEffect(() => {
      if (!isOpen) return;
      setExtraCharacters([]);
      setExtraBlockNames([]);
      setIsTableOpen(!!openTableOnStart);
  }, [isOpen, openTableOnStart]);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onConfirm({ projectName, fontFamily, upm, ascender, descender, includeLatin, extraCharacters });
  };

  const handlePicked = (chars: Character[], blockNames: string[]) => {
      // Picking again adds to what's there.
      setExtraCharacters(prev => {
          const seen = new Set(prev.map(c => c.unicode));
          return [...prev, ...chars.filter(c => !seen.has(c.unicode))];
      });
      setExtraBlockNames(prev => [...prev, ...blockNames.filter(n => !prev.includes(n))]);
  };

  const removePicked = () => { setExtraCharacters([]); setExtraBlockNames([]); };

  const numberInput = (id: string, label: string, value: number, set: (v: number) => void) => (
      <div>
          <label htmlFor={id} className={labelClass}>{label}</label>
          <input id={id} type="number" value={Number.isFinite(value) ? value : ''} onChange={(e) => set(parseInt(e.target.value))} className={inputClass} required />
      </div>
  );

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('newProjectTitle')}
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors">
            {t('cancel')}
          </button>
          <button type="submit" form="new-project-form" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
            {t('startProject')}
          </button>
        </>
      }
    >
      <form id="new-project-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label htmlFor="project-name" className={labelClass}>{t('newProjectName')}</label>
            <input id="project-name" type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} className={inputClass} required />
        </div>
        <div>
            <label htmlFor="font-family" className={labelClass}>{t('fontFamily')}</label>
            <input id="font-family" type="text" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className={inputClass} required />
        </div>

        <fieldset className="pt-2 space-y-3">
            <legend className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('newProjectCharactersTitle')}</legend>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('newProjectAlwaysIncluded')}</p>
            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={includeLatin}
                    onChange={(e) => setIncludeLatin(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-accent border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('includeLatinLetters')}</span>
            </label>
            {extraCharacters.length > 0 && (
                <div className="flex items-start justify-between gap-3 rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 text-sm text-gray-800 dark:text-gray-200">
                    <span>{t('newProjectPickedSummary', { count: extraCharacters.length, blocks: extraBlockNames.join(', ') })}</span>
                    <button type="button" onClick={removePicked} className="flex-shrink-0 text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:no-underline">{t('remove')}</button>
                </div>
            )}
            <button type="button" onClick={() => setIsTableOpen(true)} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:no-underline">
                {extraCharacters.length > 0 ? t('newProjectAddMoreFromTable') : t('newProjectAddFromTable')}
            </button>
        </fieldset>

        <details className="pt-2">
            <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400">{t('newProjectFontUnits')}</summary>
            <div className="grid grid-cols-3 gap-4 mt-3">
                {numberInput('upm', t('upm'), upm, setUpm)}
                {numberInput('ascender', t('ascender'), ascender, setAscender)}
                {numberInput('descender', t('descender'), descender, setDescender)}
            </div>
        </details>
      </form>
    </Modal>
    {/* After the dialog above, so it sits on top of it. */}
    <UnicodeBlockSelectorModal
        isOpen={isOpen && isTableOpen}
        onClose={() => setIsTableOpen(false)}
        mode="pick"
        onPick={handlePicked}
    />
    </>
  );
};

export default NewProjectModal;
