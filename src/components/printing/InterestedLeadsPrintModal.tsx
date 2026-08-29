import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { LeadPrintItem, BillingSlipPrintSheet } from './BillingSlipPrintSheet';
import { Printer, FileText, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { printBillingPDF } from '../../utils/pdfGenerator';
import { CircularProgressPdfModal } from './CircularProgressPdfModal';

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
  const [pdfProgress, setPdfProgress] = useState({
    isOpen: false,
    title: 'Preparing Billing Slips for Printing...',
    subtitle: '',
    current: 0,
    total: 0,
    percentage: 0,
    actionType: 'PRINT' as 'DOWNLOAD' | 'PRINT',
  });

  const handlePrint = async () => {
    setPdfProgress({
      isOpen: true,
      title: 'Preparing Billing Slips for Printing...',
      subtitle: `Assembling ${items.length} billing slip(s)...`,
      current: 0,
      total: items.length,
      percentage: 0,
      actionType: 'PRINT',
    });
    try {
      await printBillingPDF(items, (curr, tot, pct) => {
        setPdfProgress((prev) => ({
          ...prev,
          current: curr,
          total: tot,
          percentage: pct,
          subtitle: `Rendering high-resolution slip ${curr} of ${tot}...`,
        }));
      });
      if (onPrintExecuted) {
        onPrintExecuted();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate billing print document.');
    } finally {
      setPdfProgress((prev) => ({ ...prev, isOpen: false }));
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Print Billing Details & COD Slips"
      description={`A4 Landscape 4-up Layout - ${items.length} Selected Leads`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">A4 Landscape 4-up Billing Layout</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                {Math.ceil(items.length / 4)} sheet(s), up to 4 slips per sheet
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

        <div className="flex items-center gap-2 text-xs text-slate-600 px-1">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span>Ready to print <strong>{items.length}</strong> billing slip(s) on A4 landscape sheets.</span>
        </div>

        <div className="overflow-x-auto p-4 bg-slate-200/70 border border-slate-300 rounded-xl max-h-[60vh] flex justify-center">
          <div className="transform scale-[0.25] sm:scale-[0.34] md:scale-[0.42] origin-top">
            <BillingSlipPrintSheet items={items} />
          </div>
        </div>
      </div>

      <CircularProgressPdfModal {...pdfProgress} />
    </Dialog>
  );
};
