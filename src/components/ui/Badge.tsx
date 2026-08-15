import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '', icon }) => {
  const variantStyles: Record<string, string> = {
    default: 'badge-gray',
    success: 'badge-green',
    warning: 'badge-amber',
    danger: 'badge-red',
    info: 'badge-blue',
    outline: 'border border-slate-200 text-slate-700 bg-white',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full transition-colors ${variantStyles[variant]} ${className}`}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
};
