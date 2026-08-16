import React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { LeadPrintItem, A4BillingPrintSheet } from './A4BillingPrintSheet';
import { Printer, FileText, CheckCircle } from 'lucide-react';

export interface InterestedLeadsPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: LeadPrintItem[];
  onPrintExecuted?: () => void;
}

export const InterestedLeadsPrintModal: React.FC<InterestedLeadsPrintModalProps> = ({
  isOpen,
  onClose,
  items,
  onPrintExecuted,
}) => {
  const handlePrint = () => {
    window.print();
    if (onPrintExecuted) {
      onPrintExecuted();
    }
  };

  const totalSheets = Math.ceil(items.length / 4);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Print Billing Details & COD Slips"
      description={`A4 Landscape Sheet Layout (4 × A6 Slips Per Sheet) • ${items.length} Selected Leads`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Inject CSS print styles specifically for A4 Landscape Billing Slips */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            .print-billing-container, .print-billing-container * {
              visibility: visible !important;
            }
            .print-billing-container {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            @page {
              size: A4 landscape;
              margin: 0;
            }
          }
        `}</style>

        {/* Print Bar Controls Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">A6 Landscape Billing Layout</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                {items.length} Billing Slips ({totalSheets} A4 Landscape {totalSheets === 1 ? 'Sheet' : 'Sheets'})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
            >
              Print Slips ({items.length})
            </Button>
          </div>
        </div>

        {/* Selection Summary Badges */}
        <div className="flex items-center gap-2 text-xs text-slate-600 px-1">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span>Ready to print <strong>{items.length}</strong> billing slips on <strong>{totalSheets}</strong> physical A4 landscape page(s).</span>
        </div>

        {/* Scrollable Print Sheet Preview */}
        <div className="overflow-x-auto p-4 bg-slate-200/70 border border-slate-300 rounded-xl max-h-[60vh] flex justify-center">
          <div className="transform scale-[0.55] sm:scale-75 md:scale-85 origin-top">
            <A4BillingPrintSheet items={items} />
          </div>
        </div>
      </div>
    </Dialog>
  );
};
