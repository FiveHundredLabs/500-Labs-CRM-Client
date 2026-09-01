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
  MoreHorizontal,
  Wallet,
  Boxes,
  Target,
  TrendingUp,
  Building2
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: any;
  permission?: string;
  isBottomNav?: boolean;
  group?: 'Admin' | 'Supervisor' | 'Finance';
  children?: NavItem[];
}

export const ROLE_NAVIGATION: Record<UserRole, NavItem[]> = {
  TEAM_MEMBER: [
    { label: 'Home', path: '/member/dashboard', icon: Home, isBottomNav: true },
    { label: 'Contacts', path: '/member/contacts', icon: PhoneCall, isBottomNav: true },
    { label: 'Call Logs', path: '/member/follow-ups', icon: Clock, isBottomNav: true },
    { label: 'Import', path: '/member/import', icon: Upload, isBottomNav: true },
    { label: 'More', path: '#more', icon: MoreHorizontal, isBottomNav: true },
    { label: 'My Sales', path: '/member/sales', icon: TrendingUp, isBottomNav: false },
    { label: 'Leaderboard', path: '/member/leaderboard', icon: Trophy, isBottomNav: false },
    { label: 'Profile', path: '/member/profile', icon: User, isBottomNav: false },
  ],
  SUPERVISOR: [
    { label: 'Home', path: '/supervisor/dashboard', icon: Home, isBottomNav: true },
    { label: 'Interested', path: '/supervisor/interested', icon: FileCheck, isBottomNav: true },
    { label: 'Orders', path: '/supervisor/orders', icon: Package, isBottomNav: true },
    { label: 'Stock', path: '/supervisor/stock', icon: Boxes, isBottomNav: true },
    { label: 'Import', path: '/supervisor/import', icon: Upload, isBottomNav: false },
    { label: 'Allocation', path: '/supervisor/allocation', icon: Layers, isBottomNav: false },
    { label: 'Allocation History', path: '/supervisor/allocation/history', icon: Clock, isBottomNav: false },
    { label: 'Team', path: '/supervisor/team', icon: Users, isBottomNav: true },
    { label: 'Leaderboard', path: '/supervisor/team-members', icon: Trophy, isBottomNav: false },
    { label: 'Reports', path: '/supervisor/reports', icon: PieChart, isBottomNav: false },
    { label: 'Profile', path: '/supervisor/profile', icon: User, isBottomNav: false },
    { label: 'More', path: '#more', icon: MoreHorizontal, isBottomNav: true },
  ],
  ADMIN: [
    // Admin Specific Items
    { label: 'Home', path: '/admin/dashboard', icon: Home, isBottomNav: true, group: 'Admin' },
    { label: 'Sales Goals', path: '/admin/sales-goals', icon: Target, isBottomNav: false, group: 'Admin' },
    { label: 'Teams', path: '/admin/teams', icon: Building2, isBottomNav: false, group: 'Admin' },
    { label: 'Users', path: '/admin/users', icon: Users, isBottomNav: true, group: 'Admin' },
    { label: 'Products', path: '/admin/products', icon: Boxes, isBottomNav: true, group: 'Admin' },
    { label: 'Approvals', path: '/admin/approvals', icon: FileCheck, isBottomNav: false, group: 'Admin' },
    { label: 'Reports', path: '/admin/reports', icon: PieChart, isBottomNav: true, group: 'Admin' },
    { label: 'Leaderboards', path: '/admin/leaderboards', icon: Trophy, isBottomNav: true, group: 'Admin' },
    { label: 'Activity', path: '/admin/activity', icon: Activity, isBottomNav: true, group: 'Admin' },
    { label: 'Profile', path: '/admin/profile', icon: User, isBottomNav: false, group: 'Admin' },

    // Supervisor Section (Expandable Group)
    {
      label: 'Supervisor',
      path: '#supervisor-group',
      icon: Layers,
      group: 'Supervisor',
      children: [
        { label: 'Import Contacts', path: '/admin/import', icon: Upload },
        { label: 'Interested', path: '/admin/customers', icon: FileCheck },
        { label: 'Orders', path: '/admin/orders', icon: Package },
        { label: 'Stock Management', path: '/admin/stock', icon: Boxes },
        { label: 'Allocation', path: '/admin/allocation', icon: Layers },
        { label: 'Allocation History', path: '/admin/allocation/history', icon: Clock },
        { label: 'Team Specialists', path: '/admin/team', icon: Users },
        { label: 'Team Leaderboard', path: '/admin/team-members', icon: Trophy },
      ],
    },

    // Finance Section (Expandable Group)
    {
      label: 'Finance',
      path: '#finance-group',
      icon: DollarSign,
      group: 'Finance',
      children: [
        { label: 'Sales Analysis', path: '/admin/finance/sales-analysis', icon: TrendingUp },
        { label: 'Petty Cash', path: '/admin/finance/petty-cash', icon: Wallet },
        { label: 'Expenses', path: '/admin/finance/expenses', icon: DollarSign },
        { label: 'Add Expense', path: '/admin/finance/expenses/new', icon: DollarSign },
      ],
    },

    { label: 'More', path: '#more', icon: MoreHorizontal, isBottomNav: true },
  ],
  FINANCE: [
    { label: 'Overview', path: '/finance/dashboard', icon: Home, isBottomNav: true },
    { label: 'Sales Analysis', path: '/finance/sales-analysis', icon: TrendingUp, isBottomNav: true },
    { label: 'Petty Cash', path: '/finance/petty-cash', icon: Wallet, isBottomNav: true },
    { label: 'Expenses', path: '/finance/expenses', icon: DollarSign, isBottomNav: true },
    { label: 'Reports', path: '/finance/reports', icon: PieChart, isBottomNav: true },
    { label: 'Add Expense', path: '/finance/expenses/new', icon: DollarSign, isBottomNav: false },
    { label: 'Profile', path: '/finance/profile', icon: User, isBottomNav: true },
  ],
};
