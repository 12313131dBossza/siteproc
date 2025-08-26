export const dynamic = 'force-dynamic'
export const revalidate = 0
import React from 'react';
import '../globals.css';
import AdminShellClient from './AdminShellClient';
import { getSessionProfile, getSupabaseServer } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AccountDropdown from '../../components/AccountDropdown';
import { unstable_noStore as noStore } from 'next/cache';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  noStore();
  const session = await getSessionProfile();
  if (!session.user) redirect('/login');
  // Removed onboarding redirect; single guard lives in /dashboard layout
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
