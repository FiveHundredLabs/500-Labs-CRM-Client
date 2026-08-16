import React from 'react';
import { FileDown, Printer } from 'lucide-react';

export interface PrintFloatingPanelProps {
  selectedCount: number;
  onDownloadPDF: () => void;
  onNativePrint: () => void;
  extraActions?: React.ReactNode;
  countLabel?: string;
}

export const PrintFloatingPanel: React.FC<PrintFloatingPanelProps> = ({
  selectedCount,
  onDownloadPDF,
  onNativePrint,
  extraActions,
  countLabel = 'Selected',
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed right-3 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:right-6 md:bottom-6 z-30 pointer-events-auto">
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-2 rounded-xl shadow-2xl border border-slate-700/60 flex flex-col items-center gap-1.5 min-w-[150px]">
        {/* Top Line: Selected Count */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-200 px-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span>
            {selectedCount} {countLabel}
          </span>
        </div>

        {/* Bottom Line: Extra Actions, PDF & Print Buttons */}
        <div className="flex items-center gap-1.5 w-full pt-1.5 border-t border-slate-700/60">
          {extraActions}

          <button
            type="button"
            onClick={onDownloadPDF}
            className="flex-1 py-1 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 border border-slate-600/60 cursor-pointer"
            title="Download PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={onNativePrint}
            className="flex-1 py-1 px-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-xs border border-blue-400/20 cursor-pointer"
            title="Print Billing Slips"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};
