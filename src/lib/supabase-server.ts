import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function sbServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    if (process.env.NODE_ENV !== 'production') {
      throw new Error("Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
    }
    // In production just throw generic to avoid leaking config details.
    throw new Error("Supabase configuration missing");
  }
  const cookieStore = await cookies();
  return createServerClient(
    url,
    anon,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );
}
