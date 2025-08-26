"use client";
import React, { ReactNode } from 'react';
import Link from 'next/link';

// Simple utility to join classNames (avoids external dep)
function cn(...parts: (string | undefined | false | null | Record<string, boolean>)[]) {
  return parts
    .flatMap(p => {
      if (!p) return [];
      if (typeof p === 'string') return [p];
      if (typeof p === 'object') return Object.entries(p).filter(([,v])=>v).map(([k])=>k);
      return [];
    })
    .join(' ');
}

interface BaseProps {
  variant?: 'primary' | 'accent' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  className?: string;
  children?: ReactNode;
}

type ButtonAsButton = BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type ButtonAsLink = BaseProps & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string };
export type ButtonProps = ButtonAsButton | ButtonAsLink;

const sizeMap: Record<string, string> = {
  sm: 'text-xs px-2.5 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-5 py-2.5'
};

const base = 'inline-flex items-center justify-center rounded-full font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed gap-2';

const variantMap: Record<string,string> = {
  primary: 'bg-[var(--sp-color-primary)] text-white hover:bg-[var(--sp-color-primary-hover)] focus-visible:ring-[var(--sp-color-primary)]',
  accent: 'bg-[var(--sp-color-accent)] text-white hover:bg-[var(--sp-color-accent-hover)] focus-visible:ring-[var(--sp-color-accent)]',
  ghost: 'bg-transparent text-[var(--sp-color-primary)] hover:bg-[var(--sp-color-primary)]/10 focus-visible:ring-[var(--sp-color-primary)]',
  danger: 'bg-[var(--sp-color-danger)] text-white hover:bg-[var(--sp-color-danger)]/90 focus-visible:ring-[var(--sp-color-danger)]'
};

export function Button(props: ButtonProps) {
  const { variant='primary', size='md', leftIcon, rightIcon, loading, children, className, href, ...rest } = props as any;
  const inner = (
    <span className="inline-flex items-center gap-2 relative">
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      <span className={cn({ 'opacity-0': !!loading })}>{children}</span>
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
      {loading && <span className="absolute h-4 w-4 animate-spin border-2 border-white/40 border-t-white rounded-full" />}
    </span>
  );
  const classes = cn(base, sizeMap[size], variantMap[variant], className, 'relative');
  if (href) {
    return (
      <Link href={href} className={classes} {...(rest as any)}>
        {inner}
      </Link>
    );
  }
  return (
    <button className={classes} {...(rest as any)} disabled={loading || (rest as any).disabled}>
      {inner}
    </button>
  );
}

export default Button;
