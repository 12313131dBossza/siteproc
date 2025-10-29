'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/app-layout'
import { KPICard } from '@/components/analytics/KPICard'
import { LineChart } from '@/components/analytics/LineChart'
import { BarChart } from '@/components/analytics/BarChart'
import { PieChart } from '@/components/analytics/PieChart'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  ShoppingCart,
  CreditCard,
  PieChart as PieChartIcon,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface AnalyticsData {
  kpis: {
    totalRevenue: number
    totalExpenses: number
    totalPayments: number
    profit: number
    profitMargin: number
    activeProjects: number
    totalProjects: number
    budgetUtilization: number
    totalBudget: number
    budgetUsed: number
  }
  charts: {
    expensesByCategory: Array<{ name: string; value: number }>
    topVendors: Array<{ vendor: string; amount: number }>
    dailyTrend: Array<{ date: string; revenue: number; expenses: number; profit: number }>
    projectPerformance: Array<{
      id: string
      name: string
      code: string
      budget: number
      spent: number
      remaining: number
      utilization: number
      status: string
    }>
  }
  summary: {
    ordersCount: number
    expensesCount: number
    paymentsCount: number
    avgOrderValue: number
    avgExpenseValue: number
  }
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('month')

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics?range=${dateRange}`)
      const result = await response.json()
      
      if (result.ok) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!data) return

    // Create CSV content
    const csv = []
    
    // Header
    csv.push('SiteProc Analytics Report')
    csv.push(`Date Range: ${dateRange}`)
    csv.push(`Generated: ${new Date().toLocaleString()}`)
    csv.push('')
    
    // KPIs
    csv.push('KEY PERFORMANCE INDICATORS')
    csv.push('Metric,Value')
    csv.push(`Total Revenue,${data.kpis.totalRevenue}`)
    csv.push(`Total Expenses,${data.kpis.totalExpenses}`)
    csv.push(`Net Profit,${data.kpis.profit}`)
    csv.push(`Profit Margin,${data.kpis.profitMargin.toFixed(2)}%`)
    csv.push(`Active Projects,${data.kpis.activeProjects}`)
    csv.push(`Total Projects,${data.kpis.totalProjects}`)
    csv.push(`Budget Utilization,${data.kpis.budgetUtilization.toFixed(2)}%`)
    csv.push('')
    
    // Project Performance
    csv.push('PROJECT PERFORMANCE')
    csv.push('Project,Code,Budget,Spent,Remaining,Utilization %,Status')
    data.charts.projectPerformance.forEach(p => {
      csv.push(`"${p.name}",${p.code},${p.budget},${p.spent},${p.remaining},${p.utilization.toFixed(2)},${p.status}`)
    })
    csv.push('')
    
    // Expenses by Category
    csv.push('EXPENSES BY CATEGORY')
    csv.push('Category,Amount')
    data.charts.expensesByCategory.forEach(c => {
      csv.push(`${c.name},${c.value}`)
    })
    csv.push('')
    
    // Top Vendors
    csv.push('TOP VENDORS')
    csv.push('Vendor,Amount')
    data.charts.topVendors.forEach(v => {
      csv.push(`${v.vendor},${v.amount}`)
    })
    
    // Create and download file
    const csvContent = csv.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `analytics-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AppLayout>
    )
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Failed to load analytics data</p>
          <Button onClick={fetchAnalytics} className="mt-4">
            Retry
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-500 mt-1">Track your business performance and insights</p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            
            <Button variant="outline" onClick={fetchAnalytics}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <KPICard
            title="Total Revenue"
            value={data.kpis.totalRevenue}
            icon={DollarSign}
            format="currency"
            color="green"
            description={`${data.summary.ordersCount} orders`}
          />
          
          <KPICard
            title="Total Expenses"
            value={data.kpis.totalExpenses}
            icon={TrendingDown}
            format="currency"
            color="red"
            description={`${data.summary.expensesCount} expenses`}
          />
          
          <KPICard
            title="Net Profit"
            value={data.kpis.profit}
            icon={data.kpis.profit >= 0 ? TrendingUp : TrendingDown}
            format="currency"
            color={data.kpis.profit >= 0 ? 'green' : 'red'}
            trend={data.kpis.profitMargin}
            trendLabel="margin"
          />
          
          <KPICard
            title="Active Projects"
            value={data.kpis.activeProjects}
            icon={Building2}
            color="blue"
            description={`of ${data.kpis.totalProjects} total`}
          />
        </div>

        {/* Budget Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Budget Utilization</h3>
              <PieChartIcon className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Used</span>
                  <span className="font-semibold text-gray-900">
                    ${data.kpis.budgetUsed.toLocaleString()} / ${data.kpis.totalBudget.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      data.kpis.budgetUtilization > 90 ? 'bg-red-600' :
                      data.kpis.budgetUtilization > 75 ? 'bg-yellow-600' :
                      'bg-green-600'
                    }`}
                    style={{ width: `${Math.min(data.kpis.budgetUtilization, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {data.kpis.budgetUtilization.toFixed(1)}% of total budget used
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Payments Overview</h3>
              <CreditCard className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Payments</span>
                <span className="text-2xl font-bold text-gray-900">
                  ${data.kpis.totalPayments.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Payment Count</span>
                <span className="font-medium">{data.summary.paymentsCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue vs Expenses Trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Expenses Trend</h3>
          <LineChart
            data={data.charts.dailyTrend}
            lines={[
              { dataKey: 'revenue', name: 'Revenue', color: '#10b981' },
              { dataKey: 'expenses', name: 'Expenses', color: '#ef4444' },
              { dataKey: 'profit', name: 'Profit', color: '#3b82f6' }
            ]}
            xAxisKey="date"
            formatValue="currency"
            height={350}
          />
        </div>

        {/* Expenses by Category & Top Vendors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h3>
            {data.charts.expensesByCategory.length > 0 ? (
              <PieChart
                data={data.charts.expensesByCategory}
                dataKey="value"
                nameKey="name"
                formatValue="currency"
                height={300}
              />
            ) : (
              <p className="text-center text-gray-500 py-12">No expense data available</p>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Vendors</h3>
            {data.charts.topVendors.length > 0 ? (
              <BarChart
                data={data.charts.topVendors}
                bars={[{ dataKey: 'amount', name: 'Amount', color: '#3b82f6' }]}
                xAxisKey="vendor"
                formatValue="currency"
                height={300}
              />
            ) : (
              <p className="text-center text-gray-500 py-12">No vendor data available</p>
            )}
          </div>
        </div>

        {/* Project Performance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Budget</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Spent</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Utilization</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.charts.projectPerformance.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{project.name}</div>
                        <div className="text-sm text-gray-500">{project.code}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      ${project.budget.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      ${project.spent.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={project.remaining < 0 ? 'text-red-600 font-medium' : 'text-gray-900'}>
                        ${project.remaining.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              project.utilization > 100 ? 'bg-red-600' :
                              project.utilization > 90 ? 'bg-yellow-600' :
                              'bg-green-600'
                            }`}
                            style={{ width: `${Math.min(project.utilization, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">
                          {project.utilization.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        project.status === 'active' ? 'bg-green-100 text-green-800' :
                        project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
