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
  
  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;
  
  // Colors
  const primaryColor: [number, number, number] = [37, 99, 235]; // Blue
  const textColor: [number, number, number] = [31, 41, 55]; // Gray-800
  const lightGray: [number, number, number] = [243, 244, 246]; // Gray-100
  
  // ============================================================================
  // HEADER
  // ============================================================================
  
  // Company Logo (if provided)
  if (data.companyLogo) {
    try {
      doc.addImage(data.companyLogo, 'PNG', margin, yPos, 40, 15);
    } catch (error) {
      console.error('Error adding logo:', error);
    }
  }
  
  // Company Name
  doc.setFontSize(24);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(data.companyName, pageWidth - margin, yPos, { align: 'right' });
  
  yPos += 8;
  
  // Company Details (Right side)
  doc.setFontSize(9);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  
  const companyDetails: string[] = [];
  if (data.companyAddress) companyDetails.push(data.companyAddress);
  if (data.companyCity || data.companyState || data.companyZip) {
    companyDetails.push(`${data.companyCity || ''}, ${data.companyState || ''} ${data.companyZip || ''}`.trim());
  }
  if (data.companyPhone) companyDetails.push(`Phone: ${data.companyPhone}`);
  if (data.companyEmail) companyDetails.push(`Email: ${data.companyEmail}`);
  if (data.companyWebsite) companyDetails.push(data.companyWebsite);
  
  companyDetails.forEach(detail => {
    doc.text(detail, pageWidth - margin, yPos, { align: 'right' });
    yPos += 4;
  });
  
  yPos += 10;
  
  // ============================================================================
  // INVOICE TITLE & STATUS
  // ============================================================================
  
  doc.setFontSize(28);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', margin, yPos);
  
  // Status Badge
  const statusColors: Record<string, [number, number, number]> = {
    paid: [34, 197, 94], // Green
    partial: [234, 179, 8], // Yellow
    unpaid: [239, 68, 68] // Red
  };
  
  const statusColor = statusColors[data.status] || statusColors.unpaid;
  doc.setFillColor(...statusColor);
  doc.roundedRect(pageWidth - margin - 35, yPos - 6, 35, 8, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(data.status.toUpperCase(), pageWidth - margin - 17.5, yPos, { align: 'center' });
  
  yPos += 15;
  
  // ============================================================================
  // INVOICE DETAILS (Gray Box)
  // ============================================================================
  
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 25, 2, 2, 'F');
  
  yPos += 7;
  
  doc.setFontSize(9);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  
  // Left column
  doc.text('Invoice Number:', margin + 5, yPos);
  doc.text('Invoice Date:', margin + 5, yPos + 6);
  if (data.dueDate) doc.text('Due Date:', margin + 5, yPos + 12);
  
  doc.setFont('helvetica', 'normal');
  doc.text(data.invoiceNumber, margin + 35, yPos);
  doc.text(data.invoiceDate, margin + 35, yPos + 6);
  if (data.dueDate) doc.text(data.dueDate, margin + 35, yPos + 12);
  
  // Right column
  doc.setFont('helvetica', 'bold');
  doc.text('Payment ID:', pageWidth / 2 + 10, yPos);
  doc.text('Payment Date:', pageWidth / 2 + 10, yPos + 6);
  doc.text('Payment Method:', pageWidth / 2 + 10, yPos + 12);
  
  doc.setFont('helvetica', 'normal');
  doc.text(data.paymentId.substring(0, 13) + '...', pageWidth / 2 + 40, yPos);
  doc.text(data.paymentDate, pageWidth / 2 + 40, yPos + 6);
  doc.text(data.paymentMethod, pageWidth / 2 + 40, yPos + 12);
  
  yPos += 25;
  
  // ============================================================================
  // BILL TO
  // ============================================================================
  
  yPos += 5;
  
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', margin, yPos);
  
  yPos += 6;
  
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.text(data.clientName, margin, yPos);
  
  yPos += 5;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  if (data.clientAddress) {
    doc.text(data.clientAddress, margin, yPos);
    yPos += 4;
  }
  
  if (data.clientCity || data.clientState || data.clientZip) {
    doc.text(`${data.clientCity || ''}, ${data.clientState || ''} ${data.clientZip || ''}`.trim(), margin, yPos);
    yPos += 4;
  }
  
  if (data.clientPhone) {
    doc.text(`Phone: ${data.clientPhone}`, margin, yPos);
    yPos += 4;
  }
  
  if (data.clientEmail) {
    doc.text(`Email: ${data.clientEmail}`, margin, yPos);
    yPos += 4;
  }
  
  yPos += 10;
  
  // ============================================================================
  // LINE ITEMS TABLE
  // ============================================================================
  
  const tableData = data.items.map(item => [
    item.description,
    item.quantity?.toString() || '-',
    item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '-',
    `$${item.amount.toFixed(2)}`
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Qty', 'Unit Price', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9,
      textColor: textColor
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });
  
  // Get position after table
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // ============================================================================
  // TOTALS (Right-aligned box)
  // ============================================================================
  
  const totalsX = pageWidth - margin - 60;
  const totalsWidth = 60;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  let totalsY = yPos;
  
  // Subtotal
  doc.text('Subtotal:', totalsX, totalsY);
  doc.text(`$${data.subtotal.toFixed(2)}`, totalsX + totalsWidth, totalsY, { align: 'right' });
  totalsY += 5;
  
  // Tax
  if (data.taxAmount && data.taxAmount > 0) {
    doc.text(`Tax (${data.taxRate || 0}%):`, totalsX, totalsY);
    doc.text(`$${data.taxAmount.toFixed(2)}`, totalsX + totalsWidth, totalsY, { align: 'right' });
    totalsY += 5;
  }
  
  // Discount
  if (data.discount && data.discount > 0) {
    doc.text('Discount:', totalsX, totalsY);
    doc.text(`-$${data.discount.toFixed(2)}`, totalsX + totalsWidth, totalsY, { align: 'right' });
    totalsY += 5;
  }
  
  // Total line
  doc.setLineWidth(0.5);
  doc.line(totalsX, totalsY, totalsX + totalsWidth, totalsY);
  totalsY += 5;
  
  // Total (Bold)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total:', totalsX, totalsY);
  doc.text(`$${data.total.toFixed(2)}`, totalsX + totalsWidth, totalsY, { align: 'right' });
  totalsY += 6;
  
  // Amount Paid
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Amount Paid:', totalsX, totalsY);
  doc.text(`$${data.amountPaid.toFixed(2)}`, totalsX + totalsWidth, totalsY, { align: 'right' });
  totalsY += 5;
  
  // Balance line
  doc.setLineWidth(0.5);
  doc.line(totalsX, totalsY, totalsX + totalsWidth, totalsY);
  totalsY += 5;
  
  // Balance Due (Bold, Primary Color)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('Balance Due:', totalsX, totalsY);
  doc.text(`$${data.balance.toFixed(2)}`, totalsX + totalsWidth, totalsY, { align: 'right' });
  
  yPos = totalsY + 15;
  
  // ============================================================================
  // NOTES & TERMS
  // ============================================================================
  
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  if (data.notes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(data.notes, pageWidth - 2 * margin);
    doc.text(splitNotes, margin, yPos);
    yPos += splitNotes.length * 4 + 5;
  }
  
  if (data.terms) {
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const splitTerms = doc.splitTextToSize(data.terms, pageWidth - 2 * margin);
    doc.text(splitTerms, margin, yPos);
    yPos += splitTerms.length * 4;
  }
  
  // ============================================================================
  // FOOTER
  // ============================================================================
  
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175); // Gray-400
  doc.text(
    `Invoice generated on ${new Date().toLocaleDateString()}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  
  if (data.referenceNumber) {
    doc.text(
      `Reference: ${data.referenceNumber}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }
  
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
