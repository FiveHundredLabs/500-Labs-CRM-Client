import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User } from '../../models/domain';
import { userRepository } from '../../repositories';
import { LoadingState } from '../../components/shared/LoadingState';
import { UserProfileDossier } from '../../components/profile/UserProfileDossier';

export const AdminEmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const u = await userRepository.getById(id);
        if (u) {
          setEmployee(u);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <LoadingState rows={8} />;
  if (!employee) return <div className="p-6 text-center text-slate-500">User account not found.</div>;

  return (
    <UserProfileDossier
      user={employee}
      onClose={() => navigate('/admin/users')}
      onSelectUser={(targetUserId) => navigate(`/admin/users/${targetUserId}`)}
    />
  );
};

