import React, { useState } from 'react';
import type { OrderStatus } from '../../models/domain';
import { Dialog } from '../ui/Dialog';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

export interface BulkStatusChangeDialogProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: (bulkTargetStatus: OrderStatus) => Promise<boolean>;
}

export const BulkStatusChangeDialog: React.FC<BulkStatusChangeDialogProps> = ({
  isOpen,
  selectedCount,
  onClose,
  onConfirm,
}) => {
  const [bulkTargetStatus, setBulkTargetStatus] = useState<OrderStatus>('DELIVERED');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBulkUpdating(true);
    try {
      const success = await onConfirm(bulkTargetStatus);
      if (success) {
        onClose();
      }
    } finally {
      setIsBulkUpdating(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Bulk Status Change (${selectedCount} Orders)`}
      description="Update the status of all currently selected orders at once."
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
          Note: Bulk status updates do not ask for individual remarks. The selected status will be applied directly to all {selectedCount} selected orders.
        </div>

        <Select
          label="New Status for Selected Orders *"
          value={bulkTargetStatus}
          onChange={(e) => setBulkTargetStatus(e.target.value as OrderStatus)}
          options={[
            { value: 'DELIVERED', label: 'Mark as DELIVERED' },
            { value: 'REJECTED', label: 'Mark as REJECTED' },
            { value: 'DISPATCHED', label: 'Mark as DISPATCHED' },
          ]}
        />

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isBulkUpdating}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isBulkUpdating}
          >
            Apply Bulk Status Change
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
