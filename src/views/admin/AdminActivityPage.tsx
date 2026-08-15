import React, { useState, useEffect } from 'react';
import { ActivityLog } from '../../models/domain';
import { activityLogRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { SearchInput } from '../../components/shared/SearchInput';
import { Select } from '../../components/ui/Select';
import { ActivityTimeline } from '../../components/shared/ActivityTimeline';
import { LoadingState } from '../../components/shared/LoadingState';
import { Activity } from 'lucide-react';

export const AdminActivityPage: React.FC = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const logs = await activityLogRepository.getAll();
        setActivities(logs);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingState rows={8} />;

  const filtered = activities.filter((a) => {
    const matchesSearch =
      a.userName.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()) ||
      a.action.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || a.userRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Audit Log"
        description="Immutable record of user actions and state transitions across the platform"
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Search user name, action, or description..." />
        </div>
        <div className="w-full sm:w-60">
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Roles' },
              { value: 'ADMIN', label: 'Admin Actions' },
              { value: 'SUPERVISOR', label: 'Supervisor Actions' },
              { value: 'TEAM_MEMBER', label: 'Team Member Actions' },
              { value: 'FINANCE', label: 'Finance Actions' },
            ]}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <span>Audit Trail ({filtered.length} Entries)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline activities={filtered} />
        </CardContent>
      </Card>
    </div>
  );
};
