import React from 'react';
import { ReportDefinition } from '../types';
import { ArrowRight } from 'lucide-react';

interface ReportCardProps {
  report: ReportDefinition;
  onClick: () => void;
}

interface ReportTheme {
  gradient: string;
  cardBg: string;
  cardBorder: string;
  hoverBorder: string;
  hoverGlow: string;
  iconBg: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  titleHover: string;
  accentBtn: string;
  accentBtnHover: string;
}

const REPORT_THEMES: Record<string, ReportTheme> = {
  // Finance Reports
  'expense-summary': {
    gradient: 'from-rose-500 via-pink-500 to-rose-600',
    cardBg: 'bg-gradient-to-b from-rose-50/50 via-white to-white',
    cardBorder: 'border-rose-100',
    hoverBorder: 'hover:border-rose-300',
    hoverGlow: 'hover:shadow-rose-100/70',
    iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/25',
    badgeBg: 'bg-rose-100/90',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
    titleHover: 'group-hover:text-rose-600',
    accentBtn: 'text-rose-600',
    accentBtnHover: 'group-hover:text-rose-700',
  },
  'operating-expense': {
    gradient: 'from-purple-500 via-indigo-500 to-violet-600',
    cardBg: 'bg-gradient-to-b from-purple-50/50 via-white to-white',
    cardBorder: 'border-purple-100',
    hoverBorder: 'hover:border-purple-300',
    hoverGlow: 'hover:shadow-purple-100/70',
    iconBg: 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/25',
    badgeBg: 'bg-purple-100/90',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    titleHover: 'group-hover:text-purple-600',
    accentBtn: 'text-purple-600',
    accentBtnHover: 'group-hover:text-purple-700',
  },
  'income-summary': {
    gradient: 'from-emerald-500 via-teal-500 to-[#80BD2B]',
    cardBg: 'bg-gradient-to-b from-emerald-50/50 via-white to-white',
    cardBorder: 'border-emerald-100',
    hoverBorder: 'hover:border-emerald-300',
    hoverGlow: 'hover:shadow-emerald-100/70',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-[#80BD2B] text-white shadow-md shadow-emerald-500/25',
    badgeBg: 'bg-emerald-100/90',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-200',
    titleHover: 'group-hover:text-emerald-600',
    accentBtn: 'text-emerald-600',
    accentBtnHover: 'group-hover:text-emerald-700',
  },
  'cash-flow': {
    gradient: 'from-[#01A8F3] via-sky-500 to-blue-600',
    cardBg: 'bg-gradient-to-b from-[#E8F7FE]/60 via-white to-white',
    cardBorder: 'border-[#B9E7FC]',
    hoverBorder: 'hover:border-[#01A8F3]',
    hoverGlow: 'hover:shadow-sky-100/80',
    iconBg: 'bg-gradient-to-br from-[#01A8F3] to-[#0188C7] text-white shadow-md shadow-sky-500/25',
    badgeBg: 'bg-[#E8F7FE]',
    badgeText: 'text-[#0188C7]',
    badgeBorder: 'border-[#B9E7FC]',
    titleHover: 'group-hover:text-[#0188C7]',
    accentBtn: 'text-[#0188C7]',
    accentBtnHover: 'group-hover:text-[#016DA0]',
  },
  'product-cost': {
    gradient: 'from-blue-600 via-indigo-600 to-cyan-500',
    cardBg: 'bg-gradient-to-b from-blue-50/50 via-white to-white',
    cardBorder: 'border-blue-100',
    hoverBorder: 'hover:border-blue-300',
    hoverGlow: 'hover:shadow-blue-100/70',
    iconBg: 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/25',
    badgeBg: 'bg-blue-100/90',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-200',
    titleHover: 'group-hover:text-blue-600',
    accentBtn: 'text-blue-600',
    accentBtnHover: 'group-hover:text-blue-700',
  },
  'petty-cash': {
    gradient: 'from-amber-500 via-yellow-500 to-orange-500',
    cardBg: 'bg-gradient-to-b from-amber-50/50 via-white to-white',
    cardBorder: 'border-amber-100',
    hoverBorder: 'hover:border-amber-300',
    hoverGlow: 'hover:shadow-amber-100/70',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25',
    badgeBg: 'bg-amber-100/90',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    titleHover: 'group-hover:text-amber-600',
    accentBtn: 'text-amber-600',
    accentBtnHover: 'group-hover:text-amber-700',
  },

  // Sales Reports (In exact ordered sequence)
  'consignment-sales': {
    gradient: 'from-indigo-600 via-violet-600 to-blue-600',
    cardBg: 'bg-gradient-to-b from-indigo-50/50 via-white to-white',
    cardBorder: 'border-indigo-100',
    hoverBorder: 'hover:border-indigo-300',
    hoverGlow: 'hover:shadow-indigo-100/70',
    iconBg: 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25',
    badgeBg: 'bg-indigo-100/90',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    titleHover: 'group-hover:text-indigo-600',
    accentBtn: 'text-indigo-600',
    accentBtnHover: 'group-hover:text-indigo-700',
  },
  'contact-batch-report': {
    gradient: 'from-[#01A8F3] via-[#0188C7] to-[#80BD2B]',
    cardBg: 'bg-gradient-to-b from-sky-50/60 via-white to-lime-50/30',
    cardBorder: 'border-[#B9E7FC]',
    hoverBorder: 'hover:border-[#01A8F3]',
    hoverGlow: 'hover:shadow-sky-100/80',
    iconBg: 'bg-gradient-to-br from-[#01A8F3] to-[#80BD2B] text-white shadow-md shadow-sky-500/25',
    badgeBg: 'bg-[#E8F7FE]',
    badgeText: 'text-[#0188C7]',
    badgeBorder: 'border-[#B9E7FC]',
    titleHover: 'group-hover:text-[#0188C7]',
    accentBtn: 'text-[#0188C7]',
    accentBtnHover: 'group-hover:text-[#016DA0]',
  },
  'team-member-sales': {
    gradient: 'from-[#80BD2B] via-[#547E1B] to-emerald-600',
    cardBg: 'bg-gradient-to-b from-lime-50/50 via-white to-white',
    cardBorder: 'border-[#D4ECC6]',
    hoverBorder: 'hover:border-[#80BD2B]',
    hoverGlow: 'hover:shadow-lime-100/70',
    iconBg: 'bg-gradient-to-br from-[#80BD2B] to-[#547E1B] text-white shadow-md shadow-lime-500/25',
    badgeBg: 'bg-[#F2F9E9]',
    badgeText: 'text-[#547E1B]',
    badgeBorder: 'border-[#D4ECC6]',
    titleHover: 'group-hover:text-[#547E1B]',
    accentBtn: 'text-[#547E1B]',
    accentBtnHover: 'group-hover:text-[#3B5B13]',
  },
  'city-delivery': {
    gradient: 'from-teal-500 via-cyan-500 to-emerald-500',
    cardBg: 'bg-gradient-to-b from-teal-50/50 via-white to-white',
    cardBorder: 'border-teal-100',
    hoverBorder: 'hover:border-teal-300',
    hoverGlow: 'hover:shadow-teal-100/70',
    iconBg: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/25',
    badgeBg: 'bg-teal-100/90',
    badgeText: 'text-teal-800',
    badgeBorder: 'border-teal-200',
    titleHover: 'group-hover:text-teal-600',
    accentBtn: 'text-teal-600',
    accentBtnHover: 'group-hover:text-teal-700',
  },
  'daily-sales': {
    gradient: 'from-sky-400 via-blue-500 to-indigo-500',
    cardBg: 'bg-gradient-to-b from-sky-50/50 via-white to-white',
    cardBorder: 'border-sky-100',
    hoverBorder: 'hover:border-sky-300',
    hoverGlow: 'hover:shadow-sky-100/70',
    iconBg: 'bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/25',
    badgeBg: 'bg-sky-100/90',
    badgeText: 'text-sky-800',
    badgeBorder: 'border-sky-200',
    titleHover: 'group-hover:text-sky-600',
    accentBtn: 'text-sky-600',
    accentBtnHover: 'group-hover:text-sky-700',
  },
  'weekly-sales': {
    gradient: 'from-purple-500 via-fuchsia-500 to-pink-500',
    cardBg: 'bg-gradient-to-b from-purple-50/50 via-white to-white',
    cardBorder: 'border-purple-100',
    hoverBorder: 'hover:border-purple-300',
    hoverGlow: 'hover:shadow-purple-100/70',
    iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-md shadow-purple-500/25',
    badgeBg: 'bg-purple-100/90',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-200',
    titleHover: 'group-hover:text-purple-600',
    accentBtn: 'text-purple-600',
    accentBtnHover: 'group-hover:text-purple-700',
  },
  'monthly-sales': {
    gradient: 'from-emerald-600 via-teal-600 to-[#80BD2B]',
    cardBg: 'bg-gradient-to-b from-emerald-50/50 via-white to-white',
    cardBorder: 'border-emerald-100',
    hoverBorder: 'hover:border-emerald-300',
    hoverGlow: 'hover:shadow-emerald-100/70',
    iconBg: 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-500/25',
    badgeBg: 'bg-emerald-100/90',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-200',
    titleHover: 'group-hover:text-emerald-700',
    accentBtn: 'text-emerald-700',
    accentBtnHover: 'group-hover:text-emerald-800',
  },
};

const DEFAULT_THEME: ReportTheme = {
  gradient: 'from-[#01A8F3] via-blue-500 to-[#80BD2B]',
  cardBg: 'bg-gradient-to-b from-sky-50/50 via-white to-white',
  cardBorder: 'border-slate-200',
  hoverBorder: 'hover:border-[#01A8F3]',
  hoverGlow: 'hover:shadow-sky-100/50',
  iconBg: 'bg-gradient-to-br from-[#01A8F3] to-[#0188C7] text-white shadow-md shadow-sky-500/25',
  badgeBg: 'bg-slate-100',
  badgeText: 'text-slate-700',
  badgeBorder: 'border-slate-200',
  titleHover: 'group-hover:text-[#0188C7]',
  accentBtn: 'text-[#0188C7]',
  accentBtnHover: 'group-hover:text-[#016DA0]',
};

export const ReportCard: React.FC<ReportCardProps> = ({ report, onClick }) => {
  const Icon = report.icon;
  const theme = REPORT_THEMES[report.id] || DEFAULT_THEME;

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col justify-between ${theme.cardBg} rounded-2xl border ${theme.cardBorder} p-5 shadow-xs hover:shadow-lg ${theme.hoverGlow} ${theme.hoverBorder} hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden`}
    >
      {/* Dynamic Themed Top Accent Gradient Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient} transition-all duration-200 group-hover:h-1.5`} />

      <div className="space-y-3.5 relative z-10">
        {/* Card Header: Dynamic Glowing Icon & Badge */}
        <div className="flex items-center justify-between gap-2">
          <div
            className={`w-11 h-11 rounded-xl ${theme.iconBg} flex items-center justify-center transition-all duration-200 group-hover:scale-105`}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shadow-2xs ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
          >
            {report.badgeText}
          </span>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className={`text-sm sm:text-base font-extrabold text-slate-900 ${theme.titleHover} transition-colors duration-150 line-clamp-1`}>
            {report.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
            {report.description}
          </p>
        </div>
      </div>

      {/* Card Footer: Slug & Action Link */}
      <div className="pt-3.5 mt-4 border-t border-slate-100/90 flex items-center justify-between text-xs relative z-10">
        <span className="font-mono text-[11px] text-slate-400 font-medium">
          {report.id}
        </span>

        <span
          className={`inline-flex items-center gap-1.5 text-xs font-bold ${theme.accentBtn} ${theme.accentBtnHover} transition-colors`}
        >
          <span>View Report</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </div>
    </div>
  );
};
