"use client";
import React, { createContext, useCallback, useContext, useState } from 'react';

interface ToastMsg { id: string; title: string; variant?: 'success'|'error'|'info'; }
interface ToastCtx { push: (t: Omit<ToastMsg,'id'>)=>void; }
const ToastContext = createContext<ToastCtx | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode; }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const push = useCallback((t: Omit<ToastMsg,'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, ...t }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed top-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map(t => (
          <div key={t.id} className={`sp-card py-2 px-3 text-sm flex items-center gap-2 shadow-lg border-l-4 ${t.variant==='success' ? 'border-[var(--sp-color-success)]' : t.variant==='error' ? 'border-[var(--sp-color-danger)]' : 'border-[var(--sp-color-primary)]'}`}>{t.title}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};
