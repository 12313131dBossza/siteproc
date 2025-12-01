import Link from 'next/link'
import { Home, ArrowLeft, Search, HardHat } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-6 bg-blue-100 rounded-full">
            <HardHat className="h-16 w-16 text-blue-600" />
          </div>
        </div>
        
        {/* 404 */}
        <h1 className="text-8xl font-bold text-gray-200 mb-2">404</h1>
        
        {/* Message */}
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved. 
          Let's get you back on track.
        </p>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
        
        {/* Help Link */}
        <p className="mt-8 text-sm text-gray-500">
          Need help? <Link href="mailto:support@siteproc.com" className="text-blue-600 hover:underline">Contact support</Link>
        </p>
      </div>
    </div>
  )
}
