import React from 'react';
import '../globals.css';
import AdminShellClient from './AdminShellClient';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-[var(--sp-color-bg)] text-[var(--sp-color-foreground,inherit)]">
        <AdminShellClient>{children}</AdminShellClient>
      </body>
    </html>
  );
}
