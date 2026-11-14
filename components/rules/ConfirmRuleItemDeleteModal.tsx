import React from 'react';
import Modal from '../Modal';
import { useLocale } from '../../contexts/LocaleContext';

interface Props {
    /** What is being deleted; null when nothing is. */
    item: { title: string; message: string; usages: string[] } | null;
    onClose: () => void;
    onConfirm: () => void;
}

/** Asks before a group or lookup is deleted, and lists what still uses it (F50). */
const ConfirmRuleItemDeleteModal: React.FC<Props> = ({ item, onClose, onConfirm }) => {
    const { t } = useLocale();
    return (
        <Modal
            isOpen={!!item}
            onClose={onClose}
            title={item?.title || ''}
            titleClassName="text-red-600 dark:text-red-400"
            size="md"
            footer={<>
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors">{t('cancel')}</button>
                <button type="button" onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">{t('delete')}</button>
            </>}
        >
            {item && <>
                <p>{item.message}</p>
                {item.usages.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2" aria-label={t('ruleItemUsedBy')}>
                        {item.usages.map(u => (
                            <li key={u} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 font-mono text-sm">{u}</li>
                        ))}
                    </ul>
                )}
            </>}
        </Modal>
    );
};

export default ConfirmRuleItemDeleteModal;
