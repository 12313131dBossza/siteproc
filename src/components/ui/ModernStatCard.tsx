import React from 'react';

interface ModernStatCardProps {
  title: string;
  value: string;
  trend: string;
  icon: React.ReactNode;
}

export function ModernStatCard({ title, value, trend, icon }: ModernStatCardProps) {
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
