import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { ensureDev } from '@/lib/devGuard'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const guard = ensureDev(); if (guard) return guard
    const sb = supabaseService()
    const { data: company, error: cErr } = await sb
      .from('companies')
      .insert({ name: `Local Demo ${new Date().toISOString().slice(0,10)}` })
      .select('id')
      .single()
    if (cErr || !company) return NextResponse.json({ error: cErr?.message || 'Company create failed' }, { status: 500 })

    const { data: job, error: jErr } = await sb
      .from('jobs')
      .insert({ company_id: company.id, name: 'Demo Job', code: 'DEMO-001' })
      .select('id')
      .single()
    if (jErr || !job) return NextResponse.json({ error: jErr?.message || 'Job create failed' }, { status: 500 })

    return NextResponse.json({ company_id: company.id, job_id: job.id })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Seed failed' }, { status: 500 })
  }
}
