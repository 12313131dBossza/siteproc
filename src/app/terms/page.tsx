import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service | SiteProc',
  description: 'Terms of Service for SiteProc construction management platform',
}

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-600 mb-8">
            Last updated: October 23, 2025
          </p>

          <div className="prose prose-gray max-w-none">
            <h2>1. Agreement to Terms</h2>
            <p>
              By accessing or using SiteProc ("Service"), you agree to be bound by these Terms of Service ("Terms"). 
              If you disagree with any part of these terms, you may not access the Service.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              SiteProc is a construction management platform that provides tools for:
            </p>
            <ul>
              <li>Project and budget management</li>
              <li>Purchase order tracking</li>
              <li>Delivery management and proof of delivery</li>
              <li>Expense tracking and reporting</li>
              <li>Payment processing and vendor management</li>
              <li>Team collaboration and activity logging</li>
            </ul>

            <h2>3. User Accounts</h2>
            <h3>3.1 Registration</h3>
            <p>
              To use the Service, you must register for an account by providing accurate and complete information. 
              You are responsible for maintaining the confidentiality of your account credentials.
            </p>
            <h3>3.2 User Responsibilities</h3>
            <p>You agree to:</p>
            <ul>
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain the security of your password</li>
              <li>Promptly update account information to keep it accurate</li>
              <li>Accept all risks of unauthorized access to your account</li>
            </ul>

            <h2>4. Acceptable Use</h2>
            <h3>4.1 Permitted Use</h3>
            <p>
              You may use the Service only for lawful purposes and in accordance with these Terms. 
              You agree not to use the Service:
            </p>
            <ul>
              <li>In any way that violates applicable laws or regulations</li>
              <li>To transmit harmful or malicious code</li>
              <li>To interfere with or disrupt the Service</li>
              <li>To attempt unauthorized access to other users' data</li>
              <li>For competitive analysis or building similar products</li>
            </ul>

            <h2>5. Data and Privacy</h2>
            <h3>5.1 Data Ownership</h3>
            <p>
              You retain all rights to the data you input into the Service. We claim no ownership over your content.
            </p>
            <h3>5.2 Data Usage</h3>
            <p>
              We collect and use data as described in our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>. 
              By using the Service, you consent to such processing.
            </p>
            <h3>5.3 Data Security</h3>
            <p>
              We implement industry-standard security measures to protect your data. However, no method of transmission 
              over the Internet is 100% secure.
            </p>

            <h2>6. Intellectual Property</h2>
            <h3>6.1 Service Ownership</h3>
            <p>
              The Service, including its original content, features, and functionality, is owned by SiteProc and is 
              protected by copyright, trademark, and other intellectual property laws.
            </p>
            <h3>6.2 Limited License</h3>
            <p>
              Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to 
              access and use the Service.
            </p>

            <h2>7. Payment Terms</h2>
            <h3>7.1 Subscription Fees</h3>
            <p>
              Certain features of the Service may require payment of fees. All fees are quoted in U.S. Dollars and 
              are non-refundable except as required by law.
            </p>
            <h3>7.2 Billing</h3>
            <p>
              Subscription fees are billed in advance on a monthly or annual basis. You authorize us to charge your 
              payment method on file.
            </p>
            <h3>7.3 Cancellation</h3>
            <p>
              You may cancel your subscription at any time. Cancellation takes effect at the end of the current 
              billing period.
            </p>

            <h2>8. Termination</h2>
            <h3>8.1 Termination by You</h3>
            <p>
              You may terminate your account at any time by contacting support or using the account settings interface.
            </p>
            <h3>8.2 Termination by Us</h3>
            <p>
              We may suspend or terminate your access to the Service immediately, without prior notice, for any reason, 
              including breach of these Terms.
            </p>
            <h3>8.3 Effect of Termination</h3>
            <p>
              Upon termination, your right to use the Service will cease. We will retain your data for 30 days to allow 
              for export, after which it may be permanently deleted.
            </p>

            <h2>9. Disclaimers and Limitations of Liability</h2>
            <h3>9.1 Disclaimer of Warranties</h3>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, 
              INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
            <h3>9.2 Limitation of Liability</h3>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SITEPROC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.
            </p>

            <h2>10. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless SiteProc from any claims, damages, losses, liabilities, and expenses 
              arising from your use of the Service or violation of these Terms.
            </p>

            <h2>11. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of significant changes via 
              email or through the Service. Your continued use after changes constitutes acceptance of the modified Terms.
            </p>

            <h2>12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of New York, 
              United States, without regard to its conflict of law provisions.
            </p>

            <h2>13. Dispute Resolution</h2>
            <h3>13.1 Informal Resolution</h3>
            <p>
              Before filing a claim, you agree to contact us to attempt to resolve the dispute informally.
            </p>
            <h3>13.2 Arbitration</h3>
            <p>
              Any disputes arising from these Terms or the Service shall be resolved through binding arbitration in 
              New York, New York.
            </p>

            <h2>14. Miscellaneous</h2>
            <h3>14.1 Entire Agreement</h3>
            <p>
              These Terms constitute the entire agreement between you and SiteProc regarding the Service.
            </p>
            <h3>14.2 Severability</h3>
            <p>
              If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in effect.
            </p>
            <h3>14.3 No Waiver</h3>
            <p>
              Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
            </p>

            <h2>15. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us at:
            </p>
            <p>
              <strong>Email:</strong> legal@siteproc.com<br />
              <strong>Address:</strong> SiteProc, Inc.<br />
              123 Construction Ave, Suite 100<br />
              New York, NY 10001<br />
              United States
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
