import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { PREDEFINED_TEAMS, getTeamBranding } from '../../config/branding';
import { Select } from '../ui/Select';
import { Shield } from 'lucide-react';

export interface AdminTeamSelectorProps {
  activeTeamId: string;
  onTeamChange: (teamId: string) => void;
  title?: string;
}

export const AdminTeamSelector: React.FC<AdminTeamSelectorProps> = ({
  activeTeamId,
  onTeamChange,
  title = 'Team Operations Scope',
}) => {
  const { role } = useAuth();
  if (role !== 'ADMIN') return null;

  const currentTeam = getTeamBranding(activeTeamId);
  const teamList = Object.values(PREDEFINED_TEAMS);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-purple-50/90 border border-blue-200 rounded-xl shadow-2xs">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs"
          style={{ backgroundColor: currentTeam.brandColor }}
        >
          {currentTeam.code}
        </div>
        <div>
          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Admin Multi-Team Control:</span>
            <span className="font-extrabold text-blue-700">{currentTeam.name}</span>
          </div>
          <p className="text-[11px] text-slate-500">{title} — Viewing &amp; managing data for {currentTeam.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Active Team:</span>
        <Select
          value={activeTeamId}
          onChange={(e) => onTeamChange(e.target.value)}
          options={teamList.map((t) => ({
            value: t.id,
            label: `${t.name} (${t.id === 'team_001' ? 'Team 1' : 'Team 2'})`,
          }))}
          className="w-56 text-xs font-bold bg-white"
        />
      </div>
    </div>
  );
};
