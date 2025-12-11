'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  ChevronRight,
  X,
  RefreshCw,
  Zap
} from 'lucide-react';
import { usePlan } from '@/hooks/usePlan';
import { useCurrency } from '@/lib/CurrencyContext';
import { DelayShieldModal } from './DelayShieldModal';

interface RiskFactor {
  type: string;
  name: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
}

interface RecoveryOption {
  id: number;
  name: string;
  type: 'fastest' | 'cheapest' | 'balanced';
  cost: number;
  time_saved_days: number;
  description: string;
  action_items: string[];
  recommended: boolean;
}

interface DelayAlert {
  id: string;
  project_id: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  predicted_delay_days: number;
  financial_impact: number;
  contributing_factors: RiskFactor[];
  recovery_options: RecoveryOption[];
  email_draft: {
    to: string[];
    subject: string;
    body: string;
  };
  project?: {
    id: string;
    name: string;
    code: string;
    budget: number;
  };
}

interface DelayShieldPanelProps {
  projectId: string;
  projectName?: string;
  compact?: boolean;
}

export function DelayShieldPanel({ projectId, projectName, compact = false }: DelayShieldPanelProps) {
  const { hasFeature } = usePlan();
  const { formatAmount } = useCurrency();
  const [alert, setAlert] = useState<DelayAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Only show for Enterprise
  const hasDelayShield = hasFeature('delayShield');

  useEffect(() => {
    if (hasDelayShield && projectId) {
      fetchAlert();
    }
  }, [hasDelayShield, projectId]);

  const fetchAlert = async () => {
    try {
      const res = await fetch(`/api/ai/delay-shield?project_id=${projectId}`);
      const data = await res.json();
      if (data.success && data.data.alerts?.length > 0) {
        setAlert(data.data.alerts[0]);
      } else {
        setAlert(null);
      }
    } catch (err) {
      console.error('[DelayShield Panel] Error:', err);
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
        body: JSON.stringify({ project_id: projectId })
      });
      const data = await res.json();
      if (data.success) {
        await fetchAlert();
      }
    } catch (err) {
      console.error('[DelayShield Panel] Scan error:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleDismiss = async () => {
    if (!alert) return;
    
    try {
      await fetch('/api/ai/delay-shield/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alert.id })
      });
      setDismissed(true);
      setAlert(null);
    } catch (err) {
      console.error('[DelayShield Panel] Dismiss error:', err);
    }
  };

  // Don't render for non-Enterprise users
  if (!hasDelayShield) {
    return null;
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg h-20" />
    );
  }

  // No alert - show scan option
  if (!alert) {
    if (dismissed) {
      return null; // Don't show anything after dismissal
    }

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Shield className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <div className="font-medium text-gray-700">Delay Shield™ AI</div>
              <div className="text-sm text-gray-500">No active alerts</div>
            </div>
          </div>
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning...' : 'Run Scan'}
          </button>
        </div>
      </div>
    );
  }

  // Has alert - show risk panel
  const riskColors = {
    low: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100' },
    medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100' },
    high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100' },
    critical: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800', badge: 'bg-red-200' }
  };

  const colors = riskColors[alert.risk_level];

  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`w-full ${colors.bg} ${colors.border} border-2 rounded-xl p-3 text-left hover:opacity-90 transition-opacity`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colors.badge}`}>
              <AlertTriangle className={`h-5 w-5 ${colors.text}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${colors.text} uppercase`}>
                  {alert.risk_level} Risk
                </span>
                <span className="text-gray-600 text-sm">•</span>
                <span className="text-sm text-gray-600">
                  {alert.predicted_delay_days} day delay predicted
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {formatAmount(alert.financial_impact)} potential impact
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </button>
        
        <DelayShieldModal
          alert={alert}
          open={showModal}
          onClose={() => setShowModal(false)}
          onApply={() => {
            setShowModal(false);
            fetchAlert();
          }}
        />
      </>
    );
  }

  // Full panel
  return (
    <>
      <div className={`${colors.bg} ${colors.border} border-2 rounded-xl overflow-hidden`}>
        {/* Header */}
        <div className="p-4 border-b border-current/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${colors.badge}`}>
                <Shield className={`h-6 w-6 ${colors.text}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">Delay Shield™ AI Alert</span>
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${colors.badge} ${colors.text}`}>
                    {alert.risk_level}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {projectName || 'This project'} requires attention
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDismiss}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
                title="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(alert.risk_score * 100)}%
              </div>
              <div className="text-xs text-gray-500">Risk Score</div>
            </div>
            <div className="bg-white/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
                <Clock className="h-5 w-5" />
                {alert.predicted_delay_days}
              </div>
              <div className="text-xs text-gray-500">Days Delay</div>
            </div>
            <div className="bg-white/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatAmount(alert.financial_impact)}
              </div>
              <div className="text-xs text-gray-500">At Risk</div>
            </div>
          </div>

          {/* Top Factors Preview */}
          <div className="space-y-2 mb-4">
            {alert.contributing_factors.slice(0, 2).map((factor, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  factor.severity === 'high' ? 'bg-red-500' :
                  factor.severity === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
                }`} />
                <span className="text-gray-700">{factor.name}:</span>
                <span className="text-gray-500 truncate">{factor.issue}</span>
              </div>
            ))}
            {alert.contributing_factors.length > 2 && (
              <div className="text-xs text-gray-500 pl-4">
                +{alert.contributing_factors.length - 2} more factors
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={() => setShowModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Zap className="h-5 w-5" />
            View Recovery Options
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <DelayShieldModal
        alert={alert}
        open={showModal}
        onClose={() => setShowModal(false)}
        onApply={() => {
          setShowModal(false);
          fetchAlert();
        }}
      />
    </>
  );
}

export default DelayShieldPanel;
