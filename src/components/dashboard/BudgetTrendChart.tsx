"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface BudgetTrendData {
  month: string;
  budget: number;
  actual: number;
}

interface BudgetTrendChartProps {
  data: BudgetTrendData[];
}

export function BudgetTrendChart({ data }: BudgetTrendChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Budget Trends</h3>
          <p className="text-sm text-gray-500 mt-1">Budget vs Actual spending over time</p>
        </div>
        <div className="p-2 bg-blue-50 rounded-lg">
          <TrendingUp className="h-5 w-5 text-blue-600" />
        </div>
      </div>
      
      <div className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="month" 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend 
              wrapperStyle={{ fontSize: '14px' }}
              iconType="line"
            />
            <Line 
              type="monotone" 
              dataKey="budget" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
              name="Budget"
            />
            <Line 
              type="monotone" 
              dataKey="actual" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
              name="Actual"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
