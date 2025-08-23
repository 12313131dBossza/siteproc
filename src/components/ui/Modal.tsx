import React, { useEffect } from 'react';

interface ModalProps { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; footer?: React.ReactNode; }
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, footer }) => {
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg sp-card shadow-xl p-6 animate-fadeIn">
        {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
        <div className="space-y-4">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
