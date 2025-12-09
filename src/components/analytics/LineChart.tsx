'use client'

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useCurrency } from '@/lib/CurrencyContext'

interface LineChartProps {
  data: any[]
  lines: {
    dataKey: string
    name: string
    color: string
  }[]
  xAxisKey: string
  formatValue?: 'currency' | 'number'
  height?: number
}

export function LineChart({ data, lines, xAxisKey, formatValue = 'number', height = 300 }: LineChartProps) {
  const { formatAmount } = useCurrency();
  const valueFormatter = (value: number) => {
    return formatValue === 'currency' ? formatAmount(value) : value.toLocaleString()
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey={xAxisKey} 
          stroke="#888"
          fontSize={12}
        />
        <YAxis 
          stroke="#888"
          fontSize={12}
          tickFormatter={valueFormatter}
        />
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
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
