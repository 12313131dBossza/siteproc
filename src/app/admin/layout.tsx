import React from 'react';
import '../globals.css';
import { Sidebar } from '@/components/ui/Sidebar';
import { TopNav } from '@/components/ui/TopNav';
import { ToastProvider } from '@/components/ui/Toast';
import { useRoleGuard } from '@/lib/useRoleGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useRoleGuard('admin');
  return (
    <html lang="en">
      <body className="antialiased bg-[var(--sp-color-bg)] text-[var(--sp-color-foreground,inherit)]">
        <ToastProvider>
          <div className="flex">
            <Sidebar />
            <div className="flex-1 min-h-screen flex flex-col">
              <TopNav />
              <main className="flex-1 p-6 space-y-8">{children}</main>
            </div>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
