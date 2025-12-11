'use client';

import { useState } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Zap, 
  Timer,
  Scale,
  CheckCircle,
  X,
  Send,
  FileText,
  ChevronRight,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useCurrency } from '@/lib/CurrencyContext';

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

interface RiskFactor {
  type: string;
  name: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
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

interface DelayShieldModalProps {
  alert: DelayAlert | null;
  open: boolean;
  onClose: () => void;
  onApply?: () => void;
}

export function DelayShieldModal({ alert, open, onClose, onApply }: DelayShieldModalProps) {
  const { formatAmount } = useCurrency();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [result, setResult] = useState<any>(null);

  if (!alert) return null;

  const getRiskConfig = (level: string) => {
    switch (level) {
      case 'critical':
        return { 
          gradient: 'from-red-500 to-rose-600',
          bg: 'bg-red-50', 
          text: 'text-red-700', 
          border: 'border-red-200',
          icon: ShieldAlert,
          label: 'Critical Risk'
        };
      case 'high':
        return { 
          gradient: 'from-orange-500 to-red-500',
          bg: 'bg-orange-50', 
          text: 'text-orange-700', 
          border: 'border-orange-200',
          icon: AlertTriangle,
          label: 'High Risk'
        };
      case 'medium':
        return { 
          gradient: 'from-amber-400 to-orange-500',
          bg: 'bg-amber-50', 
          text: 'text-amber-700', 
          border: 'border-amber-200',
          icon: Clock,
          label: 'Medium Risk'
        };
      default:
        return { 
          gradient: 'from-green-400 to-emerald-500',
          bg: 'bg-green-50', 
          text: 'text-green-700', 
          border: 'border-green-200',
          icon: ShieldCheck,
          label: 'Low Risk'
        };
    }
  };

  const optionConfig = {
    fastest: { 
      icon: Zap, 
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-50',
      ring: 'ring-blue-500',
      text: 'text-blue-700'
    },
    cheapest: { 
      icon: DollarSign, 
      gradient: 'from-green-500 to-emerald-500',
      bg: 'bg-green-50',
      ring: 'ring-green-500',
      text: 'text-green-700'
    },
    balanced: { 
      icon: Scale, 
      gradient: 'from-purple-500 to-violet-500',
      bg: 'bg-purple-50',
      ring: 'ring-purple-500',
      text: 'text-purple-700'
    }
  };

  const handleApply = async () => {
    if (!selectedOption) return;
    
    setApplying(true);
    try {
      const res = await fetch('/api/ai/delay-shield/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_id: alert.id,
          option_id: selectedOption,
          send_email: sendEmail
        })
      });

      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        onApply?.();
      } else {
        console.error('Apply failed:', data.error);
      }
    } catch (err) {
      console.error('Apply error:', err);
    } finally {
      setApplying(false);
    }
  };

  const riskConfig = getRiskConfig(alert.risk_level);
  const RiskIcon = riskConfig.icon;

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title=""
      size="xl"
    >
      {result ? (
        // Success state - Premium version
        <div className="text-center py-10">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl blur-xl opacity-30 animate-pulse" />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Recovery Plan Applied!
          </h3>
          <p className="text-gray-600 mb-8 max-w-sm mx-auto">
            {result.applied_option?.name} has been activated for {alert.project?.name}.
          </p>
          
          <div className="inline-flex flex-col gap-3 text-left mb-8 bg-gray-50 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="text-gray-700">Change order created</span>
              {result.change_order_id && <CheckCircle className="h-4 w-4 text-green-500" />}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Send className="h-4 w-4 text-white" />
              </div>
              <span className="text-gray-700">Notification email sent</span>
              {result.email_sent && <CheckCircle className="h-4 w-4 text-green-500" />}
            </div>
          </div>

          <Button 
            variant="primary" 
            size="lg"
            onClick={onClose}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/20"
          >
            <ShieldCheck className="h-5 w-5 mr-2" />
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Premium Header - more compact on mobile */}
          <div className="flex items-center gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-gray-200">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${riskConfig.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
              <RiskIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-xl font-bold text-gray-900 truncate">
                {alert.project?.name || 'Project Alert'}
              </h2>
              <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg ${riskConfig.bg} ${riskConfig.text} text-xs sm:text-sm font-semibold mt-1`}>
                <RiskIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {riskConfig.label}
              </div>
            </div>
            <div className="text-center flex-shrink-0">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">{Math.round(alert.risk_score * 100)}%</div>
              <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Risk Score</div>
            </div>
          </div>

          {/* Impact Cards - clearer white background */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border-2 border-gray-200 p-3 sm:p-5">
              <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-full -mr-8 sm:-mr-10 -mt-8 sm:-mt-10" />
              <div className="relative">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                  <Timer className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                  <span className="text-xs sm:text-sm text-gray-600 font-medium">Predicted Delay</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {alert.predicted_delay_days} <span className="text-sm sm:text-lg font-medium text-gray-500">days</span>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border-2 border-gray-200 p-3 sm:p-5">
              <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-full -mr-8 sm:-mr-10 -mt-8 sm:-mt-10" />
              <div className="relative">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                  <span className="text-xs sm:text-sm text-gray-600 font-medium">Financial Impact</span>
                </div>
                <div className="text-xl sm:text-3xl font-bold text-gray-900 truncate">
                  {formatAmount(alert.financial_impact)}
                </div>
              </div>
            </div>
          </div>

          {/* Contributing Factors */}
          <div>
            <h4 className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
              <Target className="h-4 w-4" />
              Risk Factors Detected
            </h4>
            <div className="space-y-2">
              {alert.contributing_factors.map((factor, i) => (
                <div 
                  key={i}
                  className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 ${
                    factor.severity === 'high' 
                      ? 'bg-red-50 border-red-300' 
                      : factor.severity === 'medium'
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
                    factor.severity === 'high' ? 'bg-red-500 animate-pulse' :
                    factor.severity === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm sm:text-base">{factor.name}</div>
                    <div className="text-xs sm:text-sm text-gray-600 truncate">{factor.issue}</div>
                  </div>
                  <div className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase ${
                    factor.severity === 'high' ? 'bg-red-200 text-red-800' :
                    factor.severity === 'medium' ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {factor.severity}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 font-medium flex-shrink-0">
                    {Math.round(factor.confidence * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recovery Options */}
          <div>
            <h4 className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
              <Sparkles className="h-4 w-4" />
              AI Recovery Options
            </h4>
            <div className="space-y-2 sm:space-y-3">
              {alert.recovery_options.map((option) => {
                const config = optionConfig[option.type];
                const OptionIcon = config.icon;
                const isSelected = selectedOption === option.id;

                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedOption(option.id)}
                    className={`w-full text-left p-4 sm:p-5 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] ${
                      isSelected 
                        ? `border-blue-500 ring-4 ring-blue-100 bg-blue-50 shadow-lg` 
                        : `border-gray-200 bg-white hover:border-blue-300 hover:shadow-md active:bg-gray-50`
                    }`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-md flex-shrink-0`}>
                        <OptionIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 text-base sm:text-lg">{option.name}</span>
                          {option.recommended && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                              <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2">{option.description}</p>
                        
                        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-amber-100 flex items-center justify-center">
                              <DollarSign className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600" />
                            </div>
                            <span className="font-semibold text-gray-900 text-sm sm:text-base">{formatAmount(option.cost)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-green-100 flex items-center justify-center">
                              <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-600" />
                            </div>
                            <span className="font-semibold text-gray-900 text-sm sm:text-base">{option.time_saved_days}</span>
                            <span className="text-gray-500 text-xs sm:text-sm">days saved</span>
                          </div>
                        </div>
                      </div>
                      <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300 bg-white'
                      }`}>
                        {isSelected && (
                          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email Option */}
          <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white border-2 border-gray-200 rounded-xl">
            <input
              type="checkbox"
              id="sendEmail"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="h-5 w-5 sm:h-6 sm:w-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="sendEmail" className="flex-1 cursor-pointer min-w-0">
              <div className="font-semibold text-gray-900 text-sm sm:text-base">Send notification email</div>
              <div className="text-xs sm:text-sm text-gray-500">
                Auto-draft email will be sent to stakeholders
              </div>
            </label>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <Send className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
          </div>

          {/* Action Buttons - sticky on mobile */}
          <div className="flex items-center justify-between gap-3 pt-3 sm:pt-4 border-t border-gray-200 sticky bottom-0 bg-white -mx-4 px-4 pb-2 sm:relative sm:mx-0 sm:px-0 sm:pb-0">
            <Button variant="ghost" onClick={onClose} size="lg" className="text-gray-600">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="lg"
              disabled={!selectedOption || applying}
              onClick={handleApply}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/20 px-4 sm:px-6 flex-1 sm:flex-none"
            >
              {applying ? (
                <>
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                  <span className="hidden sm:inline">Applying...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Apply Recovery Plan</span>
                  <span className="sm:hidden">Apply Plan</span>
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default DelayShieldModal;
