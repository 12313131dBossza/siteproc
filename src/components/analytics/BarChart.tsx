'use client'

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface BarChartProps {
  data: any[]
  bars: {
    dataKey: string
    name: string
    color: string
  }[]
  xAxisKey: string
  formatValue?: 'currency' | 'number'
  height?: number
  layout?: 'horizontal' | 'vertical'
}

export function BarChart({ 
  data, 
  bars, 
  xAxisKey, 
  formatValue = 'number', 
  height = 300,
  layout = 'horizontal'
}: BarChartProps) {
  const valueFormatter = (value: number) => {
    return formatValue === 'currency' ? formatCurrency(value) : value.toLocaleString()
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart 
        data={data} 
        layout={layout}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        {layout === 'horizontal' ? (
          <>
            <XAxis dataKey={xAxisKey} stroke="#888" fontSize={12} />
            <YAxis stroke="#888" fontSize={12} tickFormatter={valueFormatter} />
          </>
        ) : (
          <>
            <XAxis type="number" stroke="#888" fontSize={12} tickFormatter={valueFormatter} />
            <YAxis dataKey={xAxisKey} type="category" stroke="#888" fontSize={12} />
          </>
        )}
        <Tooltip 
          formatter={valueFormatter}
          contentStyle={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px 12px'
          }}
        />
        <Legend />
        {bars.map((bar) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={bar.color}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
