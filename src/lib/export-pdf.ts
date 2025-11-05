import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Type definitions for jsPDF with autoTable
type jsPDFWithAutoTable = jsPDF & {
  lastAutoTable: {
    finalY: number
  }
}

export interface PDFExportOptions {
  title: string
  filename: string
  orientation?: 'portrait' | 'landscape'
  metadata?: Record<string, any>
}

/**
 * Initialize PDF document with common settings
 */
function initPDF(options: PDFExportOptions): jsPDFWithAutoTable {
  const pdf = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4'
  }) as jsPDFWithAutoTable

  return pdf
}

/**
 * Add header to PDF
 */
function addHeader(pdf: jsPDFWithAutoTable, title: string) {
  // Company logo/name
  pdf.setFontSize(20)
  pdf.setTextColor(37, 99, 235) // Blue color
  pdf.text('SiteProc', 14, 15)
  
  // Title
  pdf.setFontSize(16)
  pdf.setTextColor(0, 0, 0)
  pdf.text(title, 14, 25)
  
  // Date
  pdf.setFontSize(10)
  pdf.setTextColor(100, 100, 100)
  pdf.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 32)
  
  // Line separator
  pdf.setDrawColor(200, 200, 200)
  pdf.line(14, 35, pdf.internal.pageSize.width - 14, 35)
  
  return 40 // Return Y position for next content
}

/**
 * Add footer to PDF with page numbers
 */
function addFooter(pdf: jsPDFWithAutoTable) {
  const pageCount = pdf.getNumberOfPages()
  
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i)
    pdf.setFontSize(8)
    pdf.setTextColor(150, 150, 150)
    pdf.text(
      `Page ${i} of ${pageCount}`,
      pdf.internal.pageSize.width / 2,
      pdf.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }
}

/**
 * Format currency for PDF
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

/**
 * Export Analytics Report to PDF
 */
export async function exportAnalyticsPDF(data: any, dateRange: string) {
  const pdf = initPDF({
    title: 'Analytics Report',
    filename: `analytics-report-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`
  })

  let yPos = addHeader(pdf, 'Analytics Report')
  yPos += 5

  // KPIs Summary
  pdf.setFontSize(14)
  pdf.setTextColor(0, 0, 0)
  pdf.text('Key Performance Indicators', 14, yPos)
  yPos += 7

  const kpiData = [
    ['Metric', 'Value'],
    ['Total Revenue', formatCurrency(data.kpis.totalRevenue)],
    ['Total Expenses', formatCurrency(data.kpis.totalExpenses)],
    ['Net Profit', formatCurrency(data.kpis.profit)],
    ['Profit Margin', `${data.kpis.profitMargin.toFixed(2)}%`],
    ['Active Projects', `${data.kpis.activeProjects} of ${data.kpis.totalProjects}`],
    ['Budget Utilization', `${data.kpis.budgetUtilization.toFixed(2)}%`]
  ]

  autoTable(pdf, {
    startY: yPos,
    head: [kpiData[0]],
    body: kpiData.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: 14, right: 14 }
  })

  yPos = pdf.lastAutoTable.finalY + 10

  // Project Performance
  if (data.charts.projectPerformance && data.charts.projectPerformance.length > 0) {
    pdf.addPage()
    yPos = 20
    pdf.setFontSize(14)
    pdf.text('Project Performance', 14, yPos)
    yPos += 7

    const projectData = data.charts.projectPerformance.map((p: any) => [
      p.name,
      p.code,
      formatCurrency(p.budget),
      formatCurrency(p.spent),
      formatCurrency(p.remaining),
      `${p.utilization.toFixed(1)}%`,
      p.status
    ])

    autoTable(pdf, {
      startY: yPos,
      head: [['Project', 'Code', 'Budget', 'Spent', 'Remaining', 'Util %', 'Status']],
      body: projectData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 }
    })

    yPos = pdf.lastAutoTable.finalY + 10
  }

  // Expenses by Category
  if (data.charts.expensesByCategory && data.charts.expensesByCategory.length > 0) {
    if (yPos > 200) {
      pdf.addPage()
      yPos = 20
    }

    pdf.setFontSize(14)
    pdf.text('Expenses by Category', 14, yPos)
    yPos += 7

    const expenseData = data.charts.expensesByCategory.map((c: any) => [
      c.name,
      formatCurrency(c.value),
      `${((c.value / data.kpis.totalExpenses) * 100).toFixed(1)}%`
    ])

    autoTable(pdf, {
      startY: yPos,
      head: [['Category', 'Amount', 'Percentage']],
      body: expenseData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 14, right: 14 }
    })

    yPos = pdf.lastAutoTable.finalY + 10
  }

  // Top Vendors
  if (data.charts.topVendors && data.charts.topVendors.length > 0) {
    if (yPos > 200) {
      pdf.addPage()
      yPos = 20
    }

    pdf.setFontSize(14)
    pdf.text('Top Vendors', 14, yPos)
    yPos += 7

    const vendorData = data.charts.topVendors.map((v: any) => [
      v.vendor,
      formatCurrency(v.amount)
    ])

    autoTable(pdf, {
      startY: yPos,
      head: [['Vendor', 'Total Amount']],
      body: vendorData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 14, right: 14 }
    })
  }

  addFooter(pdf)
  pdf.save(`analytics-report-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Export Project Summary to PDF
 */
export async function exportProjectPDF(project: any, expenses: any[], orders: any[], deliveries: any[]) {
  const pdf = initPDF({
    title: 'Project Summary',
    filename: `project-${project.code}-${new Date().toISOString().split('T')[0]}.pdf`
  })

  let yPos = addHeader(pdf, `Project: ${project.name}`)
  yPos += 5

  // Project Details
  pdf.setFontSize(14)
  pdf.text('Project Details', 14, yPos)
  yPos += 7

  const projectData = [
    ['Field', 'Value'],
    ['Project Code', project.code],
    ['Status', project.status],
    ['Budget', formatCurrency(project.budget || 0)],
    ['Spent', formatCurrency(project.actual_cost || 0)],
    ['Remaining', formatCurrency((project.budget || 0) - (project.actual_cost || 0))],
    ['Utilization', `${project.budget > 0 ? ((project.actual_cost / project.budget) * 100).toFixed(1) : 0}%`],
    ['Start Date', new Date(project.start_date).toLocaleDateString()],
    ['Target Date', project.target_completion ? new Date(project.target_completion).toLocaleDateString() : 'N/A']
  ]

  autoTable(pdf, {
    startY: yPos,
    head: [projectData[0]],
    body: projectData.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: 14, right: 14 }
  })

  yPos = pdf.lastAutoTable.finalY + 10

  // Orders
  if (orders.length > 0) {
    pdf.addPage()
    yPos = 20
    pdf.setFontSize(14)
    pdf.text('Orders', 14, yPos)
    yPos += 7

    const orderData = orders.map((o: any) => [
      new Date(o.created_at).toLocaleDateString(),
      o.vendor || 'N/A',
      o.description?.substring(0, 40) || '',
      formatCurrency(o.amount || 0),
      o.status
    ])

    autoTable(pdf, {
      startY: yPos,
      head: [['Date', 'Vendor', 'Description', 'Amount', 'Status']],
      body: orderData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 }
    })

    yPos = pdf.lastAutoTable.finalY + 10
  }

  // Expenses
  if (expenses.length > 0) {
    pdf.addPage()
    yPos = 20
    pdf.setFontSize(14)
    pdf.text('Expenses', 14, yPos)
    yPos += 7

    const expenseData = expenses.map((e: any) => [
      new Date(e.spent_at || e.created_at).toLocaleDateString(),
      e.vendor || 'N/A',
      e.category || 'N/A',
      formatCurrency(e.amount || 0),
      e.status
    ])

    autoTable(pdf, {
      startY: yPos,
      head: [['Date', 'Vendor', 'Category', 'Amount', 'Status']],
      body: expenseData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 }
    })
  }

  addFooter(pdf)
  pdf.save(`project-${project.code}-${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Export Orders List to PDF
 */
export async function exportOrdersPDF(orders: any[]) {
  const pdf = initPDF({
    title: 'Orders Report',
    filename: `orders-${new Date().toISOString().split('T')[0]}.pdf`,
    orientation: 'landscape'
  })

  let yPos = addHeader(pdf, 'Orders Report')
  yPos += 5

  const orderData = orders.map((o: any) => [
    o.id.substring(0, 8),
    new Date(o.created_at).toLocaleDateString(),
    o.vendor || 'N/A',
    o.product_name || o.description?.substring(0, 30) || 'N/A',
    formatCurrency(o.amount || 0),
    o.status,
    o.delivery_progress || 'N/A'
  ])

  autoTable(pdf, {
    startY: yPos,
    head: [['Order ID', 'Date', 'Vendor', 'Product', 'Amount', 'Status', 'Delivery']],
    body: orderData,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8 }
  })

  addFooter(pdf)
  pdf.save(`orders-${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Export Expenses List to PDF
 */
export async function exportExpensesPDF(expenses: any[]) {
  const pdf = initPDF({
    title: 'Expenses Report',
    filename: `expenses-${new Date().toISOString().split('T')[0]}.pdf`,
    orientation: 'landscape'
  })

  let yPos = addHeader(pdf, 'Expenses Report')
  yPos += 5

  const expenseData = expenses.map((e: any) => [
    e.id.substring(0, 8),
    new Date(e.spent_at || e.created_at).toLocaleDateString(),
    e.vendor || 'N/A',
    e.category || 'N/A',
    e.description?.substring(0, 40) || 'N/A',
    formatCurrency(e.amount || 0),
    e.status
  ])

  autoTable(pdf, {
    startY: yPos,
    head: [['ID', 'Date', 'Vendor', 'Category', 'Description', 'Amount', 'Status']],
    body: expenseData,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8 }
  })

  addFooter(pdf)
  pdf.save(`expenses-${new Date().toISOString().split('T')[0]}.pdf`)
}
