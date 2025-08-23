import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: { value: string; direction: 'up' | 'down' };
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, delta, icon }) => {
  return (
    <div className="sp-card flex items-center gap-4">
      {icon && <div className="w-10 h-10 rounded-xl bg-[var(--sp-color-primary)]/10 flex items-center justify-center text-[var(--sp-color-primary)]">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wide text-[var(--sp-color-muted)] font-medium">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold">{value}</span>
          {delta && (
            <span className={`sp-badge ${delta.direction==='up' ? 'sp-badge-success' : 'sp-badge-danger'}`}>{delta.value}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
