/**
 * PDF Invoice Generator
 * Generates professional PDF invoices for payments
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoiceData {
  // Invoice Details
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  
  // Company Details (From)
  companyName: string;
  companyAddress?: string;
  companyCity?: string;
  companyState?: string;
  companyZip?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyLogo?: string; // URL or base64
  
  // Client Details (To)
  clientName: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;
  clientZip?: string;
  clientPhone?: string;
  clientEmail?: string;
  
  // Payment Details
  paymentId: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  
  // Line Items
  items: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }>;
  
  // Financial
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
  total: number;
  amountPaid: number;
  balance: number;
  
  // Additional
  notes?: string;
  terms?: string;
  status: 'paid' | 'partial' | 'unpaid';
}

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;
  
  // ============================================================================
  // TOP LINE
  // ============================================================================
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  
  yPos += 15;
  
  // ============================================================================
  // INVOICE TITLE (Centered, minimal)
  // ============================================================================
  doc.setFontSize(14);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.text('INVOICE', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 20;
  
  // ============================================================================
  // LEFT COLUMN: ISSUED TO
  // ============================================================================
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'bold');
  doc.text('ISSUED TO', margin, yPos);
  
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(data.clientName, margin, yPos);
  yPos += 5;
  
  if (data.clientAddress) {
    doc.text(data.clientAddress, margin, yPos);
    yPos += 5;
  }
  
  if (data.clientCity || data.clientState || data.clientZip) {
    const cityLine = [data.clientCity, data.clientState, data.clientZip].filter(Boolean).join(', ');
    doc.text(cityLine, margin, yPos);
  }
  
  // Reset yPos for right column
  yPos = 55;
  
  // ============================================================================
  // RIGHT COLUMN: Invoice Details
  // ============================================================================
  const rightX = pageWidth - margin;
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  
  // Invoice Number
  doc.text('INVOICE NO:', rightX - 40, yPos);
  doc.setTextColor(60, 60, 60);
  doc.text(data.invoiceNumber, rightX, yPos, { align: 'right' });
  yPos += 5;
  
  // Pay To
  doc.setTextColor(100, 100, 100);
  doc.text('PAY TO:', rightX - 40, yPos);
  doc.setTextColor(60, 60, 60);
  doc.text(data.companyName, rightX, yPos, { align: 'right' });
  yPos += 5;
  
  // Due Date
  doc.setTextColor(100, 100, 100);
  doc.text('DUE DATE:', rightX - 40, yPos);
  doc.setTextColor(60, 60, 60);
  doc.text(data.dueDate || data.invoiceDate, rightX, yPos, { align: 'right' });
  yPos += 5;
  
  // Account Name
  doc.setTextColor(100, 100, 100);
  doc.text('Account Name:', rightX - 40, yPos);
  doc.setTextColor(60, 60, 60);
  doc.text(data.clientName, rightX, yPos, { align: 'right' });
  yPos += 5;
  
  // Account Number
  doc.setTextColor(100, 100, 100);
  doc.text('Account No:', rightX - 40, yPos);
  doc.setTextColor(60, 60, 60);
  doc.text(data.paymentId.substring(0, 13), rightX, yPos, { align: 'right' });
  
  yPos += 15;
  
  // ============================================================================
  // DESCRIPTION HEADER
  // ============================================================================
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPTION', margin, yPos);
  
  yPos += 10;
  
  // ============================================================================
  // LINE ITEMS TABLE
  // ============================================================================
  const tableData = data.items.map(item => [
    item.description,
    item.unitPrice ? `$${item.unitPrice.toFixed(0)}` : '',
    item.quantity ? item.quantity.toString() : '1',
    `$${item.amount.toFixed(0)}`,
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['', 'UNIT PRICE', 'QTY', 'TOTAL']],
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 2,
      textColor: [60, 60, 60],
      lineColor: [230, 230, 230],
      lineWidth: 0.1,
    },
    headStyles: {
      fontSize: 8,
      textColor: [100, 100, 100],
      fontStyle: 'bold',
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 30, halign: 'right' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: margin, right: margin },
    didDrawPage: function(hookData) {
      yPos = hookData.cursor?.y || yPos;
    },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // ============================================================================
  // TOTALS SECTION (Right-aligned)
  // ============================================================================
  const totalsX = pageWidth - margin - 40;
  const labelX = totalsX - 35;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  // Subtotal
  doc.setTextColor(100, 100, 100);
  doc.text('SUBTOTAL:', labelX, yPos, { align: 'right' });
  doc.setTextColor(60, 60, 60);
  doc.text(`$${data.subtotal.toFixed(0)}`, totalsX + 40, yPos, { align: 'right' });
  yPos += 6;
  
  // Tax (if any)
  if (data.taxAmount && data.taxAmount > 0) {
    doc.setTextColor(100, 100, 100);
    doc.text(`TAX (${data.taxRate}%):`, labelX, yPos, { align: 'right' });
    doc.setTextColor(60, 60, 60);
    doc.text(`$${data.taxAmount.toFixed(0)}`, totalsX + 40, yPos, { align: 'right' });
    yPos += 6;
  }
  
  // Discount (if any)
  if (data.discount && data.discount > 0) {
    doc.setTextColor(100, 100, 100);
    doc.text('DISCOUNT:', labelX, yPos, { align: 'right' });
    doc.setTextColor(60, 60, 60);
    doc.text(`-$${data.discount.toFixed(0)}`, totalsX + 40, yPos, { align: 'right' });
    yPos += 6;
  }
  
  yPos += 2;
  
  // Total separator line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(labelX - 5, yPos, pageWidth - margin, yPos);
  yPos += 7;
  
  // TOTAL
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('TOTAL:', labelX, yPos, { align: 'right' });
  doc.text(`$${data.total.toFixed(0)}`, totalsX + 40, yPos, { align: 'right' });
  
  return doc;
}

/**
 * Download invoice as PDF
 */
export function downloadInvoice(data: InvoiceData, filename?: string) {
  const doc = generateInvoicePDF(data);
  const fileName = filename || `Invoice-${data.invoiceNumber}.pdf`;
  doc.save(fileName);
}

/**
 * Get invoice as blob (for API upload)
 */
export function getInvoiceBlob(data: InvoiceData): Blob {
  const doc = generateInvoicePDF(data);
  return doc.output('blob');
}

/**
 * Preview invoice in new window
 */
export function previewInvoice(data: InvoiceData) {
  const doc = generateInvoicePDF(data);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
