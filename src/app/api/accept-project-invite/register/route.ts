import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST - Register a new user for project invitation (bypasses email confirmation)
export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, token } = await req.json()

    if (!email || !password || !fullName || !token) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // First verify the invitation token is valid
    const { data: invitation, error: inviteError } = await adminSupabase
      .from('project_members')
      .select('id, external_email, status, invitation_token, project_id, projects(name, company_id)')
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ 
        error: 'Invalid or expired invitation token' 
      }, { status: 400 })
    }

    // Verify the email matches the invitation
    if (invitation.external_email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ 
        error: 'Email does not match the invitation' 
      }, { status: 400 })
    }

    // Create user with admin client - this bypasses email confirmation
    const { data: userData, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: fullName
      }
    })

    if (createError) {
      console.error('Create user error:', createError)
      
      // Check if user already exists
      if (createError.message?.includes('already been registered') || 
          createError.message?.includes('already exists')) {
        return NextResponse.json({ 
          error: 'This email is already registered. Please log in instead.',
          code: 'USER_EXISTS'
        }, { status: 400 })
      }
      
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    if (!userData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    const userId = userData.user.id
    const companyId = (invitation.projects as any)?.company_id

    // Create profile for the new user
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        full_name: fullName,
        company_id: companyId,
        role: 'viewer', // External users get viewer role
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Don't fail - user was created, profile can be fixed later
    }

    // Accept the invitation - update the member record
    const { error: updateError } = await adminSupabase
      .from('project_members')
      .update({
        user_id: userId,
        external_email: null, // Convert to internal user
        status: 'active',
        invitation_token: null, // Clear the token
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    if (updateError) {
      console.error('Accept invitation error:', updateError)
      // Don't fail - user was created
    }

    const projectName = (invitation.projects as any)?.name || 'the project'

    return NextResponse.json({
      success: true,
      message: `Account created! You have joined "${projectName}".`,
      userId,
      projectId: invitation.project_id,
      projectName
    })

  } catch (err: any) {
    console.error('Register for invitation error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
