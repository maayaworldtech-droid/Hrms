import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store';
import { removeToast, ToastMessage } from '@/store/slices/uiSlice';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

/**
 * Toasts sit bottom-right on the desktop shell. Inside the employee phone shell the bottom is
 * taken by the navigation bar, so they drop in from the top instead.
 *
 * The stack is a manual popover so it renders in the browser's top layer. Without that, a toast
 * raised while a modal <dialog> is open (for example a failed save) would be hidden behind it.
 */
export const ToastContainer: React.FC = () => {
  const toasts = useAppSelector((state) => state.ui.toasts);
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();
  const inMobileShell = pathname.startsWith('/employee');
  const ref = useRef<HTMLDivElement>(null);
  const newestId = toasts[toasts.length - 1]?.id;

  useEffect(() => {
    const el = ref.current as (HTMLDivElement & { showPopover?: () => void; hidePopover?: () => void }) | null;
    if (!el || typeof el.showPopover !== 'function') return;
    try {
      // Re-showing moves the popover above any dialog opened since it was last shown
      if (el.matches(':popover-open')) el.hidePopover?.();
      if (newestId) el.showPopover();
    } catch {
      // Older browsers without the Popover API still get the fixed-position stack
    }
  }, [newestId]);

  return (
    <div
      ref={ref}
      popover="manual"
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-auto z-[60] m-0 flex w-[calc(100%-32px)] max-w-sm flex-col gap-2 overflow-visible border-0 bg-transparent p-0 ${
        inMobileShell ? 'left-1/2 top-4 -translate-x-1/2' : 'bottom-5 right-4 sm:right-5'
      }`}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => dispatch(removeToast(toast.id))} />
      ))}
    </div>
  );
};

const ICONS = {
  success: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />,
  error: <XCircle className="h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />,
  warning: <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />,
  info: <Info className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />,
};

const ToastItem: React.FC<{ toast: ToastMessage; onClose: () => void }> = ({ toast, onClose }) => {
  // The parent passes a new onClose on every render; keep the timer tied to the toast itself so
  // adding a second toast does not restart the countdown of the first.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const timer = setTimeout(() => closeRef.current(), toast.duration || (toast.type === 'error' ? 7000 : 4500));
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, toast.type]);

  return (
    <div className="pointer-events-auto flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3.5 shadow-md">
      {ICONS[toast.type]}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-slate-900">{toast.title}</p>
        {toast.message && <p className="mt-1 text-sm text-slate-600">{toast.message}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="rounded p-0.5 text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
