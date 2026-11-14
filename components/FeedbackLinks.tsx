import React from 'react';
import Modal from './Modal';
import { useLocale } from '../contexts/LocaleContext';

export const FEEDBACK_EMAIL = 'vinodh@virtualvinodh.com';
export const FEEDBACK_ISSUES_URL = 'https://github.com/virtualvinodh/Aksharajanani/issues/new';

/** A mail with the browser filled in, which is the first thing needed to look into a problem. */
const mailtoHref = (subject: string, body: string) =>
    `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${body}\n\n\n---\n${navigator.userAgent}`)}`;

/** The two ways to send feedback (MASTER_LIST 85): email for everyone, GitHub for people who use it. */
export const FeedbackLinks: React.FC<{ compact?: boolean }> = ({ compact }) => {
    const { t } = useLocale();
    const email = mailtoHref(t('feedbackMailSubject'), t('feedbackMailBody'));
    if (compact) {
        return (
            <span>
                {t('feedbackPrompt')}{' '}
                <a href={email} className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2">{t('feedbackEmailShort')}</a>
                {' · '}
                <a href={FEEDBACK_ISSUES_URL} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2">{t('feedbackGithubShort')}</a>
            </span>
        );
    }
    return (
        <div className="space-y-3">
            <p>{t('feedbackIntro')}</p>
            <a href={email} className="block rounded-lg border border-gray-300 dark:border-gray-600 p-3 hover:border-indigo-500">
                <span className="font-semibold">{t('feedbackEmail')}</span>
                <span className="block text-sm text-gray-600 dark:text-gray-400">{FEEDBACK_EMAIL}</span>
            </a>
            <a href={FEEDBACK_ISSUES_URL} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-gray-300 dark:border-gray-600 p-3 hover:border-indigo-500">
                <span className="font-semibold">{t('feedbackGithub')}</span>
                <span className="block text-sm text-gray-600 dark:text-gray-400">{t('feedbackGithubNote')}</span>
            </a>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('feedbackBackupTip')}</p>
        </div>
    );
};

export const FeedbackModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { t } = useLocale();
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('feedbackTitle')} size="md"
            footer={<button type="button" onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">{t('close')}</button>}>
            <FeedbackLinks />
        </Modal>
    );
};
