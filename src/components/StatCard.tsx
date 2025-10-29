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
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={cn('flex-shrink-0 p-2.5 rounded-lg', iconBgColor)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
        {badge !== undefined && (
          <span className={cn('text-xs font-medium flex-shrink-0', badgeColor)}>
            {badge}
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="inline-flex items-baseline px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-md">
          <p className="text-lg sm:text-xl font-bold text-gray-900 leading-none break-all">
            {value}
          </p>
        </div>
        
        <p className="text-xs sm:text-sm text-gray-500 font-medium">{title}</p>
        
        {subtitle && (
          <p className="text-xs text-gray-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
