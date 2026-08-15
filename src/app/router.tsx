import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../views/auth/LoginPage';
import { AppShell } from '../components/navigation/AppShell';
import { ProtectedRoute } from '../components/navigation/ProtectedRoute';

// Member Views
import { MemberDashboard } from '../views/member/MemberDashboard';
import { MemberContactsPage } from '../views/member/MemberContactsPage';
import { MemberFollowUpsPage } from '../views/member/MemberFollowUpsPage';
import { MemberLeaderboardPage } from '../views/member/MemberLeaderboardPage';
import { MemberProfilePage } from '../views/member/MemberProfilePage';

// Supervisor Views
import { SupervisorDashboard } from '../views/supervisor/SupervisorDashboard';
import { SupervisorTeamPage } from '../views/supervisor/SupervisorTeamPage';
import { SupervisorImportPage } from '../views/supervisor/SupervisorImportPage';
import { SupervisorAllocationPage } from '../views/supervisor/SupervisorAllocationPage';
import { SupervisorAllocationHistoryPage } from '../views/supervisor/SupervisorAllocationHistoryPage';
import { SupervisorCustomersPage } from '../views/supervisor/SupervisorCustomersPage';
import { SupervisorCustomerDetailPage } from '../views/supervisor/SupervisorCustomerDetailPage';
import { SupervisorOrdersPage } from '../views/supervisor/SupervisorOrdersPage';
import { SupervisorPrintPage } from '../views/supervisor/SupervisorPrintPage';
import { SupervisorProfilePage } from '../views/supervisor/SupervisorProfilePage';

// Admin Views
import { AdminDashboard } from '../views/admin/AdminDashboard';
import { AdminUsersPage } from '../views/admin/AdminUsersPage';
import { AdminEmployeeDetailPage } from '../views/admin/AdminEmployeeDetailPage';
import { AdminReportsPage } from '../views/admin/AdminReportsPage';
import { AdminActivityPage } from '../views/admin/AdminActivityPage';
import { AdminProfilePage } from '../views/admin/AdminProfilePage';

// Finance Views
import { FinanceDashboard } from '../views/finance/FinanceDashboard';
import { FinanceExpensesPage } from '../views/finance/FinanceExpensesPage';
import { FinanceNewExpensePage } from '../views/finance/FinanceNewExpensePage';
import { FinanceCategoriesPage } from '../views/finance/FinanceCategoriesPage';
import { FinanceProfilePage } from '../views/finance/FinanceProfilePage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <Navigate to="/login" replace />,
          },
          // Team Member Routes
          {
            path: 'member',
            element: <ProtectedRoute allowedRoles={['TEAM_MEMBER']} />,
            children: [
              { path: 'dashboard', element: <MemberDashboard /> },
              { path: 'contacts', element: <MemberContactsPage /> },
              { path: 'follow-ups', element: <MemberFollowUpsPage /> },
              { path: 'leaderboard', element: <MemberLeaderboardPage /> },
              { path: 'profile', element: <MemberProfilePage /> },
            ],
          },
          // Supervisor Routes
          {
            path: 'supervisor',
            element: <ProtectedRoute allowedRoles={['SUPERVISOR']} />,
            children: [
              { path: 'dashboard', element: <SupervisorDashboard /> },
              { path: 'team', element: <SupervisorTeamPage /> },
              { path: 'import', element: <SupervisorImportPage /> },
              { path: 'allocation', element: <SupervisorAllocationPage /> },
              { path: 'allocation/history', element: <SupervisorAllocationHistoryPage /> },
              { path: 'customers', element: <SupervisorCustomersPage /> },
              { path: 'customers/:id', element: <SupervisorCustomerDetailPage /> },
              { path: 'orders', element: <SupervisorOrdersPage /> },
              { path: 'print', element: <SupervisorPrintPage /> },
              { path: 'profile', element: <SupervisorProfilePage /> },
            ],
          },
          // Admin Routes
          {
            path: 'admin',
            element: <ProtectedRoute allowedRoles={['ADMIN']} />,
            children: [
              { path: 'dashboard', element: <AdminDashboard /> },
              { path: 'users', element: <AdminUsersPage /> },
              { path: 'users/:id', element: <AdminEmployeeDetailPage /> },
              { path: 'customers', element: <SupervisorCustomersPage /> },
              { path: 'reports', element: <AdminReportsPage /> },
              { path: 'activity', element: <AdminActivityPage /> },
              { path: 'profile', element: <AdminProfilePage /> },
            ],
          },
          // Finance Routes
          {
            path: 'finance',
            element: <ProtectedRoute allowedRoles={['FINANCE']} />,
            children: [
              { path: 'dashboard', element: <FinanceDashboard /> },
              { path: 'expenses', element: <FinanceExpensesPage /> },
              { path: 'expenses/new', element: <FinanceNewExpensePage /> },
              { path: 'categories', element: <FinanceCategoriesPage /> },
              { path: 'profile', element: <FinanceProfilePage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);
