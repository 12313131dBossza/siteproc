'use client'

import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface PieChartProps {
  data: any[]
  dataKey: string
  nameKey: string
  formatValue?: 'currency' | 'number' | 'percentage'
  height?: number
  colors?: string[]
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
]

export function PieChart({ 
  data, 
  dataKey, 
  nameKey, 
  formatValue = 'number', 
  height = 300,
  colors = DEFAULT_COLORS
}: PieChartProps) {
  const valueFormatter = (value: number) => {
    switch (formatValue) {
      case 'currency':
        return formatCurrency(value)
      case 'percentage':
        return `${value.toFixed(1)}%`
      default:
        return value.toLocaleString()
    }
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={false}
          outerRadius={100}
          fill="#8884d8"
          dataKey={dataKey}
          nameKey={nameKey}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={valueFormatter}
          contentStyle={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px 12px'
          }}
        />
        <Legend 
          verticalAlign="bottom"
          height={36}
          formatter={(value, entry: any) => {
            const item = data.find((d) => d[nameKey] === value)
            const total = data.reduce((sum, d) => sum + d[dataKey], 0)
            const percent = item ? ((item[dataKey] / total) * 100).toFixed(0) : 0
            return `${value}: ${percent}%`
          }}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  )
}
