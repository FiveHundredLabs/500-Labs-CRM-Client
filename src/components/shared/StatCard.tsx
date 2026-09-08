import React from 'react';

export type StatCardAccentColor =
  | 'blue'
  | 'green'
  | 'amber'
  | 'purple'
  | 'red'
  | 'teal'
  | 'indigo'
  | 'slate'
  | 'sales'
  | 'dispatched'
  | 'delivered'
  | 'interested'
  | 'expenses';

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
  accentColor?: StatCardAccentColor;
  variant?: 'standard' | 'vibrant';
  onClick?: () => void;
}

// Flat Solid Colors Map across the entire CRM system
const flatColorMap: Record<
  string,
  {
    bg: string;
    border: string;
    badge: string;
    titleColor: string;
    subtitleColor: string;
  }
> = {
  // Gross Sales & Green KPIs: Level Grow Primary Green (#80BD2B)
  sales: {
    bg: 'bg-[#80BD2B]',
    border: 'border-[#71A924]/40 hover:border-white/50',
    badge: 'bg-white/20 text-white border border-white/30',
    titleColor: 'text-white/90',
    subtitleColor: 'text-white/80',
  },
  green: {
    bg: 'bg-[#80BD2B]',
    border: 'border-[#71A924]/40 hover:border-white/50',
    badge: 'bg-white/20 text-white border border-white/30',
    titleColor: 'text-white/90',
    subtitleColor: 'text-white/80',
  },
  // Dispatched & Blue KPIs: Level Grow Primary Blue (#01A8F3)
  dispatched: {
    bg: 'bg-[#01A8F3]',
    border: 'border-[#0096DC]/40 hover:border-white/50',
    badge: 'bg-white/20 text-white border border-white/30',
    titleColor: 'text-white/90',
    subtitleColor: 'text-white/80',
  },
  blue: {
    bg: 'bg-[#01A8F3]',
    border: 'border-[#0096DC]/40 hover:border-white/50',
    badge: 'bg-white/20 text-white border border-white/30',
    titleColor: 'text-white/90',
    subtitleColor: 'text-white/80',
  },
  // Delivered & Teal KPIs: Solid Vibrant Teal (#0D9488)
  delivered: {
    bg: 'bg-[#0D9488]',
    border: 'border-[#0F766E]/40 hover:border-white/50',
    badge: 'bg-white/20 text-white border border-white/30',
    titleColor: 'text-white/90',
    subtitleColor: 'text-white/80',
  },
  teal: {
    bg: 'bg-[#0D9488]',
    border: 'border-[#0F766E]/40 hover:border-white/50',
    badge: 'bg-white/20 text-white border border-white/30',
    titleColor: 'text-white/90',
    subtitleColor: 'text-white/80',
  },
  // Interested & Indigo / Royal Blue KPIs: Solid Royal Blue (#2563EB)
  interested: {
    bg: 'bg-[#2563EB]',
    border: 'border-[#1D4ED8]/40 hover:border-white/50',
    badge: 'bg-white/20 text-white border border-white/30',
    titleColor: 'text-white/90',
    subtitleColor: 'text-white/80',
  },
  indigo: {
    bg: 'bg-[#2563EB]',
    border: 'border-[#1D4ED8]/40 hover:border-white/50',
    badge: 'bg-white/20 text-white border border-white/30',
    titleColor: 'text-white/90',
    subtitleColor: 'text-white/80',
  },
  // Expenses & Slate KPIs: Deep Slate / Executive Navy (#1E293B)
  expenses: {
    bg: 'bg-[#1E293B]',
    border: 'border-slate-700 hover:border-slate-500',
    badge: 'bg-white/15 text-white border border-white/25',
    titleColor: 'text-white/90',
    subtitleColor: 'text-slate-300/85',
  },
  slate: {
    bg: 'bg-[#1E293B]',
    border: 'border-slate-700 hover:border-slate-500',
    badge: 'bg-white/15 text-white border border-white/25',
    titleColor: 'text-white/90',
    subtitleColor: 'text-slate-300/85',
  },
  // Amber / Orange KPIs: Solid Amber (#D97706)
  amber: {
    bg: 'bg-[#D97706]',
    border: 'border-[#B45309]/40 hover:border-white/50',
    badge: 'bg-white/20 text-white border border-white/30',
    titleColor: 'text-white/90',
    subtitleColor: 'text-white/80',
  },
  // Purple KPIs: Solid Purple (#7C3AED)
  purple: {
    bg: 'bg-[#7C3AED]',
    border: 'border-[#6D28D9]/40 hover:border-white/50',
    badge: 'bg-white/20 text-white border border-white/30',
    titleColor: 'text-white/90',
    subtitleColor: 'text-white/80',
  },
  // Red / Rose KPIs: Solid Crimson Red (#E11D48)
  red: {
    bg: 'bg-[#E11D48]',
    border: 'border-[#BE123C]/40 hover:border-white/50',
    badge: 'bg-white/20 text-white border border-white/30',
    titleColor: 'text-white/90',
    subtitleColor: 'text-white/80',
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
  onClick,
}) => {
  const scheme = flatColorMap[accentColor] || flatColorMap.blue;

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl p-4 sm:p-5 text-white transition-all duration-200 flex flex-col justify-between border shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${scheme.bg} ${scheme.border} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Top Header Row: Title & Glassmorphic Icon */}
      <div className="flex items-start justify-between gap-2">
        <span
          className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${scheme.titleColor} line-clamp-1`}
        >
          {title}
        </span>
        {icon && (
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-xs transition-transform duration-200 group-hover:scale-105 [&_svg]:w-5 [&_svg]:h-5 [&_svg]:text-white [&_svg]:stroke-current ${scheme.badge}`}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value & Supporting Information */}
      <div className="mt-3 sm:mt-4">
        <div className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-white tracking-tight font-sans truncate">
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] sm:text-xs">
            {trend && (
              <span
                className={`font-bold px-1.5 py-0.5 rounded-md text-[10px] sm:text-[11px] backdrop-blur-xs ${
                  trend.isPositive !== false
                    ? 'bg-white/25 text-white border border-white/30'
                    : 'bg-black/30 text-rose-100 border border-rose-300/40'
                }`}
              >
                {trend.isPositive !== false ? '↑' : '↓'} {trend.value}
              </span>
            )}
            {subtitle && (
              <span className={`font-medium truncate ${scheme.subtitleColor}`}>
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


