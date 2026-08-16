import { UserRole } from '../models/domain';
import { 
  Home, 
  PhoneCall, 
  Clock, 
  Trophy, 
  User, 
  Users, 
  FileCheck, 
  Package, 
  PieChart, 
  DollarSign, 
  Activity, 
  Upload, 
  Layers,
  MoreHorizontal
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: any;
  permission?: string;
  isBottomNav?: boolean;
}

export const ROLE_NAVIGATION: Record<UserRole, NavItem[]> = {
  TEAM_MEMBER: [
    { label: 'Home', path: '/member/dashboard', icon: Home, isBottomNav: true },
    { label: 'Contacts', path: '/member/contacts', icon: PhoneCall, isBottomNav: true },
    { label: 'Call Logs', path: '/member/follow-ups', icon: Clock, isBottomNav: true },
    { label: 'Leaderboard', path: '/member/leaderboard', icon: Trophy, isBottomNav: true },
    { label: 'Profile', path: '/member/profile', icon: User, isBottomNav: true },
  ],
  SUPERVISOR: [
    { label: 'Home', path: '/supervisor/dashboard', icon: Home, isBottomNav: true },
    { label: 'Team', path: '/supervisor/team', icon: Users, isBottomNav: true },
    { label: 'Interested', path: '/supervisor/customers', icon: FileCheck, isBottomNav: true },
    { label: 'Orders', path: '/supervisor/orders', icon: Package, isBottomNav: true },
    { label: 'Import Contacts', path: '/supervisor/import', icon: Upload, isBottomNav: false },
    { label: 'Allocation', path: '/supervisor/allocation', icon: Layers, isBottomNav: false },
    { label: 'Allocation History', path: '/supervisor/allocation/history', icon: Clock, isBottomNav: false },
    { label: 'Profile', path: '/supervisor/profile', icon: User, isBottomNav: false },
    { label: 'More', path: '#more', icon: MoreHorizontal, isBottomNav: true },
  ],
  ADMIN: [
    { label: 'Home', path: '/admin/dashboard', icon: Home, isBottomNav: true },
    { label: 'Users', path: '/admin/users', icon: Users, isBottomNav: true },
    { label: 'Reports', path: '/admin/reports', icon: PieChart, isBottomNav: true },
    { label: 'Activity', path: '/admin/activity', icon: Activity, isBottomNav: true },
    { label: 'Profile', path: '/admin/profile', icon: User, isBottomNav: false },
    { label: 'More', path: '#more', icon: MoreHorizontal, isBottomNav: true },
  ],
  FINANCE: [
    { label: 'Overview', path: '/finance/dashboard', icon: Home, isBottomNav: true },
    { label: 'Expenses', path: '/finance/expenses', icon: DollarSign, isBottomNav: true },
    { label: 'Reports', path: '/finance/reports', icon: PieChart, isBottomNav: true },
    { label: 'Add Expense', path: '/finance/expenses/new', icon: DollarSign, isBottomNav: false },
    { label: 'Profile', path: '/finance/profile', icon: User, isBottomNav: true },
  ],
};
