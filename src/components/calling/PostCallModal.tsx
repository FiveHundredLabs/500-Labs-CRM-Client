import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { StatusBadge } from '../shared/StatusBadge';
import { Contact, ContactStatus, CallLog } from '../../models/domain';
import { CallLogService } from '../../services/callLogService';
import { callLogRepository } from '../../repositories';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { Phone, CheckCircle2, History, AlertCircle, ChevronRight, Star } from 'lucide-react';
import { format } from 'date-fns';

export interface PostCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  onSuccess: () => void;
}

export const PostCallModal: React.FC<PostCallModalProps> = ({
  isOpen,
  onClose,
  contact,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [hasDialed, setHasDialed] = useState(false);
  const [history, setHistory] = useState<CallLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [status, setStatus] = useState<ContactStatus>('ANSWERED');
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset state and fetch history when contact changes or modal opens
  useEffect(() => {
    if (!contact || !isOpen) return;

    setHasDialed(false);
    setStatus(contact.status === 'NEW' ? 'ANSWERED' : contact.status);
    setIsFollowUp(Boolean(contact.isFollowUp));
    setCustomerName('');
    setCustomerAddress('');
    setCustomerEmail('');
    setRemarks('');

    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const logs = await callLogRepository.getByContactId(contact.id);
        logs.sort((a, b) => new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime());
        setHistory(logs);
      } catch (err) {
        console.error('Failed to load call history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [contact, isOpen]);

  if (!contact || !user) return null;

  const isNew = contact.status === 'NEW';
  const isInterested = status === 'INTERESTED';
  const showCustomerFields = status === 'ANSWERED' || status === 'INTERESTED' || status === 'NOT_INTERESTED';

  const triggerNativeDialer = () => {
    window.location.href = `tel:${contact.phone.replace(/[^0-9+]/g, '')}`;
    setHasDialed(true);
    toast.success('Dialer launched! Fill outcome details below.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInterested && (!customerName.trim() || !customerAddress.trim())) {
      toast.error('Customer Name and Delivery Address are required for INTERESTED status.');
      return;
    }

    setIsLoading(true);
    try {
      await CallLogService.submitCallResult(
        {
          contactId: contact.id,
          status,
          isFollowUp,
          customerName: customerName.trim() || undefined,
          customerAddress: customerAddress.trim() || undefined,
          customerEmail: customerEmail.trim() || undefined,
          remarks: remarks.trim() || undefined,
          callDurationSeconds: Math.floor(Math.random() * 120) + 30,
        },
        user
      );

      toast.success(
        isInterested
          ? `Call logged & Interested Customer record created for ${customerName}!`
          : `Call outcome saved as ${status}`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record call result.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Call"
      description={`Contact Phone: ${contact.phone}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Original Clean Style Launch Dialer Bar */}
        <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-xs">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Phone Number</div>
              <div className="text-base font-bold text-slate-900 font-mono">{contact.phone}</div>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Phone className="w-3.5 h-3.5" />}
            onClick={triggerNativeDialer}
            className="w-full sm:w-auto"
          >
            Launch Dialer
          </Button>
        </div>

        {/* Call History Section (Shown for non-NEW contacts) */}
        {!isNew && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-600" />
                <span>Call History ({history.length} Previous Calls)</span>
              </div>
              <span className="text-[11px] text-slate-400 font-normal">Most recent first</span>
            </div>

            {loadingHistory ? (
              <div className="text-xs text-slate-400 p-2 italic text-center">Loading call logs...</div>
            ) : history.length === 0 ? (
              <div className="text-xs text-slate-400 p-2 italic text-center bg-white rounded-lg border border-slate-100">
                No prior call history recorded for this contact.
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {history.map((log) => (
                  <div
                    key={log.id}
                    className="bg-white border border-slate-200/80 rounded-lg p-2.5 text-xs text-slate-700 space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusBadge type="contact" status={log.status} />
                        <span className="font-mono text-slate-400 text-[11px]">
                          {format(new Date(log.calledAt), 'MMM dd, yyyy • hh:mm a')}
                        </span>
                      </div>
                      <span className="font-mono text-slate-500 text-[11px]">
                        {Math.floor((log.callDurationSeconds || 0) / 60)}m {(log.callDurationSeconds || 0) % 60}s
                      </span>
                    </div>

                    {log.customerName && (
                      <div className="text-slate-900 font-semibold">
                        {log.customerName} {log.customerAddress && <span className="text-slate-500 font-normal">&bull; {log.customerAddress}</span>}
                      </div>
                    )}

                    {log.remarks && (
                      <div className="text-slate-600 italic bg-slate-50 p-1.5 rounded border border-slate-100">
                        &quot;{log.remarks}&quot;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Skip button shown ONLY for non-NEW contacts before dialing */}
        {!hasDialed && !isNew && (
          <div className="text-center pt-1 pb-2">
            <button
              type="button"
              onClick={() => setHasDialed(true)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Or click here to fill call outcome directly</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Form Fields (Revealed after Launch Dialer is clicked) */}
        {hasDialed && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-150">
            <Select
              label="Call Outcome / Status *"
              value={status}
              onChange={(e) => setStatus(e.target.value as ContactStatus)}
              options={[
                { value: 'ANSWERED', label: 'Answered' },
                { value: 'NOT_ANSWERED', label: 'Not Answered' },
                { value: 'PHONE_OFF', label: 'Phone Switched Off' },
                { value: 'INTERESTED', label: 'Interested (Creates Customer Lead Record)' },
                { value: 'NOT_INTERESTED', label: 'Not Interested' },
              ]}
            />

            {/* Follow-Up Star Mark Option Box */}
            <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Star className={`w-4 h-4 ${isFollowUp ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold text-slate-800">Add to Follow-Up List</div>
                  <div className="text-[11px] text-slate-500">Stars this contact for priority callback tracking</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFollowUp(!isFollowUp)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isFollowUp
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-amber-50'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${isFollowUp ? 'fill-white text-white' : 'text-amber-500'}`} />
                <span>{isFollowUp ? 'Starred' : 'Star for Follow-Up'}</span>
              </button>
            </div>

            {/* Customer Details Form Container (Hidden for NOT_ANSWERED & PHONE_OFF) */}
            {showCustomerFields && (
              <div
                className={`p-4 rounded-xl space-y-3.5 transition-colors ${
                  isInterested
                    ? 'bg-emerald-50/60 border border-emerald-200'
                    : 'bg-slate-50/70 border border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
                  <CheckCircle2 className={`w-4 h-4 ${isInterested ? 'text-emerald-600' : 'text-blue-600'}`} />
                  <span>Customer &amp; Delivery Details {isInterested ? '*' : '(Optional)'}</span>
                </div>

                <Input
                  label={`Customer Full Name ${isInterested ? '*' : '(Optional)'}`}
                  placeholder="e.g. Roshan Mahanama"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required={isInterested}
                />

                <Input
                  label={`Delivery Address ${isInterested ? '*' : '(Optional)'}`}
                  placeholder="e.g. No. 45, Galle Road, Colombo 03"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  required={isInterested}
                />

                <Input
                  label="Email Address (Optional)"
                  type="email"
                  placeholder="e.g. roshan.mahanama@gmail.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  helperText="Used for automated delivery confirmation email simulation"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Call Remarks / Notes
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add key notes, preferred follow-up times, customer queries..."
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Cancel leaves status unchanged</span>
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isLoading}>
                  Save Call
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
};
