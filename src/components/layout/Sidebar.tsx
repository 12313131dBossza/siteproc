export default function Sidebar(){
  return (
    <aside className="w-56 shrink-0 border-r border-black/10 dark:border-white/10 p-4 hidden md:flex flex-col gap-4">
      <div className="text-sm font-semibold">Navigation</div>
      <nav className="text-xs flex flex-col gap-1">
        <a href="/dashboard" className="hover:underline">Dashboard</a>
        <a href="/dashboard/vendors" className="hover:underline">Vendors</a>
        <a href="/dashboard/jobs" className="hover:underline">Jobs</a>
        <a href="/dashboard/expenses" className="hover:underline">Expenses</a>
        <a href="/dashboard/settings" className="hover:underline">Settings</a>
      </nav>
    </aside>
  )
}
