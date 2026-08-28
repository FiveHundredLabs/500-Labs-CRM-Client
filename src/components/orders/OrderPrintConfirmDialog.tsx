import React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';

export interface OrderPrintConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onClearSelection: () => void;
}

export const OrderPrintConfirmDialog: React.FC<OrderPrintConfirmDialogProps> = ({
  isOpen,
  onClose,
  onClearSelection,
}) => {
  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Print Job Dispatched"
      description="Generated billing-slip PDF launched for selected orders."
      maxWidth="sm"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          Print preview has been sent to the printer. Would you like to clear the current selection?
        </p>
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Keep Selection
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onClearSelection();
              onClose();
            }}
          >
            Clear Selection
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
