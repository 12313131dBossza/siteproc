"use client";
import React, { useState } from 'react';
import LogoutButton from './LogoutButton';

interface Props {
  userEmail: string;
  role: string;
  companyName: string;
  companyId: string;
}

function roleBadge(role: string){
  const color = role === 'admin' ? 'bg-red-600' : role === 'manager' ? 'bg-blue-600' : role === 'bookkeeper' ? 'bg-amber-600' : 'bg-neutral-600';
  return <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${color}`}>{role||'role'}</span>;
}

export default function AccountDropdown({ userEmail, role, companyName, companyId }: Props){
  const [open,setOpen]=useState(false);
  return (
    <div className="relative">
      <button onClick={()=>setOpen(o=>!o)} className="flex items-center gap-2">
        <div className="text-right hidden sm:block">
          <div className="text-xs font-medium max-w-[140px] truncate">{userEmail||'user'}</div>
          <div className="text-[10px] text-neutral-400 max-w-[140px] truncate">{companyName||'Company'}</div>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--sp-color-primary)] to-[var(--sp-color-primary-hover)] text-white text-xs flex items-center justify-center font-semibold">
          {userEmail?.[0]?.toUpperCase()||'U'}
        </div>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-[var(--sp-color-bg-alt)] border border-[var(--sp-color-border)] rounded-lg shadow-lg p-2 text-sm z-50">
          <div className="px-2 py-2 mb-2 border-b border-[var(--sp-color-border)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium truncate max-w-[140px]" title={userEmail}>{userEmail}</span>
              {roleBadge(role)}
            </div>
            <div className="text-[10px] text-neutral-400 truncate max-w-full" title={companyName}>{companyName}</div>
          </div>
          <nav className="flex flex-col">
            <a href="/settings/profile" className="px-2 py-1.5 rounded hover:bg-[var(--sp-color-primary)]/10">Profile</a>
            <a href="/settings/company" className="px-2 py-1.5 rounded hover:bg-[var(--sp-color-primary)]/10">Company Settings</a>
            <a href="/settings/invite" className="px-2 py-1.5 rounded hover:bg-[var(--sp-color-primary)]/10">Invite Teammates</a>
            <div className="mt-2 pt-2 border-t border-[var(--sp-color-border)]"><LogoutButton className="w-full justify-start" /></div>
          </nav>
        </div>
      )}
    </div>
  );
}
