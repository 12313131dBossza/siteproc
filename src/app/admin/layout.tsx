import React from 'react';
import '../globals.css';
import AdminShellClient from './AdminShellClient';
import { getSessionProfile, getSupabaseServer } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AccountDropdown from '../../components/AccountDropdown';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionProfile();
  if (!session.user) redirect('/login');
  if (!session.companyId) redirect('/onboarding');
  const supabase = getSupabaseServer();
  const { data: company } = await supabase.from('companies').select('name,id').eq('id', session.companyId).single();
  return (
    <html lang="en">
      <body className="antialiased bg-[var(--sp-color-bg)] text-[var(--sp-color-foreground,inherit)]">
        <AdminShellClient
          topRight={<AccountDropdown userEmail={session.user.email||''} role={session.role||''} companyName={company?.name||''} companyId={company?.id||''} />}
        >
          {children}
        </AdminShellClient>
      </body>
    </html>
  );
}
