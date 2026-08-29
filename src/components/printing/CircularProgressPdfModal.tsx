import React from 'react';
import { FileText, Printer } from 'lucide-react';

export interface CircularProgressPdfModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  current: number;
  total: number;
  percentage: number;
  actionType?: 'DOWNLOAD' | 'PRINT';
}

export const CircularProgressPdfModal: React.FC<CircularProgressPdfModalProps> = ({
  isOpen,
  title = 'Generating Billing Slips PDF...',
  subtitle,
  current,
  total,
  percentage,
  actionType = 'DOWNLOAD',
}) => {
  if (!isOpen) return null;

  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const safePercent = Math.max(0, Math.min(100, percentage));
  const strokeDashoffset = circumference - (safePercent / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-6 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
        
        {/* Animated Circular Progress Ring */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Background Ambient Glow */}
          <div className="absolute inset-0 rounded-full bg-blue-500/10 filter blur-md animate-pulse" />
          
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
            {/* Background Track */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="text-slate-100"
              strokeWidth="9"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Animated Progress Arc */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="url(#progress-gradient)"
              fill="transparent"
              className="transition-all duration-300 ease-out"
            />
            <defs>
              <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center Info Pill */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {safePercent > 0 ? (
              <>
                <span className="font-mono font-black text-2xl text-slate-900 leading-none tracking-tight">
                  {safePercent}%
                </span>
                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                  {total > 0 ? `${current}/${total}` : 'Rendering'}
                </span>
              </>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center animate-bounce">
                {actionType === 'PRINT' ? (
                  <Printer className="w-5 h-5" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-1">
          <h3 className="font-bold text-base text-slate-900">
            {title}
          </h3>
          <p className="text-xs text-slate-500 font-medium max-w-[260px] mx-auto">
            {subtitle || (
              total > 0
                ? `Rendering high-resolution slip ${current} of ${total}...`
                : 'Assembling high-resolution print pages...'
            )}
          </p>
        </div>

        {/* Subtle Indicator Bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-linear-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${safePercent}%` }}
          />
        </div>

        <div className="text-[11px] text-slate-400 font-medium">
          Please wait a moment while the document is prepared.
        </div>
      </div>
    </div>
  );
};
