import sgMail from '@sendgrid/mail'

type Provider = 'sendgrid' | 'resend' | 'log'

function provider(): Provider {
  const p = (process.env.EMAIL_PROVIDER || 'sendgrid').toLowerCase()
  return (['sendgrid', 'resend', 'log'] as Provider[]).includes(p as Provider) ? (p as Provider) : 'sendgrid'
}

function getFromEnv() {
  // Generic first, then provider-specific, then fallback
  return (
    process.env.EMAIL_FROM ||
    (provider() === 'sendgrid' ? process.env.SENDGRID_FROM : undefined) ||
    (provider() === 'resend' ? process.env.RESEND_FROM : undefined) ||
    'no-reply@siteproc.local'
  )
}

export function getFromAddress() {
  return getFromEnv()
}

export function isEmailEnabled() {
  switch (provider()) {
    case 'sendgrid':
      return !!process.env.SENDGRID_API_KEY
    case 'resend':
      return !!process.env.RESEND_API_KEY
    case 'log':
      return true
  }
}

type BasicMessage = {
  to: string | string[]
  from?: string
  subject: string
  text?: string
  html?: string
}

async function sendViaSendGrid(messages: BasicMessage[]) {
  if (!process.env.SENDGRID_API_KEY) return { skipped: true }
  if (!(sgMail as any)._apiKey && process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  }
  await sgMail.send(messages as any)
  return { ok: true }
}

async function sendViaResend(messages: BasicMessage[]) {
  const key = process.env.RESEND_API_KEY
  if (!key) return { skipped: true }
  const endpoint = 'https://api.resend.com/emails'
  // Send one by one to keep it simple and avoid batching constraints
  for (const m of messages) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: m.from || getFromEnv(),
        to: m.to,
        subject: m.subject,
        text: m.text,
        html: m.html,
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Resend error ${res.status}: ${text}`)
    }
  }
  return { ok: true }
}

export async function sendEmail(msg: BasicMessage | BasicMessage[]) {
  const messages = Array.isArray(msg) ? msg : [msg]
  const withFrom = messages.map(m => ({ from: m.from || getFromEnv(), ...m }))
  const p = provider()
  try {
    if (p === 'log') {
      console.log('[email:log] Skipping send. Messages:', withFrom)
      return { skipped: true }
    }
    if (!isEmailEnabled()) {
      console.log(`[email:${p}] disabled: missing API key; skipping send`)
      return { skipped: true }
    }
    if (p === 'resend') return await sendViaResend(withFrom)
    // default to sendgrid
    return await sendViaSendGrid(withFrom)
  } catch (e: any) {
    console.error(`Email error via ${p}`, e)
    return { ok: false, error: e?.message || String(e) }
  }
}
