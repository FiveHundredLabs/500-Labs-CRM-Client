import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
  accentColor?: 'blue' | 'green' | 'amber' | 'purple' | 'red';
}

const colorMap = {
  blue: {
    badge: 'bg-blue-500/10 text-blue-600 border border-blue-500/20 shadow-xs shadow-blue-500/10',
    topBar: 'bg-gradient-to-r from-blue-500 to-indigo-500',
    glow: 'group-hover:border-blue-300/80',
  },
  green: {
    badge: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-xs shadow-emerald-500/10',
    topBar: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    glow: 'group-hover:border-emerald-300/80',
  },
  amber: {
    badge: 'bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-xs shadow-amber-500/10',
    topBar: 'bg-gradient-to-r from-amber-500 to-orange-500',
    glow: 'group-hover:border-amber-300/80',
  },
  purple: {
    badge: 'bg-purple-500/10 text-purple-600 border border-purple-500/20 shadow-xs shadow-purple-500/10',
    topBar: 'bg-gradient-to-r from-purple-500 to-fuchsia-500',
    glow: 'group-hover:border-purple-300/80',
  },
  red: {
    badge: 'bg-rose-500/10 text-rose-600 border border-rose-500/20 shadow-xs shadow-rose-500/10',
    topBar: 'bg-gradient-to-r from-rose-500 to-red-500',
    glow: 'group-hover:border-rose-300/80',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className = '',
  accentColor = 'blue',
}) => {
  const scheme = colorMap[accentColor] || colorMap.blue;

  return (
    <div
      className={`group relative overflow-hidden bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between ${scheme.glow} ${className}`}
    >
      {/* Top radiant accent gradient line */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${scheme.topBar}`} />

      <div className="flex items-start justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
        {icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-200 ${scheme.badge}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">{value}</div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
            {trend && (
              <span
                className={`font-bold px-1.5 py-0.5 rounded-md text-[11px] ${
                  trend.isPositive !== false
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    : 'bg-red-50 text-red-700 border border-red-200/60'
                }`}
              >
                {trend.isPositive !== false ? '↑' : '↓'} {trend.value}
              </span>
            )}
            {subtitle && <span className="text-slate-500 font-medium">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
