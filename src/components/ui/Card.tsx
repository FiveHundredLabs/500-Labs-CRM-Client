import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({
  children,
  className = '',
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`bg-white/90 backdrop-blur-md border border-slate-200/85 rounded-2xl shadow-2xs transition-all duration-200 ${
      onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5' : 'hover:border-slate-300/80 hover:shadow-xs'
    } ${className}`}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`px-5 py-4 border-b border-slate-100/90 flex items-center justify-between gap-4 ${className}`}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <h3 className={`text-sm font-bold text-slate-900 tracking-tight ${className}`}>{children}</h3>;

export const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <p className={`text-xs text-slate-500 mt-0.5 font-normal ${className}`}>{children}</p>;

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`p-5 ${className}`}>{children}</div>;

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`px-5 py-3.5 border-t border-slate-100/90 bg-slate-50/50 rounded-b-2xl flex items-center justify-between ${className}`}>
    {children}
  </div>
);
