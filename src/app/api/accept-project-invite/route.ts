import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'You must be logged in to accept an invitation' }, { status: 401 })
    }

    // Use admin client to bypass RLS for invitation lookup and acceptance
    const adminSupabase = createAdminClient()

    // Find the pending invitation by token
    const { data: member, error: findError } = await adminSupabase
      .from('project_members')
      .select('*, projects(name)')
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single()

    if (findError || !member) {
      console.error('Find invitation error:', findError)
      return NextResponse.json({ 
        error: 'Invalid or expired invitation. The invitation may have already been used or revoked.' 
      }, { status: 404 })
    }

    // Check if invitation has expired (24 hours)
    const invitedAt = new Date(member.invitation_sent_at || member.created_at)
    const now = new Date()
    const hoursDiff = (now.getTime() - invitedAt.getTime()) / (1000 * 60 * 60)
    
    if (hoursDiff > 24) {
      // Mark as expired
      await adminSupabase
        .from('project_members')
        .update({ status: 'expired' })
        .eq('id', member.id)
      
      return NextResponse.json({ 
        error: 'This invitation has expired. Please ask the project owner to send a new invitation.' 
      }, { status: 410 })
    }

    // Check if the invitation email matches the logged-in user's email
    // First get user's email from profiles or auth
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    const userEmail = profile?.email || user.email

    // Note: We're allowing any authenticated user to accept the invitation
    // If you want strict email matching, uncomment the block below:
    /*
    if (member.external_email && userEmail && member.external_email.toLowerCase() !== userEmail.toLowerCase()) {
      return NextResponse.json({ 
        error: `This invitation was sent to ${member.external_email}. Please log in with that email address.` 
      }, { status: 403 })
    }
    */

    // Accept the invitation - update the member record
    const { error: updateError } = await adminSupabase
      .from('project_members')
      .update({
        user_id: user.id,
        external_email: null, // Convert to internal user
        status: 'active',
        invitation_token: null, // Clear the token
        accepted_at: new Date().toISOString()
      })
      .eq('id', member.id)

    if (updateError) {
      console.error('Accept invitation error:', updateError)
      return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
    }

    const projectName = (member.projects as any)?.name || 'the project'

    return NextResponse.json({
      success: true,
      message: `You have successfully joined "${projectName}"!`,
      projectId: member.project_id,
      projectName: projectName
    })

  } catch (err: any) {
    console.error('Accept project invite error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
