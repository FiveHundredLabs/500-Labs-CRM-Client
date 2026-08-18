import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { LoginPage } from '../views/auth/LoginPage';
import { AppShell } from '../components/navigation/AppShell';
import { ProtectedRoute } from '../components/navigation/ProtectedRoute';
import { AppProviders } from './providers';

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
import { SupervisorInterestedPage } from '../views/supervisor/SupervisorInterestedPage';
import { SupervisorCustomerDetailPage } from '../views/supervisor/SupervisorCustomerDetailPage';
import { SupervisorOrdersPage } from '../views/supervisor/SupervisorOrdersPage';
import { SupervisorReportsPage } from '../views/supervisor/SupervisorReportsPage';
import { SupervisorTeamMembersPage } from '../views/supervisor/SupervisorTeamMembersPage';
import { SupervisorProfilePage } from '../views/supervisor/SupervisorProfilePage';
import { SupervisorStockPage } from '../views/supervisor/SupervisorStockPage';

// Admin Views
import { AdminDashboard } from '../views/admin/AdminDashboard';
import { AdminUsersPage } from '../views/admin/AdminUsersPage';
import { AdminEmployeeDetailPage } from '../views/admin/AdminEmployeeDetailPage';
import { AdminReportsPage } from '../views/admin/AdminReportsPage';
import { AdminActivityPage } from '../views/admin/AdminActivityPage';
import { AdminLeaderboardsPage } from '../views/admin/AdminLeaderboardsPage';
import { AdminProfilePage } from '../views/admin/AdminProfilePage';
import { AdminApprovalsPage } from '../views/admin/AdminApprovalsPage';
import { AdminProductsPage } from '../views/admin/AdminProductsPage';

// Finance Views
import { FinanceDashboard } from '../views/finance/FinanceDashboard';
import { FinancePettyCashPage } from '../views/finance/FinancePettyCashPage';
import { FinanceExpensesPage } from '../views/finance/FinanceExpensesPage';
import { FinanceNewExpensePage } from '../views/finance/FinanceNewExpensePage';
import { FinanceCategoriesPage } from '../views/finance/FinanceCategoriesPage';
import { FinanceReportsPage } from '../views/finance/FinanceReportsPage';
import { FinanceProfilePage } from '../views/finance/FinanceProfilePage';

const RootLayout: React.FC = () => {
  return (
    <AppProviders>
      <Outlet />
    </AppProviders>
  );
};

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
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
                  { path: 'team-members', element: <SupervisorTeamMembersPage /> },
                  { path: 'reports', element: <SupervisorReportsPage /> },
                  { path: 'stock', element: <SupervisorStockPage /> },
                  { path: 'import', element: <SupervisorImportPage /> },
                  { path: 'allocation', element: <SupervisorAllocationPage /> },
                  { path: 'allocation/history', element: <SupervisorAllocationHistoryPage /> },
                  { path: 'interested', element: <SupervisorInterestedPage /> },
                  { path: 'interested/:id', element: <SupervisorCustomerDetailPage /> },
                  { path: 'customers', element: <Navigate to="/supervisor/interested" replace /> },
                  { path: 'customers/:id', element: <Navigate to="/supervisor/interested" replace /> },
                  { path: 'orders', element: <SupervisorOrdersPage /> },
                  { path: 'profile', element: <SupervisorProfilePage /> },
                ],
              },
              // Admin Routes
              {
                path: 'admin',
                element: <ProtectedRoute allowedRoles={['ADMIN']} />,
                children: [
                  { path: 'dashboard', element: <AdminDashboard /> },
                  { path: 'approvals', element: <AdminApprovalsPage /> },
                  { path: 'products', element: <AdminProductsPage /> },
                  { path: 'users', element: <AdminUsersPage /> },
                  { path: 'users/:id', element: <AdminEmployeeDetailPage /> },
                  { path: 'customers', element: <SupervisorInterestedPage /> },
                  { path: 'reports', element: <AdminReportsPage /> },
                  { path: 'leaderboards', element: <AdminLeaderboardsPage /> },
                  { path: 'activity', element: <AdminActivityPage /> },
                  { path: 'profile', element: <AdminProfilePage /> },
                  { path: 'customers/:id', element: <SupervisorCustomerDetailPage /> },
                  { path: 'orders', element: <SupervisorOrdersPage /> },
                  { path: 'import', element: <SupervisorImportPage /> },
                  { path: 'allocation', element: <SupervisorAllocationPage /> },
                  { path: 'allocation/history', element: <SupervisorAllocationHistoryPage /> },

                  // Finance Operations for Admin
                  { path: 'finance/petty-cash', element: <FinancePettyCashPage /> },
                  { path: 'finance/expenses', element: <FinanceExpensesPage /> },
                  { path: 'finance/expenses/new', element: <FinanceNewExpensePage /> },
                ],
              },
              // Finance Routes
              {
                path: 'finance',
                element: <ProtectedRoute allowedRoles={['FINANCE']} />,
                children: [
                  { path: 'dashboard', element: <FinanceDashboard /> },
                  { path: 'petty-cash', element: <FinancePettyCashPage /> },
                  { path: 'expenses', element: <FinanceExpensesPage /> },
                  { path: 'expenses/new', element: <FinanceNewExpensePage /> },
                  { path: 'reports', element: <FinanceReportsPage /> },
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
    ],
  },
]);
