import React, { useState } from 'react';
import Modal from './Modal';
import { useLocale } from '../contexts/LocaleContext';
import { useSettings } from '../contexts/SettingsContext';
import { useProject } from '../contexts/ProjectContext';

interface FontNamePromptModalProps {
    isOpen: boolean;
    /** Called after the name is set (or the question skipped); the export carries on. */
    onDone: () => void;
    onCancel: () => void;
}

/**
 * "What should your font be called?", asked once, at the first export (row 40). The name is what
 * people pick the font by in Word, Canva or on a phone. Prefilled with the current name.
 */
const FontNamePromptModal: React.FC<FontNamePromptModalProps> = ({ isOpen, onDone, onCancel }) => {
    const { t } = useLocale();
    const { settings, dispatch } = useSettings();
    const { projectName, setProjectName } = useProject();
    const follows = settings?.fontNameFollowsProject !== false;
    const [name, setName] = useState(() => (follows ? projectName : settings?.fontName) || projectName || '');

    const finish = (newName?: string) => {
        const clean = newName?.trim();
        // With "Same as project name", the project gets the name too; otherwise only the font.
        if (clean && follows && clean !== projectName) setProjectName(clean);
        dispatch({ type: 'UPDATE_SETTINGS', payload: prev => prev && { ...prev, fontNameAsked: true, ...(clean ? { fontName: clean } : {}) } });
        onDone();
    };

    return (
        <Modal isOpen={isOpen} onClose={onCancel} title={t('fontNamePromptTitle')} size="md"
            footer={<>
                <button type="button" onClick={() => finish()} className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600">{t('fontNamePromptSkip')}</button>
                <button type="submit" form="font-name-prompt" disabled={!name.trim()} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">{t('fontNamePromptUse')}</button>
            </>}>
            <form id="font-name-prompt" onSubmit={e => { e.preventDefault(); if (name.trim()) finish(name); }}>
                <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">{t('fontNamePromptBody')}</p>
                <label htmlFor="font-name-prompt-input" className="sr-only">{t('fontNameLabel')}</label>
                <input id="font-name-prompt-input" type="text" value={name} onChange={e => setName(e.target.value)} autoFocus
                    className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-600 text-lg font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:outline-none" />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('fontNamePromptLater')}</p>
            </form>
        </Modal>
    );
};

export default FontNamePromptModal;
