import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { refreshZohoToken } from '@/lib/zoho'

const ZOHO_BOOKS_API = process.env.ZOHO_BOOKS_API || 'https://www.zohoapis.com/books/v3';

/**
 * GET /api/zoho/debug/accounts
 * Debug endpoint to see available accounts in Zoho
 */
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company' }, { status: 400 })
    }

    // Get Zoho integration
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('provider', 'zoho')
      .single()

    if (!integration) {
      return NextResponse.json({ error: 'Zoho not connected' }, { status: 400 })
    }

    // Refresh token if needed
    let accessToken = integration.access_token
    const expiresAt = new Date(integration.token_expires_at)
    
    if (expiresAt < new Date()) {
      const refreshed = await refreshZohoToken(integration.refresh_token)
      if (!refreshed) {
        return NextResponse.json({ error: 'Failed to refresh token' }, { status: 400 })
      }
      accessToken = refreshed.access_token
    }

    // Fetch ALL accounts from Zoho
    const response = await fetch(`${ZOHO_BOOKS_API}/chartofaccounts?organization_id=${integration.tenant_id}`, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: 'Zoho API error', details: errorText }, { status: 500 })
    }

    const data = await response.json()
    const accounts = data.chartofaccounts || []

    // Group accounts by type for easy viewing
    const accountsByType: Record<string, any[]> = {}
    accounts.forEach((acc: any) => {
      const type = acc.account_type || 'unknown'
      if (!accountsByType[type]) {
        accountsByType[type] = []
      }
      accountsByType[type].push({
        id: acc.account_id,
        name: acc.account_name,
        type: acc.account_type,
      })
    })

    // Find potential "paid through" accounts
    const paidThroughCandidates = accounts.filter((a: any) => {
      const type = (a.account_type || '').toLowerCase()
      const name = (a.account_name || '').toLowerCase()
      return type === 'cash' || 
             type === 'bank' || 
             type === 'other_current_asset' ||
             name.includes('petty cash') ||
             name.includes('cash on hand') ||
             name.includes('undeposited')
    })

    return NextResponse.json({
      success: true,
      totalAccounts: accounts.length,
      accountTypes: Object.keys(accountsByType),
      accountsByType,
      paidThroughCandidates: paidThroughCandidates.map((a: any) => ({
        id: a.account_id,
        name: a.account_name,
        type: a.account_type,
      })),
    })

  } catch (error) {
    console.error('[Zoho Debug] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
