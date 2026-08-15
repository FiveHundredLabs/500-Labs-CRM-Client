import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ActivityLog } from '../../models/domain';
import { activityLogRepository } from '../../repositories';
import { UserService } from '../../services/userService';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ProfileAvatar } from '../../components/shared/ProfileAvatar';
import { ActivityTimeline } from '../../components/shared/ActivityTimeline';
import { getTeamBranding } from '../../config/branding';
import toast from 'react-hot-toast';
import { Shield, MapPin, Save } from 'lucide-react';
import { format } from 'date-fns';

export const MemberProfilePage: React.FC = () => {
  const { user, login } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [city, setCity] = useState(user?.city || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setCity(user.city);
      setAvatarUrl(user.avatarUrl || '');
      activityLogRepository.getByUserId(user.id).then(setActivities);
    }
  }, [user]);

  if (!user) return null;

  const teamBrand = getTeamBranding(user.teamId || undefined);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !city.trim()) {
      toast.error('Full Name and City cannot be empty.');
      return;
    }

    setIsLoading(true);
    try {
      const updated = await UserService.updateUser(user.id, { fullName, city, avatarUrl }, user);
      await login(updated.email); // Refresh auth state
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Personal Profile" description="Account details and personal activity history" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editable Profile Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <ProfileAvatar name={fullName} avatarUrl={avatarUrl} size="lg" />
                <div className="space-y-1">
                  <div className="font-semibold text-base text-slate-900">{fullName}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    <span>{user.role}</span>
                    <span>&bull;</span>
                    <span>{teamBrand.name}</span>
                  </div>
                </div>
              </div>

              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <Input
                label="City / Location"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                leftIcon={<MapPin className="w-4 h-4" />}
                required
              />

              <Input
                label="Avatar Image URL (Optional)"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />

              {/* Read-Only Employment Information */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Employment Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-400 font-medium">User ID:</span>
                    <div className="font-semibold text-slate-900 mt-0.5">{user.id}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-400 font-medium">Email Address:</span>
                    <div className="font-semibold text-slate-900 mt-0.5">{user.email}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-400 font-medium">Assigned Team:</span>
                    <div className="font-semibold text-slate-900 mt-0.5">{teamBrand.name}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-400 font-medium">Joining Date:</span>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {format(new Date(user.joiningDate), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />} isLoading={isLoading}>
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Personal Activity History */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto">
            <ActivityTimeline activities={activities} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
