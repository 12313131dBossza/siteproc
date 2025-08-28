"use client";
import React from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import { TopNav } from '@/components/ui/TopNav';
import { useRoleGuard } from '@/lib/useRoleGuard';

export default function AdminShellClient({ children, topRight }: { children: React.ReactNode; topRight?: React.ReactNode }) {
  useRoleGuard('admin');
  return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-h-screen flex flex-col">
          <TopNav accountArea={topRight} />
          <main className="flex-1 p-6 space-y-8">{children}</main>
        </div>
      </div>
  );
}
