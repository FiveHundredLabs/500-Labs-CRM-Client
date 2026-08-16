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
import { UserPlus, Edit2, UserX } from 'lucide-react';
import { format } from 'date-fns';

export const SupervisorTeamPage: React.FC = () => {
  const { user } = useAuth();

  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

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

      <div className="enterprise-table-container">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Member</th>
              <th className="py-3 px-4">Contact Info</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Joined Date</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <ProfileAvatar name={member.fullName} avatarUrl={member.avatarUrl} size="sm" />
                    <div>
                      <div className="font-semibold text-slate-900">{member.fullName}</div>
                      <div className="text-xs text-slate-400 font-mono">{member.id}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-xs">
                  <div className="text-slate-800">{member.email}</div>
                  <div className="text-slate-400 font-mono mt-0.5">{member.phone}</div>
                </td>
                <td className="py-3.5 px-4 text-xs text-slate-600">{member.city}</td>
                <td className="py-3.5 px-4 text-xs text-slate-500">
                  {format(new Date(member.joiningDate), 'MMM dd, yyyy')}
                </td>
                <td className="py-3.5 px-4">
                  <StatusBadge type="user" status={String(member.isActive)} />
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => openEditModal(member)}
                    >
                      Edit
                    </Button>
                    {member.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        leftIcon={<UserX className="w-3.5 h-3.5" />}
                        onClick={() => setDisablingId(member.id)}
                      >
                        Disable
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
