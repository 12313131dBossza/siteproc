import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck, Globe } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy | SiteProc',
  description: 'Privacy Policy for SiteProc construction management platform',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-8 md:p-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-10 w-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">
              Privacy Policy
            </h1>
          </div>
          <p className="text-gray-600 mb-8">
            Last updated: October 23, 2025
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <Lock className="h-6 w-6 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Secure</h3>
                <p className="text-sm text-gray-600">Your data is encrypted and protected</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <Eye className="h-6 w-6 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Transparent</h3>
                <p className="text-sm text-gray-600">Clear about what we collect</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
              <UserCheck className="h-6 w-6 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Control</h3>
                <p className="text-sm text-gray-600">You own and control your data</p>
              </div>
            </div>
          </div>

          <div className="prose prose-gray max-w-none">
            <h2>1. Introduction</h2>
            <p>
              SiteProc ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains 
              how we collect, use, disclose, and safeguard your information when you use our construction management 
              platform ("Service").
            </p>
            <p>
              By using the Service, you consent to the data practices described in this policy. If you do not agree 
              with this policy, please do not use the Service.
            </p>

            <h2>2. Information We Collect</h2>
            <h3>2.1 Information You Provide</h3>
            <p>We collect information you provide directly to us, including:</p>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, company name, phone number</li>
              <li><strong>Profile Data:</strong> Job title, role, avatar/photo</li>
              <li><strong>Project Data:</strong> Project details, budgets, timelines, locations</li>
              <li><strong>Order Data:</strong> Purchase orders, vendor information, delivery details</li>
              <li><strong>Financial Data:</strong> Expense records, payment information, invoices</li>
              <li><strong>Communications:</strong> Messages, notes, comments within the platform</li>
              <li><strong>Files:</strong> Documents, images, PDFs you upload (e.g., proof of delivery)</li>
            </ul>

            <h3>2.2 Information We Collect Automatically</h3>
            <p>When you use the Service, we automatically collect:</p>
            <ul>
              <li><strong>Usage Data:</strong> Pages viewed, features used, actions taken, time spent</li>
              <li><strong>Device Information:</strong> IP address, browser type, operating system, device type</li>
              <li><strong>Log Data:</strong> Access times, error logs, performance metrics</li>
              <li><strong>Cookies:</strong> Authentication tokens, preferences, session data</li>
              <li><strong>Location Data:</strong> General location based on IP address (not precise GPS)</li>
            </ul>

            <h3>2.3 Information from Third Parties</h3>
            <p>We may receive information from:</p>
            <ul>
              <li><strong>Authentication Providers:</strong> Google, Microsoft (if you use SSO)</li>
              <li><strong>Payment Processors:</strong> Stripe, PayPal (transaction data only)</li>
              <li><strong>Analytics Services:</strong> Google Analytics, Vercel Analytics</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>

            <h3>3.1 Provide and Improve the Service</h3>
            <ul>
              <li>Create and manage your account</li>
              <li>Process transactions and send transaction notifications</li>
              <li>Provide customer support</li>
              <li>Analyze usage patterns to improve features</li>
              <li>Detect and prevent fraud and abuse</li>
              <li>Ensure technical functionality and security</li>
            </ul>

            <h3>3.2 Communicate with You</h3>
            <ul>
              <li>Send important updates about your account or the Service</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Send newsletters and marketing communications (with your consent)</li>
              <li>Notify you about new features and updates</li>
            </ul>

            <h3>3.3 Legal and Compliance</h3>
            <ul>
              <li>Comply with legal obligations and respond to legal requests</li>
              <li>Enforce our Terms of Service</li>
              <li>Protect our rights, property, and safety</li>
            </ul>

            <h2>4. How We Share Your Information</h2>
            <p>We may share your information in the following circumstances:</p>

            <h3>4.1 With Your Consent</h3>
            <p>
              We will share your information when you explicitly consent (e.g., integrating with third-party tools).
            </p>

            <h3>4.2 Within Your Company</h3>
            <p>
              Your data is shared with other users in your company account based on their role and permissions. 
              Admins and managers may have access to more data than regular users.
            </p>

            <h3>4.3 Service Providers</h3>
            <p>
              We share data with trusted third-party service providers who help us operate the Service:
            </p>
            <ul>
              <li><strong>Hosting:</strong> Vercel (infrastructure)</li>
              <li><strong>Database:</strong> Supabase (data storage)</li>
              <li><strong>Email:</strong> SendGrid, AWS SES (transactional emails)</li>
              <li><strong>Analytics:</strong> Google Analytics, Vercel Analytics</li>
              <li><strong>Payments:</strong> Stripe (payment processing)</li>
              <li><strong>File Storage:</strong> AWS S3, Supabase Storage (file uploads)</li>
            </ul>

            <h3>4.4 Legal Requirements</h3>
            <p>
              We may disclose your information if required by law, court order, or governmental authority, or to 
              protect our rights or the safety of others.
            </p>

            <h3>4.5 Business Transfers</h3>
            <p>
              In the event of a merger, acquisition, or sale of assets, your information may be transferred to 
              the acquiring entity.
            </p>

            <h2>5. Data Security</h2>
            <h3>5.1 Security Measures</h3>
            <p>We implement industry-standard security measures to protect your data:</p>
            <ul>
              <li><strong>Encryption:</strong> Data is encrypted in transit (TLS/SSL) and at rest (AES-256)</li>
              <li><strong>Authentication:</strong> Secure password hashing (bcrypt) and optional 2FA</li>
              <li><strong>Access Control:</strong> Role-based permissions and Row-Level Security (RLS)</li>
              <li><strong>Monitoring:</strong> Continuous security monitoring and audit logs</li>
              <li><strong>Backups:</strong> Regular automated backups with encryption</li>
              <li><strong>Infrastructure:</strong> SOC 2 compliant hosting providers (Vercel, Supabase)</li>
            </ul>

            <h3>5.2 Your Responsibility</h3>
            <p>You are responsible for:</p>
            <ul>
              <li>Keeping your password secure and confidential</li>
              <li>Logging out of shared devices</li>
              <li>Reporting suspicious activity immediately</li>
              <li>Ensuring your team members follow security best practices</li>
            </ul>

            <h2>6. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide the Service. 
              When you delete your account:
            </p>
            <ul>
              <li><strong>Immediate:</strong> Your account is deactivated and no longer accessible</li>
              <li><strong>30 days:</strong> Grace period to allow for data export or account recovery</li>
              <li><strong>After 30 days:</strong> Your data is permanently deleted from active systems</li>
              <li><strong>Backups:</strong> Data in backups may persist for up to 90 days</li>
            </ul>
            <p>
              We may retain certain information longer if required by law (e.g., financial records for 7 years).
            </p>

            <h2>7. Your Rights and Choices</h2>
            <h3>7.1 Access and Portability</h3>
            <p>
              You have the right to access your data and export it in a machine-readable format (CSV, JSON). 
              Use the Settings > Export Data feature or contact support.
            </p>

            <h3>7.2 Correction and Update</h3>
            <p>
              You can update your account information at any time through Settings > Profile.
            </p>

            <h3>7.3 Deletion</h3>
            <p>
              You can request deletion of your account and data by contacting support@siteproc.com or using 
              Settings > Delete Account.
            </p>

            <h3>7.4 Marketing Communications</h3>
            <p>
              You can opt out of marketing emails by clicking "Unsubscribe" in any marketing email or updating 
              your preferences in Settings > Notifications.
            </p>

            <h3>7.5 Do Not Track</h3>
            <p>
              We currently do not respond to Do Not Track (DNT) browser signals. However, you can disable cookies 
              in your browser settings.
            </p>

            <h2>8. International Data Transfers</h2>
            <p>
              Your data may be transferred to and stored on servers located outside your country. We ensure 
              appropriate safeguards are in place for international transfers, including:
            </p>
            <ul>
              <li>Standard Contractual Clauses (SCCs) with service providers</li>
              <li>Hosting in regions with strong data protection laws (US, EU)</li>
              <li>Compliance with GDPR for EU users</li>
            </ul>

            <h2>9. Children's Privacy</h2>
            <p>
              The Service is not intended for children under 13 years of age (or 16 in the EU). We do not 
              knowingly collect personal information from children. If we learn we have collected data from 
              a child, we will delete it promptly.
            </p>

            <h2>10. Third-Party Links</h2>
            <p>
              The Service may contain links to third-party websites or services. We are not responsible for 
              the privacy practices of these third parties. Please review their privacy policies.
            </p>

            <h2>11. GDPR Compliance (EU Users)</h2>
            <p>If you are in the European Economic Area (EEA), you have additional rights under GDPR:</p>
            <ul>
              <li><strong>Right to Access:</strong> Request a copy of your data</li>
              <li><strong>Right to Rectification:</strong> Correct inaccurate data</li>
              <li><strong>Right to Erasure:</strong> Request deletion ("right to be forgotten")</li>
              <li><strong>Right to Restriction:</strong> Limit how we use your data</li>
              <li><strong>Right to Data Portability:</strong> Export your data</li>
              <li><strong>Right to Object:</strong> Object to processing for marketing or legitimate interests</li>
              <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
            </ul>
            <p>
              To exercise these rights, contact privacy@siteproc.com. We will respond within 30 days.
            </p>

            <h2>12. CCPA Compliance (California Users)</h2>
            <p>If you are a California resident, you have rights under the CCPA:</p>
            <ul>
              <li><strong>Right to Know:</strong> Know what data we collect, use, and share</li>
              <li><strong>Right to Delete:</strong> Request deletion of your data</li>
              <li><strong>Right to Opt-Out:</strong> Opt out of "sale" of personal information (we do not sell data)</li>
              <li><strong>Right to Non-Discrimination:</strong> Not be discriminated against for exercising rights</li>
            </ul>
            <p>
              To exercise these rights, contact privacy@siteproc.com or call 1-800-SITEPROC.
            </p>

            <h2>13. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes via:
            </p>
            <ul>
              <li>Email notification to your registered email address</li>
              <li>Prominent notice on the Service</li>
              <li>Update to the "Last updated" date at the top</li>
            </ul>
            <p>
              Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>

            <h2>14. Contact Us</h2>
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or your data, 
              please contact us:
            </p>
            <div className="bg-blue-50 p-6 rounded-lg mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">SiteProc Privacy Team</h3>
              <p className="mb-2">
                <strong>Email:</strong>{' '}
                <a href="mailto:privacy@siteproc.com" className="text-blue-600 hover:underline">
                  privacy@siteproc.com
                </a>
              </p>
              <p className="mb-2">
                <strong>Mail:</strong><br />
                SiteProc, Inc.<br />
                Attn: Privacy Officer<br />
                123 Construction Ave, Suite 100<br />
                New York, NY 10001<br />
                United States
              </p>
              <p>
                <strong>Phone:</strong> 1-800-SITEPROC (1-800-748-3776)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
