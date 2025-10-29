'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  badge?: string | number;
  badgeColor?: string;
  subtitle?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-50',
  badge,
  badgeColor = 'text-gray-500',
  subtitle,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className={cn('flex-shrink-0 p-2 sm:p-2.5 rounded-lg', iconBgColor)}>
          <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', iconColor)} />
        </div>
        {badge !== undefined && (
          <span className={cn('text-xs font-medium', badgeColor)}>
            {badge}
          </span>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs sm:text-sm text-gray-500 font-medium">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
