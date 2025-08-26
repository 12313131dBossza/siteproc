"use client";
import React from 'react';

export const TopNav: React.FC<{ onLogout?: () => void; accountArea?: React.ReactNode; }> = ({ accountArea }) => {
  return (
    <header className="h-14 flex items-center gap-4 border-b border-[var(--sp-color-border)] bg-[var(--sp-color-bg-alt)] px-4 sticky top-0 z-40">
      <div className="flex-1 flex items-center gap-4">
        <div className="hidden sm:block flex-1 max-w-md">
          <input placeholder="Search…" className="sp-input w-full" />
        </div>
      </div>
  <div className="flex items-center gap-2">{accountArea}</div>
    </header>
  );
};

export default TopNav;
