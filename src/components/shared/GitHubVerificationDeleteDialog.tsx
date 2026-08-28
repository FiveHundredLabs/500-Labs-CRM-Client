import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AlertTriangle, Trash2, ShieldAlert } from 'lucide-react';

export interface GitHubVerificationDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  itemName: string;
  expectedText?: string;
  warningMessage?: string;
  confirmButtonText?: string;
  isLoading?: boolean;
}

export const GitHubVerificationDeleteDialog: React.FC<GitHubVerificationDeleteDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  expectedText,
  warningMessage = 'This action will soft-delete (deactivate) this item from the active database. Historical reports and past transactions will be preserved.',
  confirmButtonText = 'I understand the consequences, delete this item',
  isLoading = false,
}) => {
  const targetVerificationText = expectedText || itemName;
  const [typedVerification, setTypedVerification] = useState('');

  // Reset input when dialog opens/closes or target changes
  useEffect(() => {
    if (isOpen) {
      setTypedVerification('');
    }
  }, [isOpen, targetVerificationText]);

  const isMatched = typedVerification.trim() === targetVerificationText.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isMatched && !isLoading) {
      onConfirm();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description="GitHub-style security verification required"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Warning Callout Box */}
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Warning: Permanent Deactivation</span>
          </div>
          <p className="text-rose-800 leading-relaxed pl-6">
            {warningMessage}
          </p>
        </div>

        {/* Instructions & Prompt */}
        <div className="space-y-1.5 text-xs text-slate-700">
          <p>
            To confirm this action, please type the exact verification text below:
          </p>
          <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 select-all text-center tracking-wide">
            {targetVerificationText}
          </div>
        </div>

        {/* Verification Input Field */}
        <div>
          <Input
            value={typedVerification}
            onChange={(e) => setTypedVerification(e.target.value)}
            placeholder={`Type "${targetVerificationText}" here`}
            autoFocus
            required
            className={`font-mono text-xs ${
              isMatched
                ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                : typedVerification.length > 0
                ? 'border-rose-400 ring-2 ring-rose-400/20'
                : ''
            }`}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={!isMatched || isLoading}
            isLoading={isLoading}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            {confirmButtonText}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
