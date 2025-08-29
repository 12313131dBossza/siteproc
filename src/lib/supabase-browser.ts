"use client";
import { createBrowserClient } from "@supabase/ssr";

let _browser: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Singleton browser client so that auth state / listeners aren't duplicated.
 * Relies on NEXT_PUBLIC_ env vars being present (validated lazily in dev).
 */
export function sbBrowser() {
  if (_browser) return _browser;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
    throw new Error('Supabase env not configured');
  }
  _browser = createBrowserClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });
  return _browser;
}
