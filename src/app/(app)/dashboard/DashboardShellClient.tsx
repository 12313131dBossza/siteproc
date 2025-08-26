"use client";
import React from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import { TopNav } from '@/components/ui/TopNav';
import { ToastProvider } from '@/components/ui/Toast';

export default function DashboardShellClient({ children, topRight }: { children: React.ReactNode; topRight?: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-h-screen flex flex-col">
          <TopNav accountArea={topRight} />
          <main className="flex-1 p-6 space-y-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}