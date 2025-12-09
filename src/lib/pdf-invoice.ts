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
  // COMPANY LOGO (if provided) - Top left corner
  // ============================================================================
  // Note: Logo will be added asynchronously if URL provided
  // For now, we'll add space for it and show company name prominently
  
  // Company name at top left (always show as header)
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(data.companyName, margin, yPos);
  
  yPos += 8;
  
  // ============================================================================
  // TOP LINE - Darker for visibility
  // ============================================================================
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  
  yPos += 15;
  
  // ============================================================================
  // INVOICE TITLE (Centered, bold black)
  // ============================================================================
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 20;
  
  // ============================================================================
  // LEFT COLUMN: ISSUED TO
  // ============================================================================
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.setFont('helvetica', 'bold');
  doc.text('ISSUED TO', margin, yPos);
  
  yPos += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(data.clientName, margin, yPos);
  yPos += 5;
  
  if (data.clientAddress) {
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
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
  // RIGHT COLUMN: Invoice Details (with better contrast)
  // ============================================================================
  const rightX = pageWidth - margin;
  
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.setFont('helvetica', 'bold');
  
  // Invoice Number
  doc.text('INVOICE NO:', rightX - 40, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(data.invoiceNumber, rightX, yPos, { align: 'right' });
  yPos += 5;
  
  // Pay To
  doc.setTextColor(70, 70, 70);
  doc.setFont('helvetica', 'bold');
  doc.text('PAY TO:', rightX - 40, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(data.companyName, rightX, yPos, { align: 'right' });
  yPos += 5;
  
  // Due Date
  doc.setTextColor(70, 70, 70);
  doc.setFont('helvetica', 'bold');
  doc.text('DUE DATE:', rightX - 40, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(data.dueDate || data.invoiceDate, rightX, yPos, { align: 'right' });
  yPos += 5;
  
  // Account Name
  doc.setTextColor(70, 70, 70);
  doc.setFont('helvetica', 'bold');
  doc.text('Account Name:', rightX - 40, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientName, rightX, yPos, { align: 'right' });
  yPos += 5;
  
  // Account Number
  doc.setTextColor(70, 70, 70);
  doc.setFont('helvetica', 'bold');
  doc.text('Account No:', rightX - 40, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(data.paymentId.substring(0, 13), rightX, yPos, { align: 'right' });
  
  yPos += 20;
  
  // ============================================================================
  // DESCRIPTION HEADER - Bold and darker
  // ============================================================================
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPTION', margin, yPos);
  
  yPos += 10;
  
  // ============================================================================
  // LINE ITEMS TABLE - Better borders and contrast
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
      fontSize: 10,
      cellPadding: 3,
      textColor: [0, 0, 0],
      lineColor: [150, 150, 150],
      lineWidth: 0.3,
    },
    headStyles: {
      fontSize: 9,
      textColor: [70, 70, 70],
      fontStyle: 'bold',
      fillColor: [255, 255, 255],
    },
    bodyStyles: {
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 30, halign: 'right' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
    didDrawPage: function(hookData) {
      yPos = hookData.cursor?.y || yPos;
    },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // ============================================================================
  // TOTALS SECTION (Right-aligned, better contrast)
  // ============================================================================
  const totalsX = pageWidth - margin - 40;
  const labelX = totalsX - 35;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Subtotal
  doc.setTextColor(70, 70, 70);
  doc.text('SUBTOTAL:', labelX, yPos, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  doc.text(`$${data.subtotal.toFixed(0)}`, totalsX + 40, yPos, { align: 'right' });
  yPos += 7;
  
  // Tax (if any)
  if (data.taxAmount && data.taxAmount > 0) {
    doc.setTextColor(70, 70, 70);
    doc.text(`TAX (${data.taxRate}%):`, labelX, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.text(`$${data.taxAmount.toFixed(0)}`, totalsX + 40, yPos, { align: 'right' });
    yPos += 7;
  }
  
  // Discount (if any)
  if (data.discount && data.discount > 0) {
    doc.setTextColor(70, 70, 70);
    doc.text('DISCOUNT:', labelX, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.text(`-$${data.discount.toFixed(0)}`, totalsX + 40, yPos, { align: 'right' });
    yPos += 7;
  }
  
  yPos += 3;
  
  // Total separator line - Darker
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.5);
  doc.line(labelX - 5, yPos, pageWidth - margin, yPos);
  yPos += 8;
  
  // TOTAL - Bold black
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL:', labelX, yPos, { align: 'right' });
  doc.text(`$${data.total.toFixed(0)}`, totalsX + 40, yPos, { align: 'right' });
  
  return doc;
}

/**
 * Load image from URL and convert to base64
 */
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    console.warn('Failed to load logo image:', url);
    return null;
  }
}

/**
 * Generate invoice with logo (async version)
 */
export async function generateInvoicePDFWithLogo(data: InvoiceData): Promise<jsPDF> {
  const doc = generateInvoicePDF(data);
  
  // If logo URL provided, try to add it
  if (data.companyLogo) {
    const base64Logo = await loadImageAsBase64(data.companyLogo);
    if (base64Logo) {
      try {
        // Add logo in top-left corner (before company name)
        // Logo positioned at x=20, y=8, with max width=35, auto height
        doc.addImage(base64Logo, 'AUTO', 20, 5, 35, 12);
      } catch (e) {
        console.warn('Failed to add logo to PDF:', e);
      }
    }
  }
  
  return doc;
}

/**
 * Download invoice as PDF
 */
export async function downloadInvoice(data: InvoiceData, filename?: string) {
  let doc: jsPDF;
  
  // If logo provided, use async version
  if (data.companyLogo) {
    doc = await generateInvoicePDFWithLogo(data);
  } else {
    doc = generateInvoicePDF(data);
  }
  
  const fileName = filename || `Invoice-${data.invoiceNumber}.pdf`;
  doc.save(fileName);
}

/**
 * Get invoice as blob (for API upload)
 */
export async function getInvoiceBlob(data: InvoiceData): Promise<Blob> {
  let doc: jsPDF;
  
  if (data.companyLogo) {
    doc = await generateInvoicePDFWithLogo(data);
  } else {
    doc = generateInvoicePDF(data);
  }
  
  return doc.output('blob');
}

/**
 * Preview invoice in new window
 */
export async function previewInvoice(data: InvoiceData) {
  let doc: jsPDF;
  
  if (data.companyLogo) {
    doc = await generateInvoicePDFWithLogo(data);
  } else {
    doc = generateInvoicePDF(data);
  }
  
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
