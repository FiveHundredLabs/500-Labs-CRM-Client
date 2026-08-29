import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ShieldCheck, Hash, Phone, MapPin, AlertCircle, Layers } from 'lucide-react';

export interface ContactPreviewInfo {
  phone?: string;
  city?: string;
  secondaryMobile?: string;
  assigneeName?: string;
  source?: string;
  batchCount?: number;
  customTitle?: string;
  customDescription?: string;
}

export interface ContactCodeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactInfo: ContactPreviewInfo | null;
  onConfirm: (code: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export const ContactCodeConfirmationModal: React.FC<ContactCodeConfirmationModalProps> = ({
  isOpen,
  onClose,
  contactInfo,
  onConfirm,
  isSubmitting = false,
}) => {
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!contactInfo) return null;

  const isBulk = Boolean(contactInfo.batchCount && contactInfo.batchCount > 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim();

    if (!cleanCode) {
      setErrorMessage('Please enter the unique contact code before continuing.');
      return;
    }

    if (cleanCode.length < 2) {
      setErrorMessage('Contact code must be at least 2 characters long.');
      return;
    }

    setErrorMessage('');
    try {
      await onConfirm(cleanCode);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save contact with provided code.');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title={contactInfo.customTitle || (isBulk ? 'Confirm Batch Contact Code' : 'Confirm Contact Code')}
      description={
        contactInfo.customDescription ||
        (isBulk
          ? `Enter the unique code to associate with these ${contactInfo.batchCount} imported contacts.`
          : 'Enter the unique code associated with this contact to finalize creation.')
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Contact / Batch Summary Box */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {isBulk ? 'Import Batch Summary' : 'Target Contact Details'}
          </div>

          {isBulk ? (
            <div className="flex items-center gap-3 text-xs">
              <div className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  {contactInfo.batchCount} Contacts Ready for Import
                </div>
                <div className="text-slate-500 text-[11px]">
                  {contactInfo.assigneeName ? `Target: ${contactInfo.assigneeName}` : 'Unallocated Database Pool'}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {contactInfo.phone && (
                <div className="flex items-center gap-2 text-slate-800">
                  <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-mono font-bold text-sm">{contactInfo.phone}</span>
                </div>
              )}

              {contactInfo.city && (
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{contactInfo.city}</span>
                </div>
              )}

              {contactInfo.secondaryMobile && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono">{contactInfo.secondaryMobile}</span>
                </div>
              )}

              {contactInfo.assigneeName && (
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Assigned to: <strong className="text-slate-800">{contactInfo.assigneeName}</strong></span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Code Input Field */}
        <div>
          <Input
            label={isBulk ? "Batch Contact Code *" : "Unique Contact Code *"}
            placeholder="e.g. CTC-0091, LEAD-7812, BATCH-2026, PR-450"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            leftIcon={<Hash className="w-4 h-4 text-blue-600" />}
            autoFocus
            disabled={isSubmitting}
            required
          />
          <p className="text-[11px] text-slate-500 mt-1 font-sans">
            This code will be permanently stored and linked with {isBulk ? 'all contacts in this import batch' : 'this contact record'}.
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Security / Verification Badge */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Contacts will not be created until code is entered and verified.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            leftIcon={<Hash className="w-4 h-4" />}
          >
            {isBulk ? 'Confirm & Execute Import' : 'Confirm & Save Contact'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
