import React from 'react';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}

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

export const Button: React.FC<ButtonProps> = ({ variant='primary', size='md', leftIcon, rightIcon, loading, children, className, ...rest }) => {
  return (
    <button
      className={clsx(base, sizeMap[size], variantMap[variant], className)}
      {...rest}
      disabled={loading || rest.disabled}
    >
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      <span className={clsx({ 'opacity-0': loading })}>{children}</span>
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
      {loading && <span className="absolute h-4 w-4 animate-spin border-2 border-white/40 border-t-white rounded-full" />}
    </button>
  )
};

export default Button;
