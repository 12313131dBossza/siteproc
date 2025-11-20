import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <nav className="flex items-center justify-between">
          <div className="text-2xl font-bold text-blue-600">SiteProc</div>
          <div className="flex gap-4">
            <Link href="/login" className="px-4 py-2 text-gray-700 hover:text-blue-600">
              Login
            </Link>
            <Link href="/register" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Construction Project Management
          <span className="block text-blue-600">Made Simple</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Streamline your construction projects with powerful tools for budgeting, 
          procurement, deliveries, and team collaboration.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register" className="px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 shadow-lg">
            Start Free Trial
          </Link>
          <Link href="/demo" className="px-8 py-4 bg-white text-blue-600 text-lg rounded-lg hover:bg-gray-50 shadow-lg">
            Watch Demo
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center mb-12">Everything You Need</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard 
            icon="📊"
            title="Budget Management"
            description="Track costs, manage change orders, and stay within budget with real-time insights."
          />
          <FeatureCard 
            icon="📦"
            title="Smart Procurement"
            description="Create orders, manage deliveries, and track inventory all in one place."
          />
          <FeatureCard 
            icon="👥"
            title="Team Collaboration"
            description="Assign roles, manage permissions, and keep everyone on the same page."
          />
          <FeatureCard 
            icon="💰"
            title="Expense Tracking"
            description="Submit, approve, and categorize expenses with automated workflows."
          />
          <FeatureCard 
            icon="📈"
            title="Real-time Reports"
            description="Get insights with comprehensive reports and analytics dashboards."
          />
          <FeatureCard 
            icon="🔔"
            title="Smart Notifications"
            description="Stay updated with in-app and email notifications for all activities."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="bg-blue-600 rounded-2xl p-12 text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-xl mb-8">Join construction teams managing millions in projects.</p>
          <Link href="/register" className="inline-block px-8 py-4 bg-white text-blue-600 text-lg rounded-lg hover:bg-gray-100 shadow-lg">
            Start Your Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 text-center text-gray-600">
        <p>&copy; 2025 SiteProc. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
