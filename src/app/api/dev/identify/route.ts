import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServerSupabaseUserClient } from '@/lib/server-utils'

// POST /api/dev/identify
// Ensures the current authenticated user has a profile and returns identity details
export async function POST(req: NextRequest) {
  try {
    const userClient = await createServerSupabaseUserClient()
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })
    }

    const service = createServerSupabaseClient()

    // Ensure a profile exists (no email field dependency)
    const { data: profile } = await service
      .from('profiles')
      .upsert({ id: user.id }, { onConflict: 'id' })
      .select('id, company_id, role, full_name')
      .single()

    // Try to attach company if totally missing by creating a default
    let ensuredProfile = profile
    if (!ensuredProfile?.company_id) {
      // find or create a company
      const { data: firstCompany } = await service.from('companies').select('id, name').limit(1).maybeSingle()
      let companyId = firstCompany?.id
      if (!companyId) {
        const { data: newCompany } = await service.from('companies').insert({ name: 'Default Company' }).select('id, name').single()
        companyId = newCompany?.id
      }
      if (companyId) {
        const { data: updated } = await service.from('profiles').update({ company_id: companyId, role: ensuredProfile?.role || 'member' }).eq('id', user.id).select('id, company_id, role, full_name').single()
        ensuredProfile = updated || ensuredProfile
      }
    }

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email },
      profile: ensuredProfile,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
