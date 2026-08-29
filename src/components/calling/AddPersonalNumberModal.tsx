import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { contactRepository } from '../../repositories';
import { ActivityLogService } from '../../services/activityLogService';
import toast from 'react-hot-toast';
import { Phone, MapPin, UserCheck, ShieldCheck } from 'lucide-react';

export interface AddPersonalNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddPersonalNumberModal: React.FC<AddPersonalNumberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [secondaryMobile, setSecondaryMobile] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();

    // Validation: Phone format
    if (!cleanPhone || cleanPhone.length < 7) {
      toast.error('Please enter a valid phone number (at least 7 digits).');
      return;
    }

    if (secondaryMobile.trim() && secondaryMobile.trim().length < 7) {
      toast.error('Secondary mobile number must have at least 7 digits.');
      return;
    }
    if (!user.teamId) {
      toast.error('Your account is not assigned to a team. Please contact an administrator.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Add and auto-allocate to current team member
      const newContact = await contactRepository.addPersonalNumber({
        phone: cleanPhone,
        memberId: user.id,
        teamId: user.teamId,
        city: city.trim() || undefined,
        secondaryMobile: secondaryMobile.trim() || undefined,
      });

      // 2. Log activity
      await ActivityLogService.logAction({
        userId: user.id,
        userRole: user.role,
        userName: user.fullName,
        teamId: user.teamId,
        action: 'NUMBER_ADDED',
        entityType: 'Contact',
        entityId: newContact.id,
        description: `Self-added personal contact number ${cleanPhone} (Auto-allocated to ${user.fullName})`,
      });

      toast.success(`Contact ${cleanPhone} added and auto-allocated to your list!`);
      setPhone('');
      setCity('');
      setSecondaryMobile('');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add contact number.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add Personal Contact Number"
      description="Add a new customer lead number directly to your assigned calling queue"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Auto-allocation info banner */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="text-xs text-blue-900">
            <span className="font-semibold">Automatic Allocation:</span> This number will be automatically assigned to you (<strong>{user.fullName}</strong>) without requiring supervisor approval.
          </div>
        </div>

        <Input
          label="Primary Contact Number *"
          placeholder="e.g. +94 77 123 4567 or 0771234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="City / Location (Optional)"
            placeholder="e.g. Colombo, Kandy"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
          />

          <Input
            label="Secondary Mobile (Optional)"
            placeholder="e.g. +94 71 987 6543"
            value={secondaryMobile}
            onChange={(e) => setSecondaryMobile(e.target.value)}
            leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="pt-2 text-xs text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Added to your contacts with allocation history recorded.</span>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={<Phone className="w-4 h-4" />}>
            Add to My Contacts
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
