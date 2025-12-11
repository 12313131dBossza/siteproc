'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, TrendingDown, ChevronRight, Zap, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { usePlan } from '@/hooks/usePlan';
import { useCurrency } from '@/lib/CurrencyContext';

interface DelayShieldSummary {
  active_alerts: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  total_financial_risk: number;
  highest_risk_level_num: number;
}

interface DelayShieldBadgeProps {
  variant?: 'compact' | 'full';
  showScan?: boolean;
}

export function DelayShieldBadge({ variant = 'compact', showScan = false }: DelayShieldBadgeProps) {
  const { hasFeature } = usePlan();
  const { formatAmount } = useCurrency();
  const [summary, setSummary] = useState<DelayShieldSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  // Only show for Enterprise
  const hasDelayShield = hasFeature('delayShield');

  useEffect(() => {
    if (hasDelayShield) {
      fetchSummary();
    }
  }, [hasDelayShield]);

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/ai/delay-shield');
      const data = await res.json();
      if (data.success) {
        setSummary(data.data.summary);
      }
    } catch (err) {
      console.error('[DelayShield Badge] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/ai/delay-shield', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_all: true })
      });
      const data = await res.json();
      if (data.success) {
        // Refresh summary after scan
        await fetchSummary();
      }
    } catch (err) {
      console.error('[DelayShield Badge] Scan error:', err);
    } finally {
      setScanning(false);
    }
  };

  // Don't render for non-Enterprise users
  if (!hasDelayShield) {
    return null;
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg h-16 w-full" />
    );
  }

  const activeAlerts = summary?.active_alerts || 0;
  const criticalOrHigh = (summary?.critical_count || 0) + (summary?.high_count || 0);
  const financialRisk = summary?.total_financial_risk || 0;

  // Determine badge color based on risk
  let badgeColor = 'bg-green-50 border-green-200 text-green-700';
  let iconColor = 'text-green-500';
  let riskLabel = 'All Clear';
  
  if (criticalOrHigh > 0) {
    badgeColor = 'bg-red-50 border-red-200 text-red-700';
    iconColor = 'text-red-500';
    riskLabel = `${criticalOrHigh} High Risk`;
  } else if (activeAlerts > 0) {
    badgeColor = 'bg-amber-50 border-amber-200 text-amber-700';
    iconColor = 'text-amber-500';
    riskLabel = `${activeAlerts} Active Alert${activeAlerts > 1 ? 's' : ''}`;
  }

  if (variant === 'compact') {
    return (
      <Link href="/delay-shield" className="block">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${badgeColor} hover:opacity-90 transition-opacity cursor-pointer`}>
          <Shield className={`h-5 w-5 ${iconColor}`} />
          <span className="text-sm font-medium">Delay Shield™</span>
          {criticalOrHigh > 0 && (
            <span className="flex items-center gap-1 ml-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-xs font-bold text-red-600">{criticalOrHigh}</span>
            </span>
          )}
        </div>
      </Link>
    );
  }

  // Full variant
  return (
    <div className={`rounded-xl border-2 ${badgeColor} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${criticalOrHigh > 0 ? 'bg-red-100' : activeAlerts > 0 ? 'bg-amber-100' : 'bg-green-100'}`}>
              <Shield className={`h-6 w-6 ${iconColor}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Delay Shield™ AI</h3>
              <p className="text-xs text-gray-500">Proactive delay prevention</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showScan && (
              <button
                onClick={runScan}
                disabled={scanning}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg transition-colors disabled:opacity-50"
                title="Run scan now"
              >
                <RefreshCw className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
              </button>
            )}
            <Link href="/delay-shield">
              <span className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View All
                <ChevronRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="text-center p-2 bg-white/50 rounded-lg">
            <div className={`text-2xl font-bold ${criticalOrHigh > 0 ? 'text-red-600' : activeAlerts > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {activeAlerts}
            </div>
            <div className="text-xs text-gray-500">Active Alerts</div>
          </div>
          <div className="text-center p-2 bg-white/50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {criticalOrHigh}
            </div>
            <div className="text-xs text-gray-500">High/Critical</div>
          </div>
          <div className="text-center p-2 bg-white/50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {financialRisk > 0 ? formatAmount(financialRisk) : '$0'}
            </div>
            <div className="text-xs text-gray-500">At Risk</div>
          </div>
        </div>

        {/* Status Message */}
        <div className={`mt-3 p-2 rounded-lg flex items-center gap-2 ${
          criticalOrHigh > 0 ? 'bg-red-100' : activeAlerts > 0 ? 'bg-amber-100' : 'bg-green-100'
        }`}>
          {criticalOrHigh > 0 ? (
            <>
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700 font-medium">
                {criticalOrHigh} project{criticalOrHigh > 1 ? 's' : ''} need immediate attention
              </span>
            </>
          ) : activeAlerts > 0 ? (
            <>
              <TrendingDown className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700 font-medium">
                Minor risks detected - review recommended
              </span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                All projects on track - no delays predicted
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DelayShieldBadge;
