import React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { CheckCircle2, Truck, AlertCircle, FileSpreadsheet } from 'lucide-react';

export interface RoyalCourierDispatchConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  isDispatching: boolean;
  onConfirmDispatched: () => Promise<void>;
}

export const RoyalCourierDispatchConfirmDialog: React.FC<RoyalCourierDispatchConfirmDialogProps> = ({
  isOpen,
  onClose,
  selectedCount,
  isDispatching,
  onConfirmDispatched,
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!isDispatching) onClose();
      }}
      title="Royal Courier Excel Downloaded"
      description="Manifest downloaded successfully. Finalize dispatch status update."
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Success Alert Banner */}
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-900">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <strong className="block text-sm font-bold text-emerald-950">
              The Royal Courier Excel sheet has been downloaded.
            </strong>
            <p className="mt-0.5 text-emerald-800">
              The dispatch manifest with {selectedCount} order{selectedCount === 1 ? '' : 's'} has been saved to your computer.
            </p>
          </div>
        </div>

        {/* Dispatch Confirmation Question */}
        <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-purple-900 text-sm">
            <Truck className="w-4 h-4 text-purple-600" />
            <span>Do you want to confirm {selectedCount === 1 ? 'this order' : `these ${selectedCount} orders`} as dispatched?</span>
          </div>
          <p className="text-purple-800 text-[11px] leading-relaxed">
            Confirming will mark {selectedCount === 1 ? 'this order' : 'all selected orders'} as <strong>DISPATCHED</strong> in the database and advance inventory stock accordingly.
          </p>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>If you cancel, the orders will remain in the Interested list unchanged.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isDispatching}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={onConfirmDispatched}
            isLoading={isDispatching}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
            className="bg-purple-600 hover:bg-purple-700 font-bold"
          >
            Confirm Dispatch
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
