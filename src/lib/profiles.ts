import { createBrowserClient, createServerClient } from '@supabase/ssr'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Client-side: upsert user profile on first login
export async function upsertUserProfile(user: any): Promise<Profile | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting profile:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Exception upserting profile:', err)
    return null
  }
}

// Client-side: get user profile
export async function getClientUserProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Exception fetching profile:', err)
    return null
  }
}
