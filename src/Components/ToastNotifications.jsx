import React, { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../Context/NotificationContext';
import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react';

/**
 * Toast notification overlay.
 *
 * Watches the notification list from NotificationContext and pops up a brief
 * toast for every new (unread) notification added after the component mounts.
 * The first notification is shown immediately; subsequent ones are queued and
 * shown one-at-a-time so they never stack on top of each other.
 *
 * Toasts auto-dismiss after 4 s (info) or 6 s (warning / critical).
 */
const ICONS = {
    critical: <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />,
};

const BG = {
    critical: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
};

const TEXT = {
    critical: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
};

export default function ToastNotifications() {
    const { notifications, markRead } = useNotifications();

    // Track the highest notification id we've already shown so we only toast new ones
    const lastShownId = useRef(null);

    // Queue of notifications waiting to be displayed
    const queue = useRef([]);

    // Currently visible toast
    const [active, setActive] = useState(null);

    // Timer ref for auto-dismiss
    const timer = useRef(null);

    /**
     * Show the next toast in the queue, or clear active if queue is empty.
     */
    const showNext = () => {
        if (queue.current.length === 0) {
            setActive(null);
            return;
        }
        const next = queue.current.shift();
        setActive(next);

        const duration = next.type === 'info' ? 4000 : 6000;
        timer.current = setTimeout(() => {
            markRead(next.id);
            showNext();
        }, duration);
    };

    // Watch notifications; enqueue any new unread ones
    useEffect(() => {
        if (notifications.length === 0) return;

        // Initialise: don't toast notifications that already existed before mount
        if (lastShownId.current === null) {
            lastShownId.current = notifications[0]?.id ?? 0;
            return;
        }

        const newest = notifications[0]; // NotificationContext prepends newest first
        if (!newest || newest.id <= lastShownId.current || newest.read) return;

        lastShownId.current = newest.id;

        queue.current.push(newest);

        // If nothing is currently showing, start immediately
        if (!active) {
            clearTimeout(timer.current);
            showNext();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notifications]);

    // Cleanup timer on unmount
    useEffect(() => () => clearTimeout(timer.current), []);

    const dismiss = () => {
        clearTimeout(timer.current);
        if (active) markRead(active.id);
        showNext();
    };

    if (!active) return null;

    const type = active.type || 'info';
    const icon = ICONS[type] || ICONS.info;
    const bg = BG[type] || BG.info;
    const text = TEXT[type] || TEXT.info;

    return (
        <div
            role="alert"
            aria-live="assertive"
            className={`
        fixed bottom-5 right-5 z-[9999] max-w-sm w-full
        flex items-start gap-3
        border rounded-xl shadow-lg px-4 py-3
        animate-slide-in
        ${bg}
      `}
        >
            {/* Icon */}
            <div className="mt-0.5">{icon}</div>

            {/* Message */}
            <p className={`flex-1 text-sm font-medium leading-snug break-words ${text}`}>
                {active.message}
            </p>

            {/* Dismiss button */}
            <button
                onClick={dismiss}
                aria-label="Dismiss notification"
                className="ml-1 p-0.5 rounded hover:bg-black/10 transition-colors"
            >
                <X className="w-4 h-4 text-gray-500" />
            </button>
        </div>
    );
}
