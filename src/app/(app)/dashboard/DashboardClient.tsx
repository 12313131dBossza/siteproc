"use client";
import { useMemo, useState } from "react";
import { PackagePlus, ReceiptText, FileEdit, Truck, PiggyBank, Activity, LogOut, Search, Bell, TrendingUp, TrendingDown } from "lucide-react";
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

  const fmt = useMemo(()=>new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }), [])

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-zinc-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-[#1E3A8A]" />
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
            <button aria-label="Notifications" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm hover:bg-zinc-50">
              <Bell className="h-4 w-4 text-zinc-600" />
            </button>
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
        {/* Metrics */}
        <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard title="Deliveries" value="18" change={+12} icon={<Truck className="h-6 w-6" />} color="indigo" />
          <MetricCard title="Expenses" value={fmt.format(12480)} change={-4} icon={<PiggyBank className="h-6 w-6" />} color="purple" />
          <MetricCard title="Change Orders" value="5" change={+8} icon={<FileEdit className="h-6 w-6" />} color="blue" />
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
          {/* Recent activity timeline */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="font-semibold">Recent activity</h3>
              <button className="text-sm text-[#6366F1] hover:underline">View all</button>
            </div>
            <ol className="p-4 space-y-4">
              {recentActivity.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <div className={`mt-1 h-6 w-6 rounded-full grid place-items-center ${item.kind==='approved' ? 'bg-green-100 text-green-700' : item.kind==='rejected' ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-700'}`}>
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium flex items-center gap-2">{item.title}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.kind==='approved' ? 'bg-green-100 text-green-700' : item.kind==='rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'}`}>{item.kind}</span>
                    </div>
                    <div className="text-xs text-zinc-500">{item.meta}</div>
                  </div>
                  <div className="text-xs text-zinc-500 whitespace-nowrap">{item.time}</div>
                </li>
              ))}
            </ol>
          </div>

          {/* Spend breakdown with donut placeholder and totals */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-4">
            <h3 className="font-semibold mb-2">Spend breakdown</h3>
            <div className="flex items-center gap-4">
              <div className="relative h-40 w-40">
                {/* Donut placeholder */}
                <svg viewBox="0 0 36 36" className="h-40 w-40">
                  <circle cx="18" cy="18" r="16" fill="#fff" />
                  <circle cx="18" cy="18" r="16" fill="transparent" stroke="#e5e7eb" strokeWidth="4" />
                  <circle cx="18" cy="18" r="16" fill="transparent" stroke="#6366F1" strokeWidth="4" strokeDasharray="40 60" strokeDashoffset="0" />
                  <circle cx="18" cy="18" r="16" fill="transparent" stroke="#22C55E" strokeWidth="4" strokeDasharray="30 70" strokeDashoffset="40" />
                  <circle cx="18" cy="18" r="16" fill="transparent" stroke="#1E3A8A" strokeWidth="4" strokeDasharray="20 80" strokeDashoffset="70" />
                </svg>
                <div className="absolute inset-0 grid place-items-center text-sm text-zinc-600">
                  Total
                  <div className="font-semibold">{fmt.format(12480)}</div>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-1 gap-2 text-sm">
                <Chip label="Labor" value={fmt.format(5741)} />
                <Chip label="Materials" value={fmt.format(4742)} />
                <Chip label="Rentals" value={fmt.format(1997)} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function MetricCard({ title, value, change, icon, color }: { title: string; value: string; change: number; icon: React.ReactNode; color: 'indigo'|'purple'|'blue' }) {
  const rising = change >= 0
  const colorMap = {
    indigo: 'bg-[#1E3A8A]/10 text-[#1E3A8A] border-[#1E3A8A]/20',
    purple: 'bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/20',
    blue: 'bg-blue-100 text-blue-700 border-blue-200'
  }[color]
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-5 flex items-start gap-4">
      <div className={`h-10 w-10 rounded-xl grid place-items-center ${colorMap}`}>{icon}</div>
      <div className="flex-1">
        <div className="text-sm text-zinc-500">{title}</div>
        <div className="text-3xl font-bold leading-tight">{value}</div>
        <div className={`mt-1 inline-flex items-center gap-1 text-xs ${rising? 'text-green-600' : 'text-red-600'}`}>
          {rising ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />} {Math.abs(change)}%
        </div>
      </div>
    </div>
  )
}

function ActionCard({ title, description, icon, onClick }: { title: string; description: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group text-left rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#F3F4F6] text-zinc-700 grid place-items-center group-hover:bg-[#6366F1]/10 group-hover:text-[#6366F1] transition-colors">{icon}</div>
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
  { id: 1, title: "Delivery #D-102 received", meta: "8 pallets of cement — Alex Chen", time: "2h ago", kind:'approved' },
  { id: 2, title: "Expense submitted", meta: "$1,240 • excavator rental — Marie K.", time: "1d ago", kind:'pending' },
  { id: 3, title: "Change order rejected", meta: "Foundation rebar upgrade • Project A", time: "2d ago", kind:'rejected' },
] as const
