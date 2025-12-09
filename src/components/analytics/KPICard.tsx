'use client'

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useCurrency } from '@/lib/CurrencyContext'

interface KPICardProps {
  title: string
  value: number | string
  icon: LucideIcon
  trend?: number // Percentage change
  trendLabel?: string
  format?: 'currency' | 'number' | 'percentage'
  description?: string
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo'
}

export function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  format = 'number',
  description,
  color = 'blue'
}: KPICardProps) {
  const { formatAmount } = useCurrency();
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'currency':
        return formatAmount(val)
      case 'percentage':
        return `${val.toFixed(1)}%`
      default:
        return val.toLocaleString()
    }
  }

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600'
  }

  const getTrendIcon = () => {
    if (trend === undefined || trend === null) return null
    if (trend > 0) return <TrendingUp className="w-4 h-4" />
    if (trend < 0) return <TrendingDown className="w-4 h-4" />
    return <Minus className="w-4 h-4" />
  }

  const getTrendColor = () => {
    if (trend === undefined || trend === null) return 'text-gray-500'
    if (trend > 0) return 'text-green-600'
    if (trend < 0) return 'text-red-600'
    return 'text-gray-500'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="inline-flex items-baseline px-3 py-2 bg-gray-50 border border-gray-100 rounded-md">
              <p className="text-lg sm:text-2xl font-bold text-gray-900 leading-none">
                {formatValue(value)}
              </p>
            </div>
            {description && (
              <span className="text-sm text-gray-500">{description}</span>
            )}
          </div>

          {(trend !== undefined) && (
            <div className="mt-3 flex items-center gap-2">
              <span className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
                {getTrendIcon()}
                {Math.abs(trend).toFixed(1)}%
                {trendLabel && <span className="text-gray-500 font-normal">{trendLabel}</span>}
              </span>
            </div>
          )}
        </div>

        <div className={`flex-shrink-0 p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}
