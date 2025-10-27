import Papa from 'papaparse';

interface ProjectReportData {
  summary: {
    total_budget: number;
    total_actual: number;
    total_variance: number;
    total_projects: number;
    on_budget_count: number;
  };
  data: Array<{
    name: string;
    status: string;
    budget: number;
    actual: number;
    variance: number;
    variance_percentage: number;
    budget_status: string;
    expense_count: number;
    created_at: string;
  }>;
}

interface PaymentReportData {
  summary: {
    total_paid_amount: number;
    total_unpaid_amount: number;
    total_overdue_amount: number;
    total_payments: number;
    paid_count: number;
    unpaid_count: number;
    overdue_count: number;
  };
  data: Array<{
    vendor: string;
    category: string;
    amount: number;
    status: string;
    description: string;
    age_days: number;
    is_overdue: boolean;
    created_at: string;
    approved_at: string | null;
  }>;
}

interface DeliveryReportData {
  summary: {
    total_deliveries: number;
    total_value: number;
    delivered_count: number;
    delivered_value: number;
    pending_count: number;
    pending_value: number;
    on_time_percentage: number;
    on_time_count: number;
  };
  data: Array<{
    id: string;
    order_id: string;
    driver_name: string;
    vehicle_number: string;
    status: string;
    amount: number;
    age_days: number;
    is_delayed: boolean;
    delivery_date: string;
    created_at: string;
    notes: string | null;
  }>;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
};

const downloadCSV = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

export const exportProjectReportCSV = (reportData: ProjectReportData): void => {
  const { summary, data } = reportData;
  
  // Create summary section
  const summaryData = [
    ['PROJECT FINANCIAL REPORT - SUMMARY'],
    ['Generated', new Date().toLocaleDateString('en-US')],
    [''],
    ['Metric', 'Value'],
    ['Total Budget', formatCurrency(summary.total_budget)],
    ['Total Actual Spend', formatCurrency(summary.total_actual)],
    ['Total Variance', formatCurrency(summary.total_variance)],
    ['Total Projects', summary.total_projects.toString()],
    ['On Budget Projects', summary.on_budget_count.toString()],
    ['Over Budget Projects', (summary.total_projects - summary.on_budget_count).toString()],
    [''],
    ['PROJECT DETAILS'],
    [''],
  ];
  
  // Create project details data
  const projectsData = data.map(project => ({
    'Project Name': project.name,
    'Status': project.status,
    'Budget': project.budget,
    'Actual Spend': project.actual,
    'Variance': project.variance,
    'Variance %': project.variance_percentage.toFixed(2) + '%',
    'Budget Status': project.budget_status,
    'Expense Count': project.expense_count,
    'Created Date': formatDate(project.created_at),
  }));
  
  // Convert to CSV using Papa Parse
  const summaryCSV = Papa.unparse(summaryData, { header: false });
  const detailsCSV = Papa.unparse(projectsData, { header: true });
  
  // Combine both sections
  const fullCSV = summaryCSV + '\n' + detailsCSV;
  
  // Download
  const filename = `project-financial-report-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(fullCSV, filename);
};

export const exportPaymentReportCSV = (reportData: PaymentReportData): void => {
  const { summary, data } = reportData;
  
  // Create summary section
  const summaryData = [
    ['PAYMENT SUMMARY REPORT'],
    ['Generated', new Date().toLocaleDateString('en-US')],
    [''],
    ['Metric', 'Value'],
    ['Total Paid Amount', formatCurrency(summary.total_paid_amount)],
    ['Total Unpaid Amount', formatCurrency(summary.total_unpaid_amount)],
    ['Total Overdue Amount', formatCurrency(summary.total_overdue_amount)],
    ['Total Payments', summary.total_payments.toString()],
    ['Paid Count', summary.paid_count.toString()],
    ['Unpaid Count', summary.unpaid_count.toString()],
    ['Overdue Count', summary.overdue_count.toString()],
    [''],
    ['PAYMENT DETAILS'],
    [''],
  ];
  
  // Create payment details data
  const paymentsData = data.map(payment => ({
    'Vendor': payment.vendor,
    'Category': payment.category,
    'Amount': payment.amount,
    'Status': payment.status,
    'Description': payment.description || '',
    'Age (Days)': payment.age_days,
    'Overdue': payment.is_overdue ? 'Yes' : 'No',
    'Created Date': formatDate(payment.created_at),
    'Approved Date': payment.approved_at ? formatDate(payment.approved_at) : 'Not Approved',
  }));
  
  // Convert to CSV using Papa Parse
  const summaryCSV = Papa.unparse(summaryData, { header: false });
  const detailsCSV = Papa.unparse(paymentsData, { header: true });
  
  // Combine both sections
  const fullCSV = summaryCSV + '\n' + detailsCSV;
  
  // Download
  const filename = `payment-summary-report-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(fullCSV, filename);
};

export const exportDeliveryReportCSV = (reportData: DeliveryReportData): void => {
  const { summary, data } = reportData;
  
  // Create summary section
  const summaryData = [
    ['DELIVERY SUMMARY REPORT'],
    ['Generated', new Date().toLocaleDateString('en-US')],
    [''],
    ['Metric', 'Value'],
    ['Total Deliveries', summary.total_deliveries.toString()],
    ['Total Value', formatCurrency(summary.total_value)],
    ['Delivered Count', summary.delivered_count.toString()],
    ['Delivered Value', formatCurrency(summary.delivered_value)],
    ['Pending Count', summary.pending_count.toString()],
    ['Pending Value', formatCurrency(summary.pending_value)],
    ['On-Time Percentage', summary.on_time_percentage.toFixed(1) + '%'],
    ['On-Time Count', summary.on_time_count.toString()],
    [''],
    ['DELIVERY DETAILS'],
    [''],
  ];
  
  // Create delivery details data
  const deliveriesData = data.map(delivery => ({
    'Delivery ID': delivery.id,
    'Order ID': delivery.order_id,
    'Driver Name': delivery.driver_name,
    'Vehicle Number': delivery.vehicle_number,
    'Status': delivery.status.replace('_', ' '),
    'Amount': delivery.amount,
    'Age (Days)': delivery.age_days,
    'Delayed': delivery.is_delayed ? 'Yes' : 'No',
    'Delivery Date': delivery.delivery_date ? formatDate(delivery.delivery_date) : 'Not Scheduled',
    'Created Date': formatDate(delivery.created_at),
    'Notes': delivery.notes || '',
  }));
  
  // Convert to CSV using Papa Parse
  const summaryCSV = Papa.unparse(summaryData, { header: false });
  const detailsCSV = Papa.unparse(deliveriesData, { header: true });
  
  // Combine both sections
  const fullCSV = summaryCSV + '\n' + detailsCSV;
  
  // Download
  const filename = `delivery-summary-report-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(fullCSV, filename);
};

// Export all three formats at once
export const exportAllFormats = (
  type: 'projects' | 'payments' | 'deliveries',
  reportData: ProjectReportData | PaymentReportData | DeliveryReportData
): void => {
  if (type === 'projects') {
    exportProjectReportCSV(reportData as ProjectReportData);
  } else if (type === 'payments') {
    exportPaymentReportCSV(reportData as PaymentReportData);
  } else if (type === 'deliveries') {
    exportDeliveryReportCSV(reportData as DeliveryReportData);
  }
};
