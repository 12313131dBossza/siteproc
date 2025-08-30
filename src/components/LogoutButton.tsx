"use client";
import { useState } from 'react';
import { sbBrowser } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export default function LogoutButton({ className = '' }: { className?: string }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  async function doLogout() {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    
    try {
      const supabase = sbBrowser();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        // Show toast notification if you have a toast system
        // For now, we'll just log and continue
      }
      
      // Clear any client-side state/cache if needed
      
      // Redirect to login
      router.replace('/login');
      
    } catch (e) {
      console.error('Logout exception:', e);
      // Fallback to hard redirect if router fails
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <button 
      onClick={doLogout} 
      disabled={isLoggingOut}
      className={`${className} text-xs px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </button>
  );
}
