import React from 'react';
import { cn } from '@/lib/utils';

export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const sizeMap = {
  sm: 'md:max-w-md',
  md: 'md:max-w-lg',
  lg: 'md:max-w-2xl',
  xl: 'md:max-w-4xl',
  '2xl': 'md:max-w-6xl'
};

export function FormModal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = 'md',
  className
}: FormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col md:items-center md:justify-center md:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal - Full screen on mobile, centered on desktop */}
      <div
        className={cn(
          'relative bg-white w-full flex flex-col',
          'h-[100dvh] md:h-auto md:max-h-[85vh] md:rounded-xl shadow-2xl',
          sizeMap[size],
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 bg-white safe-area-top">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {icon && (
              <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 id="modal-title" className="text-base md:text-xl font-semibold text-gray-900 truncate">
                {title}
              </h2>
              {description && (
                <p className="text-xs md:text-sm text-gray-500 truncate">{description}</p>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-3 md:py-4 min-h-0 overscroll-contain">
          {children}
        </div>

        {/* Footer - fixed at bottom */}
        {footer && (
          <div className="flex-shrink-0 px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 bg-gray-50 safe-area-bottom">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Form Modal Actions Component (for footer buttons)
export interface FormModalActionsProps {
  onCancel: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  submitVariant?: 'primary' | 'danger';
}

export function FormModalActions({
  onCancel,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  submitDisabled = false,
  submitVariant = 'primary'
}: FormModalActionsProps) {
  const submitColors = {
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
  };

  return (
    <div className="flex items-center justify-end gap-2 md:gap-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="px-3 md:px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {cancelLabel}
      </button>

      <button
        type="submit"
        onClick={onSubmit}
        disabled={isSubmitting || submitDisabled}
        className={cn(
          'px-3 md:px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2',
          submitColors[submitVariant]
        )}
      >
        {isSubmitting && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {submitLabel}
      </button>
    </div>
  );
}
