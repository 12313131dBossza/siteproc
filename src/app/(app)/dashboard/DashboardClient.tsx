"use client";
import { useState } from "react";
import { PackagePlus, ReceiptText, FileEdit, Truck, PiggyBank, Activity, LogOut, Search } from "lucide-react";
import { sbBrowser } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

interface DashboardClientProps {
  user: any;
  profile: any;
  role: string;
  displayName: string;
}

/**
 * Admin Dashboard with beautiful modern design
 * - Production-ready Tailwind layout
 * - Clean cards, action grid, recent activity, simple chart placeholder
 */
export default function DashboardClient({ user, profile, role, displayName }: DashboardClientProps) {
  const [query, setQuery] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  async function doLogout() {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    
    try {
      const supabase = sbBrowser();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
      }
      
      router.replace('/login');
      
    } catch (e) {
      console.error('Logout exception:', e);
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false);
    }
  }

  const handleAction = (actionType: string) => {
    switch (actionType) {
      case 'delivery':
        router.push('/admin/deliveries/new');
        break;
      case 'expense':
        router.push('/admin/expenses/new');
        break;
      case 'change-order':
        router.push('/admin/change-orders/new');
        break;
      case 'delivery-checkin':
        router.push('/admin/deliveries');
        break;
      default:
        console.log(`Action: ${actionType}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-zinc-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-indigo-600" />
            <div className="leading-tight">
              <div className="font-semibold">siteproc</div>
              <div className="text-xs text-zinc-500">Welcome, {displayName}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="outline-none text-sm bg-transparent placeholder:text-zinc-400"
                placeholder="Search deliveries, expenses, orders…"
              />
            </div>
            <button 
              onClick={doLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-zinc-50 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Greeting + stat row */}
        <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Open deliveries" value="18" trend="+3 this week" icon={<Truck className="h-5 w-5" />} />
          <StatCard title="Month spend" value="$12,480" trend="-4% vs last mo" icon={<PiggyBank className="h-5 w-5" />} />
          <StatCard title="Change orders" value="5" trend="2 pending" icon={<FileEdit className="h-5 w-5" />} />
        </section>

        {/* Quick actions */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-zinc-500 tracking-wide">Quick actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ActionCard
              title="Log a delivery"
              description="Record new materials or equipment on-site"
              icon={<PackagePlus className="h-5 w-5" />}
              onClick={() => handleAction('delivery')}
            />
            <ActionCard
              title="Add an expense"
              description="Track purchases, invoices, payroll"
              icon={<ReceiptText className="h-5 w-5" />}
              onClick={() => handleAction('expense')}
            />
            <ActionCard
              title="Request change order"
              description="Create a change order draft for review"
              icon={<FileEdit className="h-5 w-5" />}
              onClick={() => handleAction('change-order')}
            />
            <ActionCard
              title="Delivery check-in"
              description="Confirm received quantities and quality"
              icon={<Truck className="h-5 w-5" />}
              onClick={() => handleAction('delivery-checkin')}
            />
          </div>
        </section>

        {/* Two-column content */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent activity */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="font-semibold">Recent activity</h3>
              <button className="text-sm text-indigo-600 hover:underline">View all</button>
            </div>
            <ul className="divide-y divide-zinc-200">
              {recentActivity.map((item) => (
                <li key={item.id} className="p-4 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-zinc-100 grid place-items-center">
                    <Activity className="h-4 w-4 text-zinc-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-xs text-zinc-500">{item.meta}</div>
                  </div>
                  <div className="text-xs text-zinc-500">{item.time}</div>
                </li>
              ))}
            </ul>
          </div>

          {/* Spend breakdown placeholder */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-4">
            <h3 className="font-semibold mb-2">Spend breakdown</h3>
            <div className="text-sm text-zinc-500 mb-4">(Chart placeholder) Labor 46% • Materials 38% • Rentals 16%</div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Chip label="Labor" value="$5,741" />
              <Chip label="Materials" value="$4,742" />
              <Chip label="Rentals" value="$1,997" />
            </div>
            <div className="mt-6 h-40 rounded-xl bg-gradient-to-br from-zinc-50 to-zinc-100 border border-dashed border-zinc-200 grid place-items-center text-zinc-400 text-sm">
              Add <code>recharts</code> or your charting lib here
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ title, value, trend, icon }: { title: string; value: string; trend: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-4 flex items-start gap-3">
      <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">{icon}</div>
      <div className="flex-1">
        <div className="text-sm text-zinc-500">{title}</div>
        <div className="text-2xl font-semibold leading-tight">{value}</div>
        <div className="text-xs text-zinc-500 mt-1">{trend}</div>
      </div>
    </div>
  );
}

function ActionCard({ title, description, icon, onClick }: { title: string; description: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group text-left rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-zinc-100 text-zinc-700 grid place-items-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">{icon}</div>
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-sm text-zinc-500">{description}</div>
        </div>
      </div>
    </button>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 flex items-center justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

const recentActivity = [
  { id: 1, title: "Delivery #D-102 received", meta: "8 pallets of cement — by Alex Chen", time: "2h ago" },
  { id: 2, title: "Expense approved", meta: "$1,240 • rental excavator — by Marie K.", time: "Yesterday" },
  { id: 3, title: "Change order drafted", meta: "Foundation rebar upgrade • Project A", time: "2d ago" },
];
