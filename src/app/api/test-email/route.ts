import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, isEmailEnabled } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { to } = await request.json()

    if (!to) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    // Check if email is enabled
    if (!isEmailEnabled()) {
      return NextResponse.json(
        { error: 'Email service is not configured. Add RESEND_API_KEY to environment variables.' },
        { status: 500 }
      )
    }

    // Send simple test email
    const result = await sendEmail({
      to,
      subject: 'Test Email from SiteProc',
      html: `
        <h1>Test Email ✅</h1>
        <p>This is a test email from your SiteProc application.</p>
        <p>If you're seeing this, your email integration is working correctly!</p>
        <hr>
        <p style="color: #666; font-size: 14px;">
          Sent at: ${new Date().toLocaleString()}<br>
          Provider: Resend<br>
          From: SiteProc Email System
        </p>
      `,
      text: `Test Email from SiteProc

This is a test email from your SiteProc application.
If you're seeing this, your email integration is working correctly!

Sent at: ${new Date().toLocaleString()}
Provider: Resend
From: SiteProc Email System`
    })

    if (result.ok === false) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Email sent successfully',
      result 
    })
  } catch (error: any) {
    console.error('[test-email] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}
