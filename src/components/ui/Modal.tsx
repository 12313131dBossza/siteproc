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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full ${sizeClasses[size]} bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl animate-fadeIn max-h-[92vh] sm:max-h-[85vh] flex flex-col sm:m-4`}>
        {/* Drag handle for mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 sm:p-4 border-b border-gray-200 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button 
              onClick={onClose}
              className="p-2 -mr-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-gray-200 flex justify-end gap-2 shrink-0 pb-safe">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
