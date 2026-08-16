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
import { Shield, Save, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export const AdminProfilePage: React.FC = () => {
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !city.trim()) return;
    setIsLoading(true);
    try {
      const updated = await UserService.updateUser(user.id, { fullName, city, avatarUrl }, user);
      await login(updated.email);
      toast.success('Admin profile updated!');
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
            <CardTitle>Admin Details</CardTitle>
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
                  <div className="font-semibold text-lg text-slate-900">{fullName}</div>
                  <div className="text-xs text-blue-600 flex items-center gap-1 font-semibold">
                    <Shield className="w-3.5 h-3.5" />
                    <span>System Administrator</span>
                  </div>
                </div>
              </div>

              <Input label="Full Name *" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              <Input label="City / Region *" value={city} onChange={(e) => setCity(e.target.value)} leftIcon={<MapPin className="w-4 h-4" />} required />

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />} isLoading={isLoading}>
                  Save Admin Profile
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
              <CardDescription>Administrative audit history</CardDescription>
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
