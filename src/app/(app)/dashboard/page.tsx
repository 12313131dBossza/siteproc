export const dynamic = 'force-dynamic'
export const revalidate = 0
import { unstable_noStore as noStore } from 'next/cache'
import { supabaseService } from '@/lib/supabase'
import { createServerSupabaseClient, getUserProfile } from '@/lib/profiles-server'
import { cookies } from 'next/headers'
import DashboardClient from './DashboardClient'

export const runtime = 'nodejs'

async function fetchUserData(): Promise<{ user: any; profile: any; role: string | null }> {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Error fetching user:', userError)
      return { user: null, profile: null, role: null }
    }

    // Get user profile
    const profile = await getUserProfile(user.id)
    
    // Get role from profiles or fallback
    const sb = supabaseService()
    const { data: roleData } = await (sb as any).from('profiles').select('role').eq('id', user.id).single()
    const role = roleData?.role || null

    return { user, profile, role }
  } catch (err) {
    console.error('Error in fetchUserData:', err)
    return { user: null, profile: null, role: null }
  }
}

function mapRole(r: string | null | undefined): 'admin'|'pm'|'purchaser'|'field'|'bookkeeper' {
  if (!r) return 'field'
  const v = r.toLowerCase()
  if (['admin','owner'].includes(v)) return 'admin'
  if (['pm','project_manager','project-manager'].includes(v)) return 'pm'
  if (['purchaser','buyer','procurement'].includes(v)) return 'purchaser'
  if (['bookkeeper','accounting'].includes(v)) return 'bookkeeper'
  if (['foreman','field'].includes(v)) return 'field'
  return 'field'
}

export default async function DashboardPage() {
  noStore()
  
  const { user, profile, role: rawRole } = await fetchUserData()
  
  // If no user, this shouldn't happen due to middleware, but handle gracefully
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 p-6">
        <div className="text-center">
          <p className="text-zinc-400">Unable to load user data. Please try refreshing.</p>
        </div>
      </div>
    )
  }

  const role = mapRole(rawRole)
  const displayName = profile?.full_name || user.email || 'User'

  return <DashboardClient user={user} profile={profile} role={role} displayName={displayName} />
}
