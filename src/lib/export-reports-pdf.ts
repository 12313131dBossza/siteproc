import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    month: 'short', 
    day: 'numeric' 
  });
};

const addHeader = (doc: jsPDF, title: string, subtitle: string) => {
  // Company name
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235); // Blue color
  doc.text('SiteProc', 14, 15);
  
  // Report title
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(title, 14, 25);
  
  // Subtitle
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128); // Gray color
  doc.text(subtitle, 14, 31);
  
  // Date generated
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`Generated: ${today}`, 14, 37);
  
  // Horizontal line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(14, 40, 196, 40);
  
  return 45; // Return Y position for next content
};

const addFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(
    `Page ${pageNumber} of ${totalPages}`,
    doc.internal.pageSize.width / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  doc.text(
    'SiteProc - Construction Management',
    14,
    pageHeight - 10
  );
};

export const exportProjectReportPDF = (reportData: ProjectReportData): void => {
  const doc = new jsPDF();
  const { summary, data } = reportData;
  
  // Add header
  let yPos = addHeader(
    doc,
    'Project Financial Report',
    'Comprehensive overview of project budgets and expenditures'
  );
  
  // Summary section
  yPos += 5;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Summary', 14, yPos);
  yPos += 7;
  
  // Summary boxes
  doc.setFontSize(9);
  doc.setFillColor(239, 246, 255); // Light blue
  doc.roundedRect(14, yPos, 45, 20, 2, 2, 'F');
  doc.text('Total Budget', 16, yPos + 5);
  doc.setFontSize(11);
  doc.setTextColor(37, 99, 235);
  doc.text(formatCurrency(summary.total_budget), 16, yPos + 12);
  
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(240, 253, 244); // Light green
  doc.roundedRect(62, yPos, 45, 20, 2, 2, 'F');
  doc.text('Total Actual', 64, yPos + 5);
  doc.setFontSize(11);
  doc.setTextColor(22, 163, 74);
  doc.text(formatCurrency(summary.total_actual), 64, yPos + 12);
  
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const varianceColor = summary.total_variance >= 0 ? [22, 163, 74] : [220, 38, 38];
  doc.setFillColor(summary.total_variance >= 0 ? 240 : 254, 253, summary.total_variance >= 0 ? 244 : 242);
  doc.roundedRect(110, yPos, 45, 20, 2, 2, 'F');
  doc.text('Total Variance', 112, yPos + 5);
  doc.setFontSize(11);
  doc.setTextColor(varianceColor[0], varianceColor[1], varianceColor[2]);
  doc.text(formatCurrency(summary.total_variance), 112, yPos + 12);
  
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(243, 244, 246); // Light gray
  doc.roundedRect(158, yPos, 38, 20, 2, 2, 'F');
  doc.text('On Budget', 160, yPos + 5);
  doc.setFontSize(11);
  doc.setTextColor(99, 102, 241);
  doc.text(`${summary.on_budget_count}/${summary.total_projects}`, 160, yPos + 12);
  
  yPos += 28;
  
  // Projects table
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Project Details', 14, yPos);
  yPos += 5;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Project', 'Status', 'Budget', 'Actual', 'Variance', 'Budget Status']],
    body: data.map((project) => [
      project.name,
      project.status,
      formatCurrency(project.budget),
      formatCurrency(project.actual),
      formatCurrency(project.variance),
      project.budget_status === 'on-budget' ? '✓ On Budget' : '⚠ Over Budget',
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
  });
  
  // Add footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }
  
  // Save PDF
  doc.save(`project-financial-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportPaymentReportPDF = (reportData: PaymentReportData): void => {
  const doc = new jsPDF();
  const { summary, data } = reportData;
  
  // Add header
  let yPos = addHeader(
    doc,
    'Payment Summary Report',
    'Overview of all payments, pending, and overdue items'
  );
  
  // Summary section
  yPos += 5;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Summary', 14, yPos);
  yPos += 7;
  
  // Summary boxes
  doc.setFontSize(9);
  doc.setFillColor(240, 253, 244); // Light green
  doc.roundedRect(14, yPos, 45, 20, 2, 2, 'F');
  doc.text('Total Paid', 16, yPos + 5);
  doc.setFontSize(11);
  doc.setTextColor(22, 163, 74);
  doc.text(formatCurrency(summary.total_paid_amount), 16, yPos + 12);
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(`${summary.paid_count} payments`, 16, yPos + 17);
  
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(254, 249, 195); // Light yellow
  doc.roundedRect(62, yPos, 45, 20, 2, 2, 'F');
  doc.text('Total Unpaid', 64, yPos + 5);
  doc.setFontSize(11);
  doc.setTextColor(234, 179, 8);
  doc.text(formatCurrency(summary.total_unpaid_amount), 64, yPos + 12);
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(`${summary.unpaid_count} pending`, 64, yPos + 17);
  
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(254, 242, 242); // Light red
  doc.roundedRect(110, yPos, 45, 20, 2, 2, 'F');
  doc.text('Overdue', 112, yPos + 5);
  doc.setFontSize(11);
  doc.setTextColor(220, 38, 38);
  doc.text(formatCurrency(summary.total_overdue_amount), 112, yPos + 12);
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(`${summary.overdue_count} overdue`, 112, yPos + 17);
  
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(239, 246, 255); // Light blue
  doc.roundedRect(158, yPos, 38, 20, 2, 2, 'F');
  doc.text('Total', 160, yPos + 5);
  doc.setFontSize(11);
  doc.setTextColor(37, 99, 235);
  doc.text(`${summary.total_payments}`, 160, yPos + 12);
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('payments', 160, yPos + 17);
  
  yPos += 28;
  
  // Payments table
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Payment Details', 14, yPos);
  yPos += 5;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Vendor', 'Category', 'Amount', 'Status', 'Age', 'Created']],
    body: data.map((payment) => [
      payment.vendor,
      payment.category,
      formatCurrency(payment.amount),
      payment.status.toUpperCase(),
      payment.is_overdue ? `${payment.age_days}d ⚠` : `${payment.age_days}d`,
      formatDate(payment.created_at),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      2: { halign: 'right' },
    },
  });
  
  // Add footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }
  
  // Save PDF
  doc.save(`payment-summary-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportDeliveryReportPDF = (reportData: DeliveryReportData): void => {
  const doc = new jsPDF();
  const { summary, data } = reportData;
  
  // Add header
  let yPos = addHeader(
    doc,
    'Delivery Summary Report',
    'Complete overview of delivery status and performance'
  );
  
  // Summary section
  yPos += 5;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Summary', 14, yPos);
  yPos += 7;
  
  // Summary boxes
  doc.setFontSize(9);
  doc.setFillColor(239, 246, 255); // Light blue
  doc.roundedRect(14, yPos, 45, 20, 2, 2, 'F');
  doc.text('Total Deliveries', 16, yPos + 5);
  doc.setFontSize(11);
  doc.setTextColor(37, 99, 235);
  doc.text(`${summary.total_deliveries}`, 16, yPos + 12);
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(formatCurrency(summary.total_value), 16, yPos + 17);
  
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(240, 253, 244); // Light green
  doc.roundedRect(62, yPos, 45, 20, 2, 2, 'F');
  doc.text('Delivered', 64, yPos + 5);
  doc.setFontSize(11);
  doc.setTextColor(22, 163, 74);
  doc.text(`${summary.delivered_count}`, 64, yPos + 12);
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(formatCurrency(summary.delivered_value), 64, yPos + 17);
  
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(254, 249, 195); // Light yellow
  doc.roundedRect(110, yPos, 45, 20, 2, 2, 'F');
  doc.text('Pending', 112, yPos + 5);
  doc.setFontSize(11);
  doc.setTextColor(234, 179, 8);
  doc.text(`${summary.pending_count}`, 112, yPos + 12);
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(formatCurrency(summary.pending_value), 112, yPos + 17);
  
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(238, 242, 255); // Light indigo
  doc.roundedRect(158, yPos, 38, 20, 2, 2, 'F');
  doc.text('On-Time Rate', 160, yPos + 5);
  doc.setFontSize(11);
  doc.setTextColor(99, 102, 241);
  doc.text(`${summary.on_time_percentage.toFixed(1)}%`, 160, yPos + 12);
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(`${summary.on_time_count} on-time`, 160, yPos + 17);
  
  yPos += 28;
  
  // Deliveries table
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Delivery Details', 14, yPos);
  yPos += 5;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Order ID', 'Driver', 'Vehicle', 'Status', 'Amount', 'Age', 'Delivery Date']],
    body: data.map((delivery) => [
      delivery.order_id,
      delivery.driver_name,
      delivery.vehicle_number,
      delivery.status.replace('_', ' ').toUpperCase(),
      formatCurrency(delivery.amount),
      delivery.is_delayed ? `${delivery.age_days}d ⚠` : `${delivery.age_days}d`,
      delivery.delivery_date ? formatDate(delivery.delivery_date) : 'Not scheduled',
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      4: { halign: 'right' },
    },
  });
  
  // Add footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }
  
  // Save PDF
  doc.save(`delivery-summary-report-${new Date().toISOString().split('T')[0]}.pdf`);
};
