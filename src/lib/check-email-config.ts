// Environment Check for Email Configuration
// Run this in your Next.js API route or server environment

export default function checkEmailConfig() {
  console.log('📧 Checking Email Configuration...\n');

  // Check environment variables
  const emailProvider = process.env.EMAIL_PROVIDER || 'sendgrid';
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || process.env.SENDGRID_FROM || process.env.RESEND_FROM;

  console.log('🔧 Configuration:');
  console.log(`   Email Provider: ${emailProvider}`);
  console.log(`   Email From: ${emailFrom || 'Not set'}`);

  if (emailProvider === 'sendgrid' || !emailProvider) {
    console.log(`   SendGrid API Key: ${sendgridKey ? '✅ Set' : '❌ Missing'}`);
    if (!sendgridKey) {
      console.log('      → Add SENDGRID_API_KEY to your environment variables');
    }
  }

  if (emailProvider === 'resend') {
    console.log(`   Resend API Key: ${resendKey ? '✅ Set' : '❌ Missing'}`);
    if (!resendKey) {
      console.log('      → Add RESEND_API_KEY to your environment variables');
    }
  }

  if (emailProvider === 'log') {
    console.log('   Using log mode - emails will be logged to console only');
  }

  // Check if notifications will work
  const isConfigured = 
    (emailProvider === 'sendgrid' && sendgridKey) ||
    (emailProvider === 'resend' && resendKey) ||
    (emailProvider === 'log');

  console.log('\n📊 Status:');
  if (isConfigured) {
    console.log('✅ Email notifications are configured and should work');
  } else {
    console.log('❌ Email notifications are not configured');
    console.log('   Add the required API keys to your Vercel environment variables');
  }

  return {
    configured: isConfigured,
    provider: emailProvider,
    fromAddress: emailFrom
  };
}
