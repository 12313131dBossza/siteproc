import React from 'react';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
      {children}
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
