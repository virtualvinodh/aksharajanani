
import React, { useEffect, useState, useCallback } from 'react';
import { renderFormattedText } from '../utils/formattedText';
import { useLocale } from '../contexts/LocaleContext';
import { UndoIcon } from '../constants';

interface NotificationProps {
  message: string;
  onClose: () => void;
  duration?: number;
  type?: 'success' | 'info' | 'error';
  onUndo?: () => void;
}

/** How long a message stays (F28): errors stay until closed, and Undo stays long enough to react. */
export const UNDO_MIN_DURATION = 10000;
const DEFAULT_DURATION = 4000;
export const notificationDuration = (type: NotificationProps['type'], duration: number | undefined, hasUndo: boolean): number | null => {
  if (type === 'error') return null;
  const base = duration ?? DEFAULT_DURATION;
  return hasUndo ? Math.max(base, UNDO_MIN_DURATION) : base;
};

const Notification: React.FC<NotificationProps> = ({ message, onClose, duration, type = 'success', onUndo }) => {
  const { t } = useLocale();
  const [isExiting, setIsExiting] = useState(false);
  // The timer pauses while the pointer is over the message, so it can be read to the end.
  const [isPaused, setIsPaused] = useState(false);
  const closeTimerRef = React.useRef<number | null>(null);
  const stayFor = notificationDuration(type, duration, !!onUndo);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    closeTimerRef.current = window.setTimeout(() => {
        onClose();
    }, 500); // 500ms is the transition duration
  }, [onClose]);

  useEffect(() => {
    if (stayFor === null || isPaused) return;
    const exitTimer = setTimeout(handleClose, stayFor);
    return () => clearTimeout(exitTimer);
  }, [stayFor, isPaused, handleClose]);

  useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); }, []);

  const handleUndoClick = () => {
    if (onUndo) {
      onUndo();
    }
    // The explicit onClose() call was causing a race condition and is removed.
    // The onUndo callback is now responsible for showing the next notification,
    // which replaces this one in the state, correctly triggering an unmount.
  };

  const colorClasses = {
    success: 'bg-green-600 text-white dark:bg-green-500 dark:text-gray-900',
    info: 'bg-blue-600 text-white dark:bg-blue-500',
    error: 'bg-red-600 text-white dark:bg-red-500'
  };

  return (
    <div
      className={`fixed bottom-10 left-1/2 -translate-x-1/2 transform transition-all duration-500 ease-in-out z-[100] w-max max-w-[calc(100vw-2rem)]
                  ${isExiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
      role={type === 'error' ? 'alert' : 'status'}
      onPointerEnter={() => setIsPaused(true)}
      onPointerLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className={`${colorClasses[type]} font-semibold pl-4 pr-2 py-3 rounded-lg shadow-xl flex items-center gap-3`}>
        <span
            className="whitespace-pre-wrap"
            style={{
                fontFamily: 'var(--guide-font-family)',
                fontFeatureSettings: 'var(--guide-font-feature-settings)'
            }}
        >
            {renderFormattedText(message, { strongClassName: 'font-extrabold' })}
        </span>
        {onUndo && (
          <button
            onClick={handleUndoClick}
            className="flex-shrink-0 flex items-center gap-1.5 font-bold uppercase text-xs px-3 py-1 rounded-full ml-1 transition-colors bg-yellow-400 text-black hover:bg-yellow-300 dark:bg-yellow-500 dark:hover:bg-yellow-400"
          >
            <UndoIcon />
            {t('undo')}
          </button>
        )}
        <button
          onClick={handleClose}
          aria-label={t('close')}
          title={t('close')}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-lg leading-none opacity-80 hover:opacity-100 hover:bg-black/15"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
};
export default React.memo(Notification);
