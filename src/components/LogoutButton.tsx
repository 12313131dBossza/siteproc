"use client";
import { sbBrowser } from '@/lib/supabase-browser';

export default function LogoutButton({ className = '' }: { className?: string }) {
  async function doLogout() {
    try {
      const supabase = sbBrowser();
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    } finally {
      window.location.href = '/login';
    }
  }
  return (
    <button onClick={doLogout} className={className + ' text-xs px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600'}>
      Logout
    </button>
  );
}
