'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/app-layout';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  ChevronRight,
  RefreshCw,
  Zap,
  CheckCircle,
  XCircle,
  TrendingDown,
  Sparkles,
  Activity,
  ArrowUpRight,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Timer,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePlan } from '@/hooks/usePlan';
import { useCurrency } from '@/lib/CurrencyContext';
import { DelayShieldModal } from '@/components/DelayShieldModal';
import Link from 'next/link';

interface DelayAlert {
  id: string;
  project_id: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  predicted_delay_days: number;
  financial_impact: number;
  contributing_factors: any[];
  recovery_options: any[];
  email_draft: any;
  status: string;
  created_at: string;
  project?: {
    id: string;
    name: string;
    code: string;
    budget: number;
  };
}

interface Summary {
  active_alerts: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  total_financial_risk: number;
}

export default function DelayShieldPage() {
  const { hasFeature } = usePlan();
  const { formatAmount } = useCurrency();
  const [alerts, setAlerts] = useState<DelayAlert[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<DelayAlert | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'applied' | 'dismissed'>('active');

  const hasDelayShield = hasFeature('delayShield');

  useEffect(() => {
    if (hasDelayShield) {
      fetchAlerts();
    } else {
      setLoading(false);
    }
  }, [hasDelayShield, filter]);

  const fetchAlerts = async () => {
    try {
      const status = filter === 'all' ? 'all' : filter;
      const res = await fetch(`/api/ai/delay-shield?status=${status}`);
      const data = await res.json();
      if (data.success) {
        setAlerts(data.data.alerts || []);
        setSummary(data.data.summary);
      }
    } catch (err) {
      console.error('[DelayShield Page] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const runFullScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/ai/delay-shield', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_all: true })
      });
      const data = await res.json();
      if (data.success) {
        await fetchAlerts();
      }
    } catch (err) {
      console.error('[DelayShield Page] Scan error:', err);
    } finally {
      setScanning(false);
    }
  };

  // Enterprise upgrade gate
  if (!hasDelayShield) {
    return (
      <AppLayout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="max-w-2xl mx-auto text-center px-6">
            {/* Premium Shield Icon */}
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl blur-2xl opacity-20 animate-pulse" />
              <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-xl">
                <Shield className="h-12 w-12 text-white" />
              </div>
              <div className="absolute -right-2 -top-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="h-4 w-4 text-amber-900" />
              </div>
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Delay Shield™ <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">AI</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-lg mx-auto">
              Predict delays before they cost you money. Our AI analyzes your projects 24/7 and alerts you to risks.
            </p>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-4 mb-10">
              {[
                { icon: Eye, title: '24/7 Monitoring', desc: 'Continuous project scanning' },
                { icon: Activity, title: 'Risk Detection', desc: 'Weather, supplier & schedule' },
                { icon: DollarSign, title: '$ Impact', desc: 'Know the cost of delays' },
                { icon: Target, title: '3 Fix Options', desc: 'AI recovery plans' },
              ].map((feature, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 text-left hover:border-blue-300 hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center mb-3">
                    <feature.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="font-semibold text-gray-900">{feature.title}</div>
                  <div className="text-sm text-gray-500">{feature.desc}</div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="inline-flex items-center gap-6 bg-gray-50 rounded-2xl px-8 py-4 mb-10">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">10-17%</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Avg. Savings</div>
              </div>
              <div className="w-px h-8 bg-gray-300" />
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">72hr</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Early Warning</div>
              </div>
              <div className="w-px h-8 bg-gray-300" />
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">3</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Fix Options</div>
              </div>
            </div>

            <Link href="/settings/billing">
              <Button 
                variant="primary" 
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25 px-8"
              >
                <Zap className="h-5 w-5 mr-2" />
                Upgrade to Enterprise
                <ArrowUpRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <p className="text-sm text-gray-400 mt-4">Enterprise feature • Instant activation</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const getRiskConfig = (level: string) => {
    switch (level) {
      case 'critical':
        return { 
          bg: 'bg-gradient-to-r from-red-500 to-rose-600', 
          text: 'text-white',
          border: 'border-red-200',
          badge: 'bg-red-100 text-red-700',
          dot: 'bg-red-500',
          icon: ShieldAlert
        };
      case 'high':
        return { 
          bg: 'bg-gradient-to-r from-orange-500 to-red-500', 
          text: 'text-white',
          border: 'border-orange-200',
          badge: 'bg-orange-100 text-orange-700',
          dot: 'bg-orange-500',
          icon: AlertTriangle
        };
      case 'medium':
        return { 
          bg: 'bg-gradient-to-r from-amber-400 to-orange-500', 
          text: 'text-white',
          border: 'border-amber-200',
          badge: 'bg-amber-100 text-amber-700',
          dot: 'bg-amber-500',
          icon: Clock
        };
      default:
        return { 
          bg: 'bg-gradient-to-r from-green-400 to-emerald-500', 
          text: 'text-white',
          border: 'border-green-200',
          badge: 'bg-green-100 text-green-700',
          dot: 'bg-green-500',
          icon: ShieldCheck
        };
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Premium Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Shield className="h-7 w-7 text-white" />
              </div>
              {(summary?.critical_count || 0) + (summary?.high_count || 0) > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-[10px] font-bold text-white">
                    {(summary?.critical_count || 0) + (summary?.high_count || 0)}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Delay Shield™ AI</h1>
              <p className="text-gray-500">Proactive delay prediction and prevention</p>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={runFullScan}
            disabled={scanning}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/20"
          >
            {scanning ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Analyzing Projects...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Run Full Scan
              </>
            )}
          </Button>
        </div>

        {/* Premium Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Active Alerts */}
          <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Shield className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {summary?.active_alerts || 0}
              </div>
              <div className="text-sm text-gray-500 font-medium">Active Alerts</div>
            </div>
          </div>

          {/* High/Critical */}
          <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/5 to-orange-500/5 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {(summary?.critical_count || 0) + (summary?.high_count || 0)}
              </div>
              <div className="text-sm text-gray-500 font-medium">High/Critical</div>
            </div>
          </div>

          {/* Financial Risk */}
          <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatAmount(summary?.total_financial_risk || 0)}
              </div>
              <div className="text-sm text-gray-500 font-medium">Total at Risk</div>
            </div>
          </div>

          {/* Mitigated */}
          <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/20">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {alerts.filter(a => a.status === 'applied').length}
              </div>
              <div className="text-sm text-gray-500 font-medium">Mitigated</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
          {[
            { key: 'active', label: 'Active', count: summary?.active_alerts },
            { key: 'applied', label: 'Applied', count: alerts.filter(a => a.status === 'applied').length },
            { key: 'dismissed', label: 'Dismissed' },
            { key: 'all', label: 'All' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  filter === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-8 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
                    <div className="h-4 bg-gray-100 rounded w-32" />
                  </div>
                  <div className="flex gap-8">
                    <div className="text-center">
                      <div className="h-6 bg-gray-200 rounded w-12 mb-1" />
                      <div className="h-3 bg-gray-100 rounded w-8" />
                    </div>
                    <div className="text-center">
                      <div className="h-6 bg-gray-200 rounded w-16 mb-1" />
                      <div className="h-3 bg-gray-100 rounded w-10" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                <ShieldCheck className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'active' ? 'All Clear!' : 'No Alerts Found'}
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              {filter === 'active' 
                ? 'All your projects are on track. Run a scan to check for new risks.'
                : 'No alerts match the current filter.'}
            </p>
            {filter === 'active' && (
              <Button 
                variant="primary" 
                onClick={runFullScan} 
                disabled={scanning}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Run Full Scan
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map(alert => {
              const config = getRiskConfig(alert.risk_level);
              const RiskIcon = config.icon;
              
              return (
                <div
                  key={alert.id}
                  className={`bg-white rounded-2xl border ${
                    alert.status === 'active' ? 'border-gray-200 hover:border-blue-300 hover:shadow-lg cursor-pointer' : 'border-gray-100'
                  } overflow-hidden transition-all duration-200`}
                  onClick={() => alert.status === 'active' && setSelectedAlert(alert)}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        {/* Risk Level Badge */}
                        <div className={`px-4 py-2 rounded-xl ${config.bg} ${config.text} flex items-center gap-2 shadow-sm`}>
                          <RiskIcon className="h-4 w-4" />
                          <span className="text-sm font-bold uppercase tracking-wide">
                            {alert.risk_level}
                          </span>
                        </div>
                        
                        {/* Project Info */}
                        <div>
                          <div className="font-semibold text-gray-900 text-lg">
                            {alert.project?.name || 'Unknown Project'}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            {alert.contributing_factors.length} risk factor{alert.contributing_factors.length !== 1 ? 's' : ''} detected
                          </div>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <Timer className="h-4 w-4 text-gray-400" />
                            <span className="text-xl font-bold text-gray-900">
                              {alert.predicted_delay_days}d
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Delay</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <span className="text-xl font-bold text-gray-900">
                              {formatAmount(alert.financial_impact)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">At Risk</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-xl font-bold text-gray-900">
                            {Math.round(alert.risk_score * 100)}%
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Score</div>
                        </div>

                        {/* Status or Arrow */}
                        {alert.status !== 'active' ? (
                          <div className={`px-4 py-2 rounded-xl text-sm font-medium ${
                            alert.status === 'applied' 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {alert.status === 'applied' ? '✓ Fixed' : 'Dismissed'}
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Risk Factors Preview */}
                    {alert.contributing_factors.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex flex-wrap gap-2">
                          {alert.contributing_factors.slice(0, 4).map((factor, i) => (
                            <div 
                              key={i} 
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                                factor.severity === 'high' 
                                  ? 'bg-red-50 text-red-700' 
                                  : factor.severity === 'medium'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-gray-50 text-gray-600'
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                factor.severity === 'high' ? 'bg-red-500' :
                                factor.severity === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
                              }`} />
                              {factor.name}
                            </div>
                          ))}
                          {alert.contributing_factors.length > 4 && (
                            <div className="inline-flex items-center px-3 py-1.5 text-sm text-gray-400">
                              +{alert.contributing_factors.length - 4} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <DelayShieldModal
        alert={selectedAlert}
        open={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onApply={() => {
          setSelectedAlert(null);
          fetchAlerts();
        }}
      />
    </AppLayout>
  );
}
