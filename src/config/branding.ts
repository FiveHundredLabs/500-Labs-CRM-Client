import { Team } from '../models/domain';

export const PREDEFINED_TEAMS: Record<string, Team> = {
  team_001: {
    id: 'team_001',
    name: 'Brand Alpha',
    code: 'ALPHA',
    brandColor: '#2563EB', // Primary Blue
    accentColor: '#EFF6FF', // Soft Blue Tint
    logoText: 'ALPHA CRM & SALES',
    contactEmail: 'support@brandalpha.com',
    contactPhone: '+1 (800) 555-0199',
    address: '100 Commerce Boulevard, Suite 400, Industrial Zone A',
    createdAt: '2026-01-01T00:00:00Z',
  },
  team_002: {
    id: 'team_002',
    name: 'Brand Beta',
    code: 'BETA',
    brandColor: '#0284C7', // Slate Cyan Blue
    accentColor: '#F0F9FF', // Light Cyan Tint
    logoText: 'BETA DIRECT SALES',
    contactEmail: 'contact@brandbeta.com',
    contactPhone: '+1 (800) 555-0288',
    address: '250 Enterprise Way, Building 2, Logistics Park',
    createdAt: '2026-01-01T00:00:00Z',
  },
};

export const getTeamBranding = (teamId?: string): Team => {
  if (teamId && PREDEFINED_TEAMS[teamId]) {
    return PREDEFINED_TEAMS[teamId];
  }
  return PREDEFINED_TEAMS.team_001;
};
