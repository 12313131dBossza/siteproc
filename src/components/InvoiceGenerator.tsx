'use client';

import { useState } from 'react';
import { FileText, Download, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { downloadInvoice, previewInvoice, type InvoiceData } from '@/lib/pdf-invoice';
import { toast } from 'sonner';

interface Payment {
  id: string;
  vendor_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  status: 'unpaid' | 'partial' | 'paid';
  project_id?: string;
  order_id?: string;
  projects?: { name: string };
  purchase_orders?: { id: string; vendor: string };
}

interface InvoiceGeneratorProps {
  payment: Payment;
  companyName?: string;
  companyDetails?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo?: string;
  };
}

export function InvoiceGenerator({ payment, companyName = 'SiteProc', companyDetails }: InvoiceGeneratorProps) {
  const [generating, setGenerating] = useState(false);

  const generateInvoiceData = (): InvoiceData => {
    // Generate invoice number from payment ID
    const invoiceNumber = `INV-${payment.id.substring(0, 8).toUpperCase()}`;
    
    // Format dates
    const invoiceDate = new Date(payment.payment_date).toLocaleDateString('en-US');
    const dueDate = payment.status === 'unpaid' 
      ? new Date(new Date(payment.payment_date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US')
      : invoiceDate;

    // Determine client name
    const clientName = payment.vendor_name || 
      payment.projects?.name || 
      payment.purchase_orders?.vendor || 
      'Client';

    // Create line items
    const items = [
      {
        description: payment.notes || `Payment for ${payment.projects?.name || 'Services'}`,
        quantity: 1,
        unitPrice: payment.amount,
        amount: payment.amount
      }
    ];

    // Calculate totals
    const subtotal = payment.amount;
    const total = payment.amount;
    const amountPaid = payment.status === 'paid' ? payment.amount : 
                       payment.status === 'partial' ? payment.amount * 0.5 : 0;
    const balance = total - amountPaid;

    return {
      invoiceNumber,
      invoiceDate,
      dueDate,
      
      // Company details
      companyName,
      companyAddress: companyDetails?.address,
      companyCity: companyDetails?.city,
      companyState: companyDetails?.state,
      companyZip: companyDetails?.zip,
      companyPhone: companyDetails?.phone,
      companyEmail: companyDetails?.email,
      companyWebsite: companyDetails?.website,
      companyLogo: companyDetails?.logo,
      
      // Client details
      clientName,
      
      // Payment details
      paymentId: payment.id,
      paymentDate: invoiceDate,
      paymentMethod: payment.payment_method.toUpperCase(),
      referenceNumber: payment.reference_number,
      
      // Line items
      items,
      
      // Financial
      subtotal,
      total,
      amountPaid,
      balance,
      
      // Status
      status: payment.status,
      
      // Notes
      notes: payment.notes,
      terms: 'Payment is due within 30 days. Late payments may incur additional fees. Thank you for your business!'
    };
  };

  const handleDownload = async () => {
    try {
      setGenerating(true);
      const invoiceData = generateInvoiceData();
      downloadInvoice(invoiceData, `Invoice-${payment.id.substring(0, 8)}.pdf`);
      toast.success('Invoice downloaded successfully!');
      
      // Log to activity log
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment',
          action: 'processed',
          title: `Invoice Generated for Payment`,
          description: `Generated PDF invoice for payment to ${payment.vendor_name}`,
          entity_type: 'payment',
          entity_id: payment.id,
          metadata: {
            payment_id: payment.id,
            amount: payment.amount,
            vendor: payment.vendor_name
          },
          status: 'success',
          amount: payment.amount
        })
      });
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  const handlePreview = async () => {
    try {
      setGenerating(true);
      const invoiceData = generateInvoiceData();
      previewInvoice(invoiceData);
    } catch (error) {
      console.error('Error previewing invoice:', error);
      toast.error('Failed to preview invoice');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={handlePreview}
        disabled={generating}
        title="Preview Invoice"
      >
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </Button>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={handleDownload}
        disabled={generating}
        title="Download Invoice PDF"
      >
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Download className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Invoice</span>
          </>
        )}
      </Button>
    </div>
  );
}
