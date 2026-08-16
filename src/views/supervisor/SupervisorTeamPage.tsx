import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../models/domain';
import { userRepository } from '../../repositories';
import { UserService } from '../../services/userService';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ProfileAvatar } from '../../components/shared/ProfileAvatar';
import { EditableProfileAvatar } from '../../components/shared/EditableProfileAvatar';
import { LoadingState } from '../../components/shared/LoadingState';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import toast from 'react-hot-toast';
import { UserPlus, Edit2, UserX, Eye, Mail, Phone, MapPin, Calendar, CreditCard, Shield } from 'lucide-react';
import { format } from 'date-fns';

export const SupervisorTeamPage: React.FC = () => {
  const { user } = useAuth();

  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // View Member Details Modal State
  const [viewingMember, setViewingMember] = useState<User | null>(null);

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [nic, setNic] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('1995-05-15');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Disable modal
  const [disablingId, setDisablingId] = useState<string | null>(null);

  const loadTeam = async () => {
    if (!user || !user.teamId) return;
    setLoading(true);
    try {
      const data = await userRepository.getByTeamId(user.teamId);
      setMembers(data.filter((m) => m.role === 'TEAM_MEMBER'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, [user]);

  const openAddModal = () => {
    setEditingMember(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setCity('');
    setNic('');
    setDateOfBirth('1995-05-15');
    setAvatarUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (member: User) => {
    setEditingMember(member);
    setFullName(member.fullName);
    setEmail(member.email);
    setPhone(member.phone);
    setCity(member.city);
    setNic(member.nic || '');
    setDateOfBirth(member.dateOfBirth || '1995-05-15');
    setAvatarUrl(member.avatarUrl || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingMember) {
        await UserService.updateUser(
          editingMember.id,
          { fullName, email, phone, city, nic, dateOfBirth, avatarUrl },
          user!
        );
        toast.success(`Updated details for ${fullName}`);
      } else {
        await UserService.createUser(
          {
            username: email.split('@')[0],
            email,
            fullName,
            role: 'TEAM_MEMBER',
            teamId: user!.teamId!,
            supervisorId: user!.id,
            city,
            phone,
            nic,
            dateOfBirth,
            avatarUrl,
            joiningDate: new Date().toISOString(),
            isActive: true,
          },
          user!
        );
        toast.success(`Added new team member ${fullName}`);
      }
      setIsModalOpen(false);
      loadTeam();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisableConfirm = async () => {
    if (!disablingId || !user) return;
    try {
      await UserService.disableUser(disablingId, user);
      toast.success('Team member account has been disabled.');
      setDisablingId(null);
      if (viewingMember && viewingMember.id === disablingId) {
        setViewingMember(null);
      }
      loadTeam();
    } catch (err: any) {
      toast.error(err.message || 'Failed to disable member.');
    }
  };

  if (loading) return <LoadingState rows={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Members"
        description="Manage tele-calling team specialists and account permissions"
        actions={
          <Button variant="primary" leftIcon={<UserPlus className="w-4 h-4" />} onClick={openAddModal}>
            Add Team Member
          </Button>
        }
      />

      <div className="enterprise-table-container overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-3 sm:px-4">Member</th>
              <th className="py-3 px-4 hidden md:table-cell">Contact Info</th>
              <th className="py-3 px-4 hidden md:table-cell">Location</th>
              <th className="py-3 px-4 hidden md:table-cell">Joined Date</th>
              <th className="py-3 px-4 hidden md:table-cell">Status</th>
              <th className="py-3 px-3 sm:px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                {/* Member Name Column (Always Visible) */}
                <td className="py-3.5 px-3 sm:px-4">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <ProfileAvatar name={member.fullName} avatarUrl={member.avatarUrl} size="sm" />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate max-w-[120px] sm:max-w-none">
                        {member.fullName}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{member.id}</div>
                    </div>
                  </div>
                </td>

                {/* Contact Info (Desktop Only) */}
                <td className="py-3.5 px-4 text-xs hidden md:table-cell">
                  <div className="text-slate-800">{member.email}</div>
                  <div className="text-slate-400 font-mono mt-0.5">{member.phone}</div>
                </td>

                {/* Location (Desktop Only) */}
                <td className="py-3.5 px-4 text-xs text-slate-600 hidden md:table-cell">{member.city}</td>

                {/* Joined Date (Desktop Only) */}
                <td className="py-3.5 px-4 text-xs text-slate-500 hidden md:table-cell">
                  {format(new Date(member.joiningDate), 'MMM dd, yyyy')}
                </td>

                {/* Status (Desktop Only) */}
                <td className="py-3.5 px-4 hidden md:table-cell">
                  <StatusBadge type="user" status={String(member.isActive)} />
                </td>

                {/* Actions (Always Visible on all mobile screens) */}
                <td className="py-3.5 px-3 sm:px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                    {/* View Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
                      onClick={() => setViewingMember(member)}
                      className="px-2 sm:px-3 text-xs"
                      title="View Member Profile Details"
                    >
                      <span className="hidden sm:inline">View</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => openEditModal(member)}
                      className="px-2 sm:px-3 text-xs"
                      title="Edit Member"
                    >
                      <span className="hidden sm:inline">Edit</span>
                    </Button>

                    {member.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 sm:px-3 text-xs"
                        leftIcon={<UserX className="w-3.5 h-3.5" />}
                        onClick={() => setDisablingId(member.id)}
                        title="Disable Member"
                      >
                        <span className="hidden sm:inline">Disable</span>
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Member Details Pop-up Modal */}
      {viewingMember && (
        <Dialog
          isOpen={!!viewingMember}
          onClose={() => setViewingMember(null)}
          title="Team Member Profile"
          description="Complete personal information and employee profile details"
          maxWidth="md"
        >
          <div className="space-y-4">
            {/* Header Profile Info */}
            <div className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <ProfileAvatar
                name={viewingMember.fullName}
                avatarUrl={viewingMember.avatarUrl}
                size="lg"
              />
              <div className="space-y-1 min-w-0">
                <div className="font-bold text-sm sm:text-base text-slate-900 flex flex-wrap items-center gap-2">
                  <span className="truncate">{viewingMember.fullName}</span>
                  <StatusBadge type="user" status={String(viewingMember.isActive)} />
                </div>
                <div className="text-xs text-slate-500 font-mono">ID: {viewingMember.id}</div>
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                  <Shield className="w-3 h-3" />
                  <span>Sales Specialist</span>
                </div>
              </div>
            </div>

            {/* Detailed Properties Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                <div className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Email Address</span>
                </div>
                <div className="font-semibold text-slate-900 break-all">{viewingMember.email}</div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                <div className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Phone Number</span>
                </div>
                <div className="font-semibold font-mono text-slate-900">{viewingMember.phone}</div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                <div className="text-slate-400 font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>City / Location</span>
                </div>
                <div className="font-semibold text-slate-900">{viewingMember.city || 'Not Specified'}</div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                <div className="text-slate-400 font-medium flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span>NIC / National ID</span>
                </div>
                <div className="font-semibold font-mono text-slate-900">{viewingMember.nic || 'Not Specified'}</div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                <div className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Date of Birth</span>
                </div>
                <div className="font-semibold text-slate-900">
                  {viewingMember.dateOfBirth
                    ? format(new Date(viewingMember.dateOfBirth), 'MMMM dd, yyyy')
                    : 'Not Specified'}
                </div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                <div className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Joining Date</span>
                </div>
                <div className="font-semibold text-slate-900">
                  {format(new Date(viewingMember.joiningDate), 'MMMM dd, yyyy')}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  const m = viewingMember;
                  setViewingMember(null);
                  openEditModal(m);
                }}
              >
                Edit Member Details
              </Button>

              <Button variant="secondary" size="sm" onClick={() => setViewingMember(null)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Add/Edit Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMember ? 'Edit Team Member' : 'Add New Team Member'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <EditableProfileAvatar
              name={fullName || 'Member'}
              avatarUrl={avatarUrl}
              onChangeAvatar={setAvatarUrl}
              size="lg"
            />
            <div>
              <div className="text-xs font-bold text-slate-900">Profile Photo</div>
              <div className="text-[11px] text-slate-500">Click camera icon to upload photo</div>
            </div>
          </div>

          <Input
            label="Full Name *"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Email Address *"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Phone Number *"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <Input
            label="City / Region *"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
          <Input
            label="National ID / NIC Number"
            value={nic}
            onChange={(e) => setNic(e.target.value)}
          />
          <Input
            label="Date of Birth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingMember ? 'Save Changes' : 'Create Member'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Confirm Disable Dialog */}
      <ConfirmDialog
        isOpen={!!disablingId}
        onClose={() => setDisablingId(null)}
        onConfirm={handleDisableConfirm}
        title="Disable Team Member Account"
        message="Are you sure you want to disable this member? Historical logs, call history, and order records will be preserved."
        confirmText="Disable Account"
        isDanger
      />
    </div>
  );
};
