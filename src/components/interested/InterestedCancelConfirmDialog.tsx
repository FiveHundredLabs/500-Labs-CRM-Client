import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Customer, User } from '../../models/domain';
import { AlertTriangle, XCircle, ShieldAlert } from 'lucide-react';

interface InterestedCancelConfirmDialogProps {
  isOpen: boolean;
  selectedCustomers: Customer[];
  membersMap: Record<string, User>;
  onClose: () => void;
  onConfirmCancel: (reason: string) => Promise<boolean>;
}

export const InterestedCancelConfirmDialog: React.FC<InterestedCancelConfirmDialogProps> = ({
  isOpen,
  selectedCustomers,
  membersMap,
  onClose,
  onConfirmCancel,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('Duplicate lead / Supervisor review');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const REQUIRED_KEYWORD = 'CANCEL';
  const isMatch = confirmText.trim().toUpperCase() === REQUIRED_KEYWORD;
  const count = selectedCustomers.length;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatch || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const success = await onConfirmCancel(reason);
      if (success) {
        setConfirmText('');
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    if (isSubmitting) return;
    setConfirmText('');
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Cancel Interested Lead(s) &amp; Order(s)"
      description={`Strict verification required to cancel ${count} selected lead${count === 1 ? '' : 's'}`}
      maxWidth="md"
    >
      <form onSubmit={handleConfirm} className="space-y-4">
        {/* GitHub Style High-Severity Warning Banner */}
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-rose-950 text-xs shadow-2xs">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-sm font-bold text-rose-900">
                Are you absolutely sure?
              </strong>
              <p className="mt-1 text-rose-800 leading-relaxed">
                This action will mark <strong>{count} lead{count === 1 ? '' : 's'} / order{count === 1 ? '' : 's'}</strong> as{' '}
                <span className="font-mono font-bold bg-rose-200/80 px-1 py-0.5 rounded text-rose-950">CANCELLED</span>.
                They will be excluded from billing dispatch and archived under cancelled history.
              </p>
            </div>
          </div>
        </div>

        {/* Selected Leads Preview */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Selected Lead{count === 1 ? '' : 's'} to Cancel:
          </label>
          <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            {selectedCustomers.map((cust) => {
              const rep = membersMap[cust.responsibleTeamMemberId];
              return (
                <div
                  key={cust.id}
                  className="flex items-center justify-between gap-2 p-1.5 bg-white border border-slate-200/80 rounded"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 truncate block">{cust.fullName}</span>
                    <span className="font-mono text-[11px] text-slate-500">{cust.phone}</span>
                  </div>
                  {rep && (
                    <span className="text-[10px] text-slate-600 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                      Rep: {rep.fullName}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cancellation Reason Input */}
        <div>
          <Input
            label="Cancellation Reason / Remark"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Duplicate order / customer requested cancellation"
            required
          />
        </div>

        {/* GitHub Style Keyword Verification */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="block text-xs text-slate-700">
            To confirm cancellation, type <strong className="font-mono text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 select-all">{REQUIRED_KEYWORD}</strong> in the box below:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`Type ${REQUIRED_KEYWORD} to enable confirmation`}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-mono tracking-wider"
            autoFocus
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleModalClose}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            Keep Leads
          </Button>

          <Button
            type="submit"
            variant="danger"
            size="sm"
            disabled={!isMatch || isSubmitting}
            isLoading={isSubmitting}
            className="cursor-pointer font-bold shadow-xs flex items-center gap-1.5"
          >
            <span>cancel {count} lead{count === 1 ? '' : 's'}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
