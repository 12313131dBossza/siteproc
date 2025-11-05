import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/server-utils'
import { getUniqueVendors, getQuickBooksVendors } from '@/lib/quickbooks-sync'
import { getConnectionStatus } from '@/lib/quickbooks'

// GET /api/quickbooks/vendors - Get vendor mappings and available vendors
export async function GET(request: NextRequest) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check QB connection
    const connectionStatus = await getConnectionStatus(profile.company_id)
    if (!connectionStatus.connected || !connectionStatus.realmId) {
      return NextResponse.json({
        error: 'QuickBooks not connected'
      }, { status: 400 })
    }

    // Get SiteProc vendors
    const siteprocVendors = await getUniqueVendors(profile.company_id)

    // Get QuickBooks vendors
    const qbVendors = await getQuickBooksVendors(profile.company_id, connectionStatus.realmId)

    // Get existing mappings
    const { data: mappings, error: mappingsError } = await supabase
      .from('quickbooks_vendor_mappings')
      .select('*')
      .eq('company_id', profile.company_id)

    if (mappingsError) {
      console.error('Error fetching vendor mappings:', mappingsError)
    }

    return NextResponse.json({
      ok: true,
      siteprocVendors,
      quickbooksVendors: qbVendors,
      mappings: mappings || []
    })

  } catch (error) {
    console.error('Error in GET /api/quickbooks/vendors:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/quickbooks/vendors - Create or update vendor mapping
export async function POST(request: NextRequest) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin/owner
    if (!['admin', 'owner', 'bookkeeper'].includes(profile.role || '')) {
      return NextResponse.json({ 
        error: 'Insufficient permissions' 
      }, { status: 403 })
    }

    const body = await request.json()
    const { siteprocVendor, quickbooksVendorId, quickbooksVendorName } = body

    if (!siteprocVendor || !quickbooksVendorId || !quickbooksVendorName) {
      return NextResponse.json({
        error: 'Missing required fields: siteprocVendor, quickbooksVendorId, quickbooksVendorName'
      }, { status: 400 })
    }

    // Upsert mapping
    const { data, error } = await supabase
      .from('quickbooks_vendor_mappings')
      .upsert({
        company_id: profile.company_id,
        siteproc_vendor: siteprocVendor,
        quickbooks_vendor_id: quickbooksVendorId,
        quickbooks_vendor_name: quickbooksVendorName,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'company_id,siteproc_vendor'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating vendor mapping:', error)
      return NextResponse.json({
        error: 'Failed to create mapping',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      mapping: data
    })

  } catch (error) {
    console.error('Error in POST /api/quickbooks/vendors:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE /api/quickbooks/vendors - Delete vendor mapping
export async function DELETE(request: NextRequest) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin/owner
    if (!['admin', 'owner', 'bookkeeper'].includes(profile.role || '')) {
      return NextResponse.json({ 
        error: 'Insufficient permissions' 
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const mappingId = searchParams.get('id')

    if (!mappingId) {
      return NextResponse.json({
        error: 'Missing mapping ID'
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('quickbooks_vendor_mappings')
      .delete()
      .eq('id', mappingId)
      .eq('company_id', profile.company_id)

    if (error) {
      console.error('Error deleting vendor mapping:', error)
      return NextResponse.json({
        error: 'Failed to delete mapping'
      }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: 'Mapping deleted successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/quickbooks/vendors:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
