import React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';

export interface InterestedPdfConfirmDialogProps {
  isOpen: boolean;
  selectedCount: number;
  isDispatching: boolean;
  onClose: () => void;
  onConfirmDispatched: () => Promise<void>;
}

export const InterestedPdfConfirmDialog: React.FC<InterestedPdfConfirmDialogProps> = ({
  isOpen,
  selectedCount,
  isDispatching,
  onClose,
  onConfirmDispatched,
}) => {
  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="PDF Downloaded Successfully"
      description="Update order status for downloaded billing slips"
      maxWidth="sm"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          The PDF billing slips file has been downloaded. Would you like to transition the <strong>{selectedCount}</strong> selected lead(s) from <strong>INTERESTED</strong> to <strong>DISPATCHED</strong>?
        </p>
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isDispatching}
          >
            Keep as Interested
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirmDispatched}
            isLoading={isDispatching}
          >
            Change Status to Dispatched
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
