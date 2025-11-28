import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Fetch invitation details (no auth required)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()

    // Find the pending invitation by token
    const { data: member, error: findError } = await adminSupabase
      .from('project_members')
      .select('*, projects(name, company_id)')
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single()

    if (findError || !member) {
      console.error('Find invitation error:', findError)
      return NextResponse.json({ 
        error: 'Invalid or expired invitation. The invitation may have already been used or revoked.' 
      }, { status: 404 })
    }

    // Check if invitation has expired (7 days)
    const invitedAt = new Date(member.invitation_sent_at || member.created_at)
    const now = new Date()
    const daysDiff = (now.getTime() - invitedAt.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysDiff > 7) {
      return NextResponse.json({ 
        error: 'This invitation has expired. Please ask the project owner to send a new invitation.' 
      }, { status: 410 })
    }

    // Get company name
    let companyName = ''
    if ((member.projects as any)?.company_id) {
      const { data: company } = await adminSupabase
        .from('companies')
        .select('name')
        .eq('id', (member.projects as any).company_id)
        .single()
      companyName = company?.name || ''
    }

    // Return invitation details (without sensitive data)
    return NextResponse.json({
      email: member.external_email || '',
      projectName: (member.projects as any)?.name || 'Unknown Project',
      projectId: member.project_id,
      companyName,
      role: member.role || 'viewer'
    })

  } catch (err: any) {
    console.error('Get invitation info error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

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

    // Check if invitation has expired (7 days)
    const invitedAt = new Date(member.invitation_sent_at || member.created_at)
    const now = new Date()
    const daysDiff = (now.getTime() - invitedAt.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysDiff > 7) {
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

    // Get the project's company_id so we can add the user to it
    const { data: project } = await adminSupabase
      .from('projects')
      .select('company_id')
      .eq('id', member.project_id)
      .single()

    // Determine the profile role based on external_type from the invitation
    // Map external_type to profile role: supplier, client, contractor all become their respective roles
    // Other types (consultant, other) become 'viewer'
    const externalType = member.external_type as string | null
    let profileRole = 'viewer'
    if (externalType === 'supplier') {
      profileRole = 'supplier'
    } else if (externalType === 'client') {
      profileRole = 'client'
    } else if (externalType === 'contractor') {
      profileRole = 'contractor'
    }
    // consultant, other, or null default to 'viewer'

    // Check if user has a profile, create one if not
    const { data: userProfile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('id, company_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      // User doesn't have a profile yet - create one with the correct role
      console.log(`Creating profile for user ${user.id} with role ${profileRole}`)
      const { error: createError } = await adminSupabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          company_id: project?.company_id,
          role: profileRole
        })
      
      if (createError) {
        console.error('Failed to create profile:', createError)
        // Try upsert instead
        await adminSupabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            company_id: project?.company_id,
            role: profileRole
          })
      }
      console.log(`Created profile for user ${user.id} in company ${project?.company_id} with role ${profileRole}`)
    } else if (project?.company_id && (!userProfile?.company_id)) {
      // User has profile but no company - add them to the project's company
      const { error: updateProfileError } = await adminSupabase
        .from('profiles')
        .update({ 
          company_id: project.company_id,
          role: profileRole // Set role based on external_type
        })
        .eq('id', user.id)
      
      if (updateProfileError) {
        console.error('Failed to update profile with company:', updateProfileError)
      } else {
        console.log(`Added user ${user.id} to company ${project.company_id} as ${profileRole}`)
      }
    }
    // Note: We do NOT update the profile role for existing users who already have a company.
    // The external_type in project_members already tracks their role for this specific project.
    // Changing their profile.role would incorrectly restrict their access across the entire app.

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
