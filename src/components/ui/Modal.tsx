"use client";
import React, { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps { 
  open: boolean; 
  onClose: () => void; 
  title?: string; 
  children: ReactNode; 
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4',
};

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) {
      window.addEventListener('keydown', handler);
      // Prevent body scroll on mobile
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizeClasses[size]} bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-xl shadow-xl animate-fadeIn max-h-[90vh] md:max-h-[85vh] flex flex-col md:m-4`}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button 
              onClick={onClose}
              className="p-2 -mr-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 shrink-0 safe-area-bottom">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
