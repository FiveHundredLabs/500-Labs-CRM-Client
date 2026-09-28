import React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { AlertTriangle, Clock, Cpu } from 'lucide-react';

export interface LargeBatchWarningDialogProps {
  isOpen: boolean;
  count: number;
  actionType: 'DOWNLOAD' | 'PRINT';
  onClose: () => void;
  onConfirm: () => void;
}

export const LargeBatchWarningDialog: React.FC<LargeBatchWarningDialogProps> = ({
  isOpen,
  count,
  actionType,
  onClose,
  onConfirm,
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="High Volume Bills Notice"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Warning Callout Box */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs text-amber-900 leading-relaxed">
            <p className="font-bold text-sm text-amber-950">
              Generating {count} bills at once
            </p>
            <p>
              This may take some time, and your device may become slightly slower while processing.
              You currently have <strong className="font-black text-amber-950 underline">{count} bills</strong> to arrange and generate. Do you want to continue?
            </p>
          </div>
        </div>

        {/* Helpful context */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
            <Clock className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Estimated time: ~{Math.ceil(count * 0.4)}–{Math.ceil(count * 0.8)}s</span>
          </div>
          <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
            <Cpu className="w-4 h-4 text-purple-500 shrink-0" />
            <span>High-resolution canvas rendering</span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
          >
            Yes, Continue {actionType === 'DOWNLOAD' ? 'Download' : 'Print'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
