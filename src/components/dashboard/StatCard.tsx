'use client';

import { ReactNode } from 'react';

export default function StatCard({
  label,
  value,
  icon,
  variant = 'primary',
  loading,
  onClick,
  className = '',
  children,
}: {
  label: string;
  value: string | number | ReactNode;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger';
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}) {
  const isClickable = typeof onClick === 'function';
  const content = (
    <div
      className={`card radius-12 p-3 h-100 border-0 shadow-sm bg-${variant}-subtle text-${variant}-emphasis ${isClickable ? 'cursor-pointer' : ''} ${className}`.trim()}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={e => isClickable && e.key === 'Enter' && onClick?.()}
    >
      <div className="d-flex align-items-center justify-content-between">
        <div className="min-w-0">
          <div className="fw-semibold fs-5">{loading ? '—' : value}</div>
          <small className="text-muted">{label}</small>
        </div>
        {icon && <i className={`${icon} fs-4 opacity-75 flex-shrink-0 ms-2`} aria-hidden />}
      </div>
      {children}
    </div>
  );
  return <div className="bpa-stat-card h-100">{content}</div>;
}
