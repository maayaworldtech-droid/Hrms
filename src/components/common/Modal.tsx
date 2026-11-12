import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** When true, window.print() prints only this dialog's body. */
  printable?: boolean;
}

const SIZES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl',
  '2xl': 'sm:max-w-5xl',
  full: 'sm:max-w-6xl',
};

/**
 * The one dialog for the whole app, built on the native <dialog> element so focus is trapped,
 * Escape closes, focus returns to the opener and the rest of the page is inert while open.
 * On phones it docks to the bottom as a sheet; from 640px it is centred.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  printable = false,
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = React.useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isOpen && !el.open) el.showModal();
    else if (!isOpen && el.open) el.close();
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`app-dialog w-full ${SIZES[size]} ${printable ? 'print-target' : ''}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {isOpen && (
        <div className="flex max-h-[inherit] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold text-slate-900">
                {title}
              </h2>
              {subtitle && <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              data-print="hide"
              className="-mr-1.5 rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 text-sm text-slate-700 sm:px-6">
            {children}
          </div>

          {footer && (
            <div data-print="hide" className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-6">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
};
