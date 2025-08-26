import React, { ReactNode } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
  children?: ReactNode;
}

export function Card({ title, actions, footer, padded=true, children, className='', ...rest }: CardProps) {
  return (
    <div className={`sp-card flex flex-col ${className}`} {...rest}>
      {(title || actions) && (
        <div className="flex items-start justify-between mb-3 gap-4">
          {title && <h3 className="text-sm font-semibold tracking-tight">{title}</h3>}
          {actions && <div className="flex items-center gap-2 text-sm">{actions}</div>}
        </div>
      )}
      <div className={padded ? 'space-y-3' : ''}>{children}</div>
      {footer && <div className="mt-4 pt-3 border-t border-[var(--sp-color-border)] text-xs text-[var(--sp-color-muted)]">{footer}</div>}
    </div>
  );
}

export default Card;
