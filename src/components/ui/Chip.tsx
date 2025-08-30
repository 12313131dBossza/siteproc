import React from 'react';

interface ChipProps {
  label: string;
  value: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export function Chip({ label, value, variant = 'default' }: ChipProps) {
  const variantClasses = {
    default: 'border-zinc-200 bg-zinc-50',
    primary: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    success: 'border-green-200 bg-green-50 text-green-700',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    danger: 'border-red-200 bg-red-50 text-red-700',
  };

  return (
    <div className={`rounded-xl border px-3 py-2 flex items-center justify-between ${variantClasses[variant]}`}>
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
