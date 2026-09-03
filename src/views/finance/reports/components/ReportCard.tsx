import React from 'react';
import { ReportDefinition } from '../types';
import { ArrowRight } from 'lucide-react';

interface ReportCardProps {
  report: ReportDefinition;
  onClick: () => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({ report, onClick }) => {
  const Icon = report.icon;

  const getBadgeStyle = (badgeType?: string) => {
    switch (badgeType) {
      case 'executive':
        return 'bg-purple-50 text-purple-700 border-purple-200/80';
      case 'analytical':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
      case 'standard':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200/80';
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col justify-between bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
    >
      {/* Top subtle highlight line on hover */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      <div className="space-y-3">
        {/* Card Header: Icon & Badge */}
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-blue-50/90 text-blue-600 border border-blue-100/90 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
            <Icon className="w-5 h-5" />
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getBadgeStyle(
              report.badgeType
            )}`}
          >
            {report.badgeText}
          </span>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors duration-150 line-clamp-1">
            {report.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
            {report.description}
          </p>
        </div>
      </div>

      {/* Card Footer: Metadata and Interactive Call to Action */}
      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="font-mono text-[11px] text-slate-400 font-medium">
          {report.id}
        </span>

        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
          <span>View Report</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </div>
    </div>
  );
};
