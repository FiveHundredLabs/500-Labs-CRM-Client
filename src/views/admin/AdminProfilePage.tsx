import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ActivityLog } from '../../models/domain';
import { activityLogRepository } from '../../repositories';
import { UserService } from '../../services/userService';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { EditableProfileAvatar } from '../../components/shared/EditableProfileAvatar';
import { ActivityTimeline } from '../../components/shared/ActivityTimeline';
import toast from 'react-hot-toast';
import { Shield, MapPin, Save, Calendar, Mail, Phone, CreditCard, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';

export const AdminProfilePage: React.FC = () => {
  const { user, updateCurrentUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || '');
  const [nic, setNic] = useState(user?.nic || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setCity(user.city || '');
      setNic(user.nic || '');
      setDateOfBirth(user.dateOfBirth || '');
      setAvatarUrl(user.avatarUrl || '');
      activityLogRepository.getByUserId(user.id).then(setActivities);
    }
  }, [user]);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error('Full Name and Email Address cannot be empty.');
      return;
    }

    setIsLoading(true);
    try {
      const updated = await UserService.updateUser(
        user.id,
        {
          fullName,
          email,
          phone,
          city,
          nic,
          dateOfBirth,
          avatarUrl,
        },
        user
      );
      updateCurrentUser(updated);
      toast.success('Admin profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Update failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Administrator Profile" description="Account settings and administrative audit history" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Edit Profile Details</CardTitle>
            <CardDescription>Update your personal information and contact details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="flex items-center gap-5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <EditableProfileAvatar
                  name={fullName}
                  avatarUrl={avatarUrl}
                  onChangeAvatar={setAvatarUrl}
                  size="2xl"
                />
                <div className="space-y-1">
                  <div className="font-bold text-lg text-slate-900">{fullName}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Shield className="w-3.5 h-3.5 text-purple-600" />
                    <span className="font-medium text-slate-700">{user.role}</span>
                    <span>&bull;</span>
                    <span>System Administration</span>
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <Input
                label="Full Name *"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                leftIcon={<UserIcon className="w-4 h-4 text-slate-400" />}
                required
              />

              <Input
                label="Email Address *"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
                  placeholder="+1 (555) 000-0000"
                />

                <Input
                  label="City / Location *"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="NIC / National ID"
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
                  leftIcon={<CreditCard className="w-4 h-4 text-slate-400" />}
                  placeholder="National ID"
                />

                <Input
                  label="Date of Birth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
                />
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />} isLoading={isLoading}>
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Monthly Activity Log */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Monthly Activity Log</CardTitle>
              <CardDescription>Admin actions log for this month</CardDescription>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
              <Calendar className="w-3 h-3" />
              {format(new Date(), 'MMMM yyyy')}
            </span>
          </CardHeader>
          <CardContent className="max-h-[550px] overflow-y-auto">
            <ActivityTimeline activities={activities} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
