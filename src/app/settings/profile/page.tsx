import ProfileForm from './profileForm'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export default async function ProfileSettingsPage(){
  const cookieStore = cookies() as any
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get(n:string){ return cookieStore.get(n)?.value } } })
  const { data: { user } } = await supabase.auth.getUser()
  if(!user) return null
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  return <ProfileForm initialFullName={profile?.full_name||''} />
}