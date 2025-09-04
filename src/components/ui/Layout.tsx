import React from 'react';
import { BackButton } from './BackButton';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
  /** Show a back button */
  showBackButton?: boolean;
  /** Custom href for back button */
  backHref?: string;
  /** Custom label for back button */
  backLabel?: string;
}

export function PageHeader({ title, children, showBackButton = false, backHref, backLabel }: PageHeaderProps) {
  return (
    <div className="space-y-4 mb-6">
      {showBackButton && (
        <div>
          <BackButton href={backHref} label={backLabel} useHistory={!backHref} />
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
        {children}
      </div>
    </div>
  );
}

interface SectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ title, children, className = '' }: SectionProps) {
  return (
    <section className={`mb-6 ${className}`}>
      {title && (
        <h2 className="mb-3 text-sm font-semibold text-zinc-500 tracking-wide">{title}</h2>
      )}
      {children}
    </section>
  );
}
