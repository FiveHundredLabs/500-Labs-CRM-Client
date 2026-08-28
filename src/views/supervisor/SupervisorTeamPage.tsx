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
import { UserProfileDossier } from '../../components/profile/UserProfileDossier';
import toast from 'react-hot-toast';
import { UserPlus, Edit2, UserX, Eye, EyeOff, Mail, Phone, MapPin, Calendar, CreditCard, Shield } from 'lucide-react';
import { format } from 'date-fns';

export const SupervisorTeamPage: React.FC = () => {
  const { user } = useAuth();

  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // View Member Details State
  const [viewingMember, setViewingMember] = useState<User | null>(null);

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [nic, setNic] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('1995-05-15');
  const [joiningDate, setJoiningDate] = useState(format(new Date(), 'yyyy-MM-dd'));
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
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPhone('');
    setNic('');
    setDateOfBirth('1995-05-15');
    setJoiningDate(format(new Date(), 'yyyy-MM-dd'));
    setAvatarUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (member: User) => {
    setEditingMember(member);
    setFullName(member.fullName);
    setEmail(member.email);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPhone(member.phone);
    setNic(member.nic || '');
    setDateOfBirth(member.dateOfBirth || '1995-05-15');
    setJoiningDate(member.joiningDate ? member.joiningDate.split('T')[0] : format(new Date(), 'yyyy-MM-dd'));
    setAvatarUrl(member.avatarUrl || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    if (!editingMember) {
      if (!password) {
        toast.error('Please enter a password');
        return;
      }
      if (password.length < 10) {
        toast.error('Password must be at least 10 characters long');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match. Please re-enter your password.');
        return;
      }
    } else {
      if (password.trim().length > 0) {
        if (password.trim().length < 10) {
          toast.error('New password must be at least 10 characters long');
          return;
        }
        if (password !== confirmPassword) {
          toast.error('Passwords do not match. Please re-enter your password.');
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      if (editingMember) {
        await UserService.updateUser(
          editingMember.id,
          {
            fullName,
            email,
            password: password.trim() ? password.trim() : undefined,
            phone,
            nic,
            dateOfBirth,
            joiningDate,
            avatarUrl,
          },
          user!
        );
        toast.success(`Updated details for ${fullName}`);
      } else {
        await UserService.createUser(
          {
            username: email.split('@')[0],
            email,
            password,
            fullName,
            role: 'TEAM_MEMBER',
            teamId: user!.teamId!,
            supervisorId: user!.id,
            phone,
            nic,
            dateOfBirth,
            joiningDate,
            avatarUrl: '', // DO NOT allow profile photo upload during creation
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

  if (viewingMember) {
    return (
      <UserProfileDossier
        user={viewingMember}
        onClose={() => setViewingMember(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Members"
        description="Manage tele-calling team specialists, performance analytics, and profile accounts."
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
              <th className="py-3 px-4 hidden md:table-cell">Joining Date</th>
              <th className="py-3 px-4 hidden md:table-cell">Status</th>
              <th className="py-3 px-3 sm:px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
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

                <td className="py-3.5 px-4 text-xs hidden md:table-cell">
                  <div className="text-slate-800">{member.email}</div>
                  <div className="text-slate-400 font-mono mt-0.5">{member.phone}</div>
                </td>

                <td className="py-3.5 px-4 text-xs text-slate-500 hidden md:table-cell">
                  {format(new Date(member.joiningDate), 'MMM dd, yyyy')}
                </td>

                <td className="py-3.5 px-4 hidden md:table-cell">
                  <StatusBadge type="user" status={String(member.isActive)} />
                </td>

                <td className="py-3.5 px-3 sm:px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
                      onClick={() => setViewingMember(member)}
                      className="px-2 sm:px-3 text-xs"
                      title="View Detailed Analytics & Performance"
                    >
                      <span className="hidden sm:inline">View Details</span>
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

      {/* Add/Edit Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMember ? 'Edit Team Member' : 'Add New Team Member'}
      >
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Profile photo upload strictly hidden during creation (Requirement 2.4) */}
          {editingMember && (
            <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <EditableProfileAvatar
                name={fullName || 'Member'}
                avatarUrl={avatarUrl}
                onChangeAvatar={setAvatarUrl}
                size="lg"
              />
              <div>
                <div className="text-xs font-bold text-slate-900">Profile Photo</div>
                <div className="text-[11px] text-slate-500">Click camera icon to update photo</div>
              </div>
            </div>
          )}

          <Input
            label="Full Name *"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="off"
            required
          />
          <Input
            label="Email Address *"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            required
          />
          <Input
            label={editingMember ? "Reset / Change Password" : "Account Password *"}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={editingMember ? "Leave blank to keep current, or enter new password" : "Enter password (min. 10 chars)"}
            helperText={editingMember ? (password ? "Must be at least 10 characters" : "Leave blank to keep existing password") : "Must be at least 10 characters"}
            autoComplete="new-password"
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            required={!editingMember}
          />

          {(!editingMember || password.length > 0) && (
            <Input
              label={editingMember ? "Confirm New Password *" : "Confirm Password *"}
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              helperText={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined}
              error={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined}
              autoComplete="new-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />
          )}
          <Input
            label="Phone Number *"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
          <Input
            label="Joining Date *"
            type="date"
            value={joiningDate}
            onChange={(e) => setJoiningDate(e.target.value)}
            required
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

