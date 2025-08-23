"use client";
import React from 'react';
import { Button } from './Button';

export const TopNav: React.FC<{ onLogout?: () => void; }> = ({ onLogout }) => {
  return (
    <header className="h-14 flex items-center gap-4 border-b border-[var(--sp-color-border)] bg-[var(--sp-color-bg-alt)] px-4 sticky top-0 z-40">
      <div className="flex-1 flex items-center gap-4">
        <div className="hidden sm:block flex-1 max-w-md">
          <input placeholder="Search…" className="sp-input w-full" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button aria-label="Notifications" className="relative w-9 h-9 rounded-full bg-[var(--sp-color-primary)]/10 text-[var(--sp-color-primary)] hover:bg-[var(--sp-color-primary)]/20 transition">
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[var(--sp-color-accent)]"></span>
          <span className="sr-only">Notifications</span>
        </button>
        <div className="relative">
          <details className="group">
            <summary className="list-none flex items-center gap-2 cursor-pointer select-none">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--sp-color-primary)] to-[var(--sp-color-primary-hover)] text-white text-xs flex items-center justify-center font-semibold">AD</div>
            </summary>
            <div className="absolute right-0 mt-2 w-48 bg-[var(--sp-color-bg-alt)] border border-[var(--sp-color-border)] rounded-lg shadow-lg p-2 text-sm z-50">
              <button onClick={onLogout} className="w-full text-left px-2 py-1.5 rounded hover:bg-[var(--sp-color-primary)]/10">Logout</button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
