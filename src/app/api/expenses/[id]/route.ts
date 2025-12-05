import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/auth'
import { syncExpenseUpdateToZoho, syncExpenseDeleteToZoho } from '@/lib/zoho-autosync'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, context: any) {
  try {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  const companyId = session.companyId
    const sb = supabaseService()
    const { data, error } = await sb.from('expenses').select('*').eq('company_id', companyId).eq('id', context?.params?.id).single()
    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest, context: any) {
  try {
    const session = await getSessionProfile()
    if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
    
    // Check role - only manager, admin, owner can edit
    if (!session.role || !['manager', 'admin', 'owner'].includes(session.role)) {
      return NextResponse.json({ error: 'insufficient_permissions' }, { status: 403 })
    }
    
    const companyId = session.companyId
    const expenseId = context?.params?.id
    const body = await req.json()
    
    const sb = supabaseService()
    
    // Verify expense belongs to company
    const { data: existing, error: fetchError } = await sb
      .from('expenses')
      .select('id')
      .eq('id', expenseId)
      .eq('company_id', companyId)
      .single()
    
    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }
    
    // Update expense
    const updateData: any = {}
    if (body.vendor !== undefined) updateData.vendor = body.vendor
    if (body.category !== undefined) updateData.category = body.category
    if (body.amount !== undefined) updateData.amount = body.amount
    if (body.description !== undefined) updateData.description = body.description
    if (body.project_id !== undefined) updateData.project_id = body.project_id
    if (body.payment_method !== undefined) updateData.payment_method = body.payment_method
    updateData.updated_at = new Date().toISOString()
    
    const { data, error } = await sb
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId)
      .eq('company_id', companyId)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    // Sync update to Zoho (async, don't wait)
    syncExpenseUpdateToZoho(companyId, expenseId).catch(err => {
      console.error('[Expense API] Failed to sync update to Zoho:', err)
    })
    
    return NextResponse.json({ expense: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, context: any) {
  try {
    const session = await getSessionProfile()
    if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
    
    // Check role - only admin, owner can delete
    if (!session.role || !['admin', 'owner'].includes(session.role)) {
      return NextResponse.json({ error: 'insufficient_permissions' }, { status: 403 })
    }
    
    const companyId = session.companyId
    const expenseId = context?.params?.id
    
    const sb = supabaseService()
    
    // Verify expense belongs to company
    const { data: existing, error: fetchError } = await sb
      .from('expenses')
      .select('id, zoho_expense_id')
      .eq('id', expenseId)
      .eq('company_id', companyId)
      .single()
    
    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }
    
    // Delete from Zoho first (if synced)
    if (existing.zoho_expense_id) {
      try {
        await syncExpenseDeleteToZoho(companyId, expenseId)
      } catch (err) {
        console.error('[Expense API] Failed to delete from Zoho:', err)
        // Continue with local delete even if Zoho fails
      }
    }
    
    // Delete expense
    const { error } = await sb
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('company_id', companyId)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
