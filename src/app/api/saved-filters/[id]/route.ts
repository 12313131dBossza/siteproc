import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/server-utils'

// PATCH /api/saved-filters/[id] - Update a saved filter
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const filterId = params.id

    // Verify the filter belongs to the user
    const { data: existingFilter, error: fetchError } = await supabase
      .from('saved_filters')
      .select('*')
      .eq('id', filterId)
      .eq('user_id', profile.id)
      .single()

    if (fetchError || !existingFilter) {
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 })
    }

    // If setting as default, unset other defaults for this module
    if (body.is_default) {
      await supabase
        .from('saved_filters')
        .update({ is_default: false })
        .eq('user_id', profile.id)
        .eq('module', existingFilter.module)
        .eq('is_default', true)
        .neq('id', filterId)
    }

    // Update the filter
    const { data, error } = await supabase
      .from('saved_filters')
      .update({
        name: body.name ?? existingFilter.name,
        filters: body.filters ?? existingFilter.filters,
        is_default: body.is_default ?? existingFilter.is_default,
        updated_at: new Date().toISOString()
      })
      .eq('id', filterId)
      .select()
      .single()

    if (error) {
      console.error('Error updating saved filter:', error)
      return NextResponse.json({ error: 'Failed to update saved filter' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })

  } catch (error) {
    console.error('Saved filters PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/saved-filters/[id] - Delete a saved filter
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const filterId = params.id

    // Delete the filter (RLS will ensure user owns it)
    const { error } = await supabase
      .from('saved_filters')
      .delete()
      .eq('id', filterId)
      .eq('user_id', profile.id)

    if (error) {
      console.error('Error deleting saved filter:', error)
      return NextResponse.json({ error: 'Failed to delete saved filter' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: 'Filter deleted successfully' })

  } catch (error) {
    console.error('Saved filters DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
