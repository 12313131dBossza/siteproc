"use client";

import { useState, useEffect } from 'react';
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/Button";
import { FeatureGate, UpgradeBanner } from "@/components/FeatureGate";
import { usePlan } from "@/hooks/usePlan";
import {
  BarChart3,
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  User,
  Lock
} from 'lucide-react';
import { format } from '@/lib/date-format';
import { useCurrency } from '@/lib/CurrencyContext';
import { useWhiteLabel } from '@/lib/WhiteLabelContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  exportProjectReportPDF, 
  exportPaymentReportPDF, 
  exportDeliveryReportPDF 
} from '@/lib/export-reports-pdf';
import { 
  exportProjectReportCSV, 
  exportPaymentReportCSV, 
  exportDeliveryReportCSV 
} from '@/lib/export-reports-csv';

type ReportType = 'projects' | 'payments' | 'deliveries';

interface ProjectReport {
  id: string;
  name: string;
  status: string;
  budget: number;
  actual: number;
  variance: number;
  variance_percentage: number;
  expense_count: number;
  budget_status: 'on-budget' | 'over-budget';
  created_at: string;
}

interface PaymentReport {
  id: string;
  vendor: string;
  category: string;
  amount: number;
  status: string;
  description: string;
  created_at: string;
  approved_at: string | null;
  is_overdue: boolean;
  age_days: number;
}

interface DeliveryReport {
  id: string;
  order_id: string;
  delivery_date: string;
  status: string;
  driver_name: string;
  vehicle_number: string;
  amount: number;
  created_at: string;
  notes: string | null;
  age_days: number;
  is_delayed: boolean;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportType>('projects');
  const [loading, setLoading] = useState(false);
  const [projectsData, setProjectsData] = useState<any>(null);
  const [paymentsData, setPaymentsData] = useState<any>(null);
  const [deliveriesData, setDeliveriesData] = useState<any>(null);
  
  // Plan feature check
  const { hasFeature } = usePlan();
  const hasAdvancedReports = hasFeature('advancedReports');
  const hasCsvPdfExport = hasFeature('csvPdfExport');

  const fetchReport = async (type: ReportType) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/${type}`);
      if (!response.ok) throw new Error('Failed to fetch report');
      
      const result = await response.json();
      
      if (result.ok) {
        if (type === 'projects') setProjectsData(result);
        if (type === 'payments') setPaymentsData(result);
        if (type === 'deliveries') setDeliveriesData(result);
      }
    } catch (error) {
      console.error(`Error fetching ${type} report:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(activeTab);
  }, [activeTab]);

  const exportToCSV = (type: ReportType) => {
    if (!hasCsvPdfExport) {
      toast.error('CSV export with logo is a Pro feature. Upgrade to access this feature.');
      return;
    }
    if (type === 'projects' && projectsData) {
      exportProjectReportCSV(projectsData);
    } else if (type === 'payments' && paymentsData) {
      exportPaymentReportCSV(paymentsData);
    } else if (type === 'deliveries' && deliveriesData) {
      exportDeliveryReportCSV(deliveriesData);
    }
  };

  const exportToPDF = (type: ReportType) => {
    if (!hasCsvPdfExport) {
      toast.error('PDF export with logo is a Pro feature. Upgrade to access this feature.');
      return;
    }
    // Get company name for PDF (use white-label if enabled, otherwise 'SiteProc')
    const pdfCompanyName = whiteLabel.enabled && whiteLabel.companyName 
      ? whiteLabel.companyName 
      : 'SiteProc';
    
    const pdfOptions = {
      companyName: pdfCompanyName,
      formatCurrency: formatCurrency
    };
    
    if (type === 'projects' && projectsData) {
      exportProjectReportPDF(projectsData, pdfOptions);
    } else if (type === 'payments' && paymentsData) {
      exportPaymentReportPDF(paymentsData, pdfOptions);
    } else if (type === 'deliveries' && deliveriesData) {
      exportDeliveryReportPDF(deliveriesData, pdfOptions);
    }
  };

  const { formatAmount: formatCurrency } = useCurrency();
  const { config: whiteLabel } = useWhiteLabel();

  // If user doesn't have advanced reports feature, show upgrade prompt
  if (!hasAdvancedReports) {
    return (
      <AppLayout>
        <div className="space-y-4 md:space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-500 text-sm md:text-base mt-1">Financial and operational insights</p>
          </div>
          <FeatureGate feature="advancedReports">
            <div />
          </FeatureGate>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-500 text-sm md:text-base mt-1">Financial and operational insights</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => exportToPDF(activeTab)}
              disabled={loading || !hasCsvPdfExport}
              className={cn(
                "flex items-center gap-1.5 text-sm px-3 py-2",
                hasCsvPdfExport ? "bg-red-600 hover:bg-red-700" : "bg-gray-400 cursor-not-allowed"
              )}
              size="sm"
              title={!hasCsvPdfExport ? "PDF export is a Pro feature" : "Export to PDF"}
            >
              {hasCsvPdfExport ? <FileText className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              <span className="hidden sm:inline">Export</span> PDF
            </Button>
            <Button
              onClick={() => exportToCSV(activeTab)}
              disabled={loading || !hasCsvPdfExport}
              className="flex items-center gap-1.5 text-sm px-3 py-2"
              size="sm"
              title={!hasCsvPdfExport ? "CSV export is a Pro feature" : "Export to CSV"}
            >
              {hasCsvPdfExport ? <Download className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              <span className="hidden sm:inline">Export</span> CSV
            </Button>
          </div>
        </div>

        {/* Pro Feature Banner for exports */}
        {!hasCsvPdfExport && (
          <UpgradeBanner feature="csvPdfExport" />
        )}

        {/* Tabs - Scrollable on mobile */}
        <div className="border-b border-gray-200 -mx-4 px-4 md:mx-0 md:px-0">
          <nav className="-mb-px flex overflow-x-auto scrollbar-hide gap-4 md:gap-8">
            <button
              onClick={() => setActiveTab('projects')}
              className={cn(
                "whitespace-nowrap py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors flex-shrink-0",
                activeTab === 'projects'
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <div className="flex items-center gap-1.5 md:gap-2">
                <BarChart3 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Project</span> Financial
              </div>
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={cn(
                "whitespace-nowrap py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors flex-shrink-0",
                activeTab === 'payments'
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <div className="flex items-center gap-1.5 md:gap-2">
                <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Payment</span> Summary
              </div>
            </button>
            <button
              onClick={() => setActiveTab('deliveries')}
              className={cn(
                "whitespace-nowrap py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors flex-shrink-0",
                activeTab === 'deliveries'
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <div className="flex items-center gap-1.5 md:gap-2">
                <Package className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Delivery</span> Summary
              </div>
            </button>
          </nav>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8 md:py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-3 md:mt-4 text-sm">Loading report...</p>
            </div>
          </div>
        )}

        {/* Project Financial Report */}
        {!loading && activeTab === 'projects' && projectsData && (
          <ProjectFinancialReport data={projectsData} formatCurrency={formatCurrency} />
        )}

        {/* Payment Summary Report */}
        {!loading && activeTab === 'payments' && paymentsData && (
          <PaymentSummaryReport data={paymentsData} formatCurrency={formatCurrency} />
        )}

        {/* Delivery Summary Report */}
        {!loading && activeTab === 'deliveries' && deliveriesData && (
          <DeliverySummaryReport data={deliveriesData} formatCurrency={formatCurrency} />
        )}
      </div>
    </AppLayout>
  );
}

// Project Financial Report Component
function ProjectFinancialReport({ data, formatCurrency }: { data: any; formatCurrency: (n: number) => string }) {
  const summary = data.summary;
  const projects: ProjectReport[] = data.data;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-500">Total Budget</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900 mt-0.5 md:mt-1 truncate">
                {formatCurrency(summary.total_budget)}
              </p>
            </div>
            <div className="bg-blue-100 rounded-full p-2 md:p-3 flex-shrink-0 ml-2">
              <FileText className="h-4 w-4 md:h-6 md:w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-500">Total Actual</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900 mt-0.5 md:mt-1 truncate">
                {formatCurrency(summary.total_actual)}
              </p>
            </div>
            <div className="bg-green-100 rounded-full p-2 md:p-3 flex-shrink-0 ml-2">
              <DollarSign className="h-4 w-4 md:h-6 md:w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-500">Total Variance</p>
              <p className={cn(
                "text-lg md:text-2xl font-bold mt-0.5 md:mt-1 truncate",
                summary.total_variance >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(summary.total_variance)}
              </p>
            </div>
            <div className={cn(
              "rounded-full p-2 md:p-3 flex-shrink-0 ml-2",
              summary.total_variance >= 0 ? "bg-green-100" : "bg-red-100"
            )}>
              {summary.total_variance >= 0 ? (
                <TrendingUp className="h-4 w-4 md:h-6 md:w-6 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 md:h-6 md:w-6 text-red-600" />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-500">On Budget</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900 mt-0.5 md:mt-1">
                {summary.on_budget_count} / {summary.total_projects}
              </p>
            </div>
            <div className="bg-indigo-100 rounded-full p-2 md:p-3 flex-shrink-0 ml-2">
              <CheckCircle className="h-4 w-4 md:h-6 md:w-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Projects Table - Hidden on mobile, shown as cards */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">Project Details</h3>
        </div>
        
        {/* Mobile: Card layout */}
        <div className="md:hidden divide-y divide-gray-200">
          {projects.map((project) => (
            <div key={project.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900 text-sm">{project.name}</div>
                <span className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded-full",
                  project.budget_status === 'on-budget' 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                )}>
                  {project.budget_status === 'on-budget' ? 'On Budget' : 'Over Budget'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Budget</p>
                  <p className="font-medium">{formatCurrency(project.budget)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Actual</p>
                  <p className="font-medium">{formatCurrency(project.actual)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Variance</p>
                  <p className={cn("font-medium", project.variance >= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(project.variance)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Desktop: Table layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Budget Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{project.name}</div>
                    <div className="text-xs text-gray-500">{project.expense_count} expenses</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full",
                      project.status === 'active' && "bg-green-100 text-green-800",
                      project.status === 'completed' && "bg-blue-100 text-blue-800",
                      project.status === 'on_hold' && "bg-yellow-100 text-yellow-800"
                    )}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(project.budget)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(project.actual)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className={cn(
                      "text-sm font-medium",
                      project.variance >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(project.variance)}
                    </div>
                    <div className={cn(
                      "text-xs",
                      project.variance >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {project.variance_percentage >= 0 ? '+' : ''}{project.variance_percentage.toFixed(1)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {project.budget_status === 'on-budget' ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        On Budget
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Over Budget
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Payment Summary Report Component
function PaymentSummaryReport({ data, formatCurrency }: { data: any; formatCurrency: (n: number) => string }) {
  const summary = data.summary;
  const payments: PaymentReport[] = data.data;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-500">Total Paid</p>
              <p className="text-lg md:text-2xl font-bold text-green-600 mt-0.5 md:mt-1 truncate">
                {formatCurrency(summary.total_paid_amount)}
              </p>
              <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">{summary.paid_count} payments</p>
            </div>
            <div className="bg-green-100 rounded-full p-2 md:p-3 flex-shrink-0 ml-2">
              <CheckCircle className="h-4 w-4 md:h-6 md:w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-500">Total Unpaid</p>
              <p className="text-lg md:text-2xl font-bold text-yellow-600 mt-0.5 md:mt-1 truncate">
                {formatCurrency(summary.total_unpaid_amount)}
              </p>
              <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">{summary.unpaid_count} pending</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-2 md:p-3 flex-shrink-0 ml-2">
              <Clock className="h-4 w-4 md:h-6 md:w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-500">Overdue</p>
              <p className="text-lg md:text-2xl font-bold text-red-600 mt-0.5 md:mt-1 truncate">
                {formatCurrency(summary.total_overdue_amount)}
              </p>
              <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">{summary.overdue_count} overdue</p>
            </div>
            <div className="bg-red-100 rounded-full p-2 md:p-3 flex-shrink-0 ml-2">
              <AlertTriangle className="h-4 w-4 md:h-6 md:w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-500">Total Payments</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900 mt-0.5 md:mt-1">
                {summary.total_payments}
              </p>
              <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">All time</p>
            </div>
            <div className="bg-blue-100 rounded-full p-2 md:p-3 flex-shrink-0 ml-2">
              <FileText className="h-4 w-4 md:h-6 md:w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">Payment Details</h3>
        </div>
        
        {/* Mobile: Card layout */}
        <div className="md:hidden divide-y divide-gray-200">
          {payments.map((payment) => (
            <div key={payment.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900 text-sm">{payment.vendor}</div>
                <span className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded-full",
                  payment.status === 'paid' && "bg-green-100 text-green-800",
                  payment.status === 'approved' && "bg-blue-100 text-blue-800",
                  payment.status === 'pending' && "bg-yellow-100 text-yellow-800",
                  payment.status === 'rejected' && "bg-red-100 text-red-800"
                )}>
                  {payment.status}
                </span>
              </div>
              {payment.description && (
                <p className="text-xs text-gray-500 truncate">{payment.description}</p>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{payment.category}</span>
                <span className="font-medium">{formatCurrency(payment.amount)}</span>
              </div>
              {payment.is_overdue && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Overdue ({payment.age_days} days)</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Desktop: Table layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{payment.vendor}</div>
                    {payment.description && (
                      <div className="text-xs text-gray-500 truncate max-w-xs">{payment.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {payment.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full",
                      payment.status === 'paid' && "bg-green-100 text-green-800",
                      payment.status === 'approved' && "bg-blue-100 text-blue-800",
                      payment.status === 'pending' && "bg-yellow-100 text-yellow-800",
                      payment.status === 'rejected' && "bg-red-100 text-red-800"
                    )}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className={cn(
                        "text-sm",
                        payment.is_overdue ? "text-red-600 font-medium" : "text-gray-500"
                      )}>
                        {payment.age_days} days
                      </span>
                      {payment.is_overdue && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800">
                          OVERDUE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(payment.created_at), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Delivery Summary Report Component
function DeliverySummaryReport({ data, formatCurrency }: { data: any; formatCurrency: (n: number) => string }) {
  const summary = data.summary;
  const deliveries: DeliveryReport[] = data.data;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-500">Total Deliveries</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900 mt-0.5 md:mt-1">
                {summary.total_deliveries}
              </p>
              <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 truncate">{formatCurrency(summary.total_value)}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-2 md:p-3 flex-shrink-0 ml-2">
              <Package className="h-4 w-4 md:h-6 md:w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-500">Delivered</p>
              <p className="text-lg md:text-2xl font-bold text-green-600 mt-0.5 md:mt-1">
                {summary.delivered_count}
              </p>
              <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 truncate">{formatCurrency(summary.delivered_value)}</p>
            </div>
            <div className="bg-green-100 rounded-full p-2 md:p-3 flex-shrink-0 ml-2">
              <CheckCircle className="h-4 w-4 md:h-6 md:w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-500">Pending</p>
              <p className="text-lg md:text-2xl font-bold text-yellow-600 mt-0.5 md:mt-1">
                {summary.pending_count}
              </p>
              <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 truncate">{formatCurrency(summary.pending_value)}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-2 md:p-3 flex-shrink-0 ml-2">
              <Clock className="h-4 w-4 md:h-6 md:w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-500">On-Time Rate</p>
              <p className="text-lg md:text-2xl font-bold text-indigo-600 mt-0.5 md:mt-1">
                {summary.on_time_percentage.toFixed(1)}%
              </p>
              <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">{summary.on_time_count} on-time</p>
            </div>
            <div className="bg-indigo-100 rounded-full p-2 md:p-3 flex-shrink-0 ml-2">
              <TrendingUp className="h-4 w-4 md:h-6 md:w-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">Delivery Details</h3>
        </div>
        
        {/* Mobile: Card layout */}
        <div className="md:hidden divide-y divide-gray-200">
          {deliveries.map((delivery) => (
            <div key={delivery.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900 text-sm">{delivery.order_id}</div>
                <span className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded-full",
                  delivery.status === 'delivered' && "bg-green-100 text-green-800",
                  delivery.status === 'completed' && "bg-blue-100 text-blue-800",
                  delivery.status === 'in_transit' && "bg-yellow-100 text-yellow-800",
                  delivery.status === 'pending' && "bg-gray-100 text-gray-800",
                  delivery.status === 'cancelled' && "bg-red-100 text-red-800"
                )}>
                  {delivery.status.replace('_', ' ')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 text-gray-400" />
                  <span>{delivery.driver_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Truck className="h-3 w-3 text-gray-400" />
                  <span>{delivery.vehicle_number}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  {delivery.delivery_date ? format(new Date(delivery.delivery_date), 'MMM d, yyyy') : 'Not scheduled'}
                </span>
                <span className="font-medium">{formatCurrency(delivery.amount)}</span>
              </div>
              {delivery.is_delayed && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Delayed ({delivery.age_days} days)</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Desktop: Table layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveries.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{delivery.order_id}</div>
                    {delivery.notes && (
                      <div className="text-xs text-gray-500 truncate max-w-xs">{delivery.notes}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{delivery.driver_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{delivery.vehicle_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full",
                      delivery.status === 'delivered' && "bg-green-100 text-green-800",
                      delivery.status === 'completed' && "bg-blue-100 text-blue-800",
                      delivery.status === 'in_transit' && "bg-yellow-100 text-yellow-800",
                      delivery.status === 'pending' && "bg-gray-100 text-gray-800",
                      delivery.status === 'cancelled' && "bg-red-100 text-red-800"
                    )}>
                      {delivery.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {formatCurrency(delivery.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className={cn(
                        "text-sm",
                        delivery.is_delayed ? "text-red-600 font-medium" : "text-gray-500"
                      )}>
                        {delivery.age_days} days
                      </span>
                      {delivery.is_delayed && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800">
                          DELAYED
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {delivery.delivery_date ? format(new Date(delivery.delivery_date), 'MMM d, yyyy') : 'Not scheduled'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
