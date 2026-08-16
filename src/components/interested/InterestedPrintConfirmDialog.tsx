import React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';

export interface InterestedPrintConfirmDialogProps {
  isOpen: boolean;
  selectedCount: number;
  isDispatching: boolean;
  onClose: () => void;
  onConfirmDispatched: () => Promise<void>;
}

export const InterestedPrintConfirmDialog: React.FC<InterestedPrintConfirmDialogProps> = ({
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
      title="Printing Completed?"
      description="Would you like to mark the selected leads as Dispatched?"
      maxWidth="sm"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          Marking as Dispatched will transition <strong>{selectedCount}</strong> lead(s) from <strong>INTERESTED</strong> to <strong>DISPATCHED</strong> and remove them from the active list.
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
            Mark as Dispatched
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
