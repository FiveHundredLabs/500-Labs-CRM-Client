import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AppShell } from "../components/navigation/AppShell";
import { ProtectedRoute } from "../components/navigation/ProtectedRoute";
import { RoleLanding } from "../components/navigation/RoleLanding";
import { LoadingState } from "../components/shared/LoadingState";

const SuspenseWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<LoadingState showHeader={false} showStats={false} />}>
    {children}
  </Suspense>
);

// Public Views (lazy)
const LoginPage = lazy(() =>
  import("../views/auth/LoginPage").then((m) => ({ default: m.LoginPage }))
);
const PublicParcelSlipPage = lazy(() =>
  import("../views/public/PublicParcelSlipPage").then((m) => ({
    default: m.PublicParcelSlipPage,
  }))
);

// Member Views (lazy)
const MemberDashboard = lazy(() =>
  import("../views/member/MemberDashboard").then((m) => ({
    default: m.MemberDashboard,
  }))
);
const MemberSalesPage = lazy(() =>
  import("../views/member/MemberSalesPage").then((m) => ({
    default: m.MemberSalesPage,
  }))
);
const MemberContactsPage = lazy(() =>
  import("../views/member/MemberContactsPage").then((m) => ({
    default: m.MemberContactsPage,
  }))
);
const MemberFollowUpsPage = lazy(() =>
  import("../views/member/MemberFollowUpsPage").then((m) => ({
    default: m.MemberFollowUpsPage,
  }))
);
const MemberImportPage = lazy(() =>
  import("../views/member/MemberImportPage").then((m) => ({
    default: m.MemberImportPage,
  }))
);
const MemberLeaderboardPage = lazy(() =>
  import("../views/member/MemberLeaderboardPage").then((m) => ({
    default: m.MemberLeaderboardPage,
  }))
);
const MemberProfilePage = lazy(() =>
  import("../views/member/MemberProfilePage").then((m) => ({
    default: m.MemberProfilePage,
  }))
);

// Supervisor Views (lazy)
const SupervisorDashboard = lazy(() =>
  import("../views/supervisor/SupervisorDashboard").then((m) => ({
    default: m.SupervisorDashboard,
  }))
);
const SupervisorTeamPage = lazy(() =>
  import("../views/supervisor/SupervisorTeamPage").then((m) => ({
    default: m.SupervisorTeamPage,
  }))
);
const SupervisorImportPage = lazy(() =>
  import("../views/supervisor/SupervisorImportPage").then((m) => ({
    default: m.SupervisorImportPage,
  }))
);
const SupervisorAllocationPage = lazy(() =>
  import("../views/supervisor/SupervisorAllocationPage").then((m) => ({
    default: m.SupervisorAllocationPage,
  }))
);
const SupervisorAllocationHistoryPage = lazy(() =>
  import("../views/supervisor/SupervisorAllocationHistoryPage").then((m) => ({
    default: m.SupervisorAllocationHistoryPage,
  }))
);
const SupervisorInterestedPage = lazy(() =>
  import("../views/supervisor/SupervisorInterestedPage").then((m) => ({
    default: m.SupervisorInterestedPage,
  }))
);
const SupervisorCustomerDetailPage = lazy(() =>
  import("../views/supervisor/SupervisorCustomerDetailPage").then((m) => ({
    default: m.SupervisorCustomerDetailPage,
  }))
);
const SupervisorOrdersPage = lazy(() =>
  import("../views/supervisor/SupervisorOrdersPage").then((m) => ({
    default: m.SupervisorOrdersPage,
  }))
);
const SupervisorReportsPage = lazy(() =>
  import("../views/supervisor/SupervisorReportsPage").then((m) => ({
    default: m.SupervisorReportsPage,
  }))
);
const SupervisorTeamMembersPage = lazy(() =>
  import("../views/supervisor/SupervisorTeamMembersPage").then((m) => ({
    default: m.SupervisorTeamMembersPage,
  }))
);
const SupervisorProfilePage = lazy(() =>
  import("../views/supervisor/SupervisorProfilePage").then((m) => ({
    default: m.SupervisorProfilePage,
  }))
);
const SupervisorStockPage = lazy(() =>
  import("../views/supervisor/SupervisorStockPage").then((m) => ({
    default: m.SupervisorStockPage,
  }))
);
const SupervisorCashOnHandPage = lazy(() =>
  import("../views/supervisor/SupervisorCashOnHandPage").then((m) => ({
    default: m.SupervisorCashOnHandPage,
  }))
);

// Admin Views (lazy)
const AdminDashboard = lazy(() =>
  import("../views/admin/AdminDashboard").then((m) => ({
    default: m.AdminDashboard,
  }))
);
const AdminUsersPage = lazy(() =>
  import("../views/admin/AdminUsersPage").then((m) => ({
    default: m.AdminUsersPage,
  }))
);
const AdminEmployeeDetailPage = lazy(() =>
  import("../views/admin/AdminEmployeeDetailPage").then((m) => ({
    default: m.AdminEmployeeDetailPage,
  }))
);
const AdminReportsPage = lazy(() =>
  import("../views/admin/AdminReportsPage").then((m) => ({
    default: m.AdminReportsPage,
  }))
);
const AdminActivityPage = lazy(() =>
  import("../views/admin/AdminActivityPage").then((m) => ({
    default: m.AdminActivityPage,
  }))
);
const AdminLeaderboardsPage = lazy(() =>
  import("../views/admin/AdminLeaderboardsPage").then((m) => ({
    default: m.AdminLeaderboardsPage,
  }))
);
const AdminProfilePage = lazy(() =>
  import("../views/admin/AdminProfilePage").then((m) => ({
    default: m.AdminProfilePage,
  }))
);
const AdminApprovalsPage = lazy(() =>
  import("../views/admin/AdminApprovalsPage").then((m) => ({
    default: m.AdminApprovalsPage,
  }))
);
const AdminProductsPage = lazy(() =>
  import("../views/admin/AdminProductsPage").then((m) => ({
    default: m.AdminProductsPage,
  }))
);
const AdminSalesGoalsPage = lazy(() =>
  import("../views/admin/AdminSalesGoalsPage").then((m) => ({
    default: m.AdminSalesGoalsPage,
  }))
);
const AdminSupervisorGoalsPage = lazy(() =>
  import("../views/admin/AdminSupervisorGoalsPage").then((m) => ({
    default: m.AdminSupervisorGoalsPage,
  }))
);
const AdminTeamsPage = lazy(() =>
  import("../views/admin/AdminTeamsPage").then((m) => ({
    default: m.AdminTeamsPage,
  }))
);

// Finance Views (lazy)
const FinanceDashboard = lazy(() =>
  import("../views/finance/FinanceDashboard").then((m) => ({
    default: m.FinanceDashboard,
  }))
);
const FinanceSalesAnalysisPage = lazy(() =>
  import("../views/finance/FinanceSalesAnalysisPage").then((m) => ({
    default: m.FinanceSalesAnalysisPage,
  }))
);
const FinancePettyCashPage = lazy(() =>
  import("../views/finance/FinancePettyCashPage").then((m) => ({
    default: m.FinancePettyCashPage,
  }))
);
const FinanceExpensesPage = lazy(() =>
  import("../views/finance/FinanceExpensesPage").then((m) => ({
    default: m.FinanceExpensesPage,
  }))
);
const FinanceNewExpensePage = lazy(() =>
  import("../views/finance/FinanceNewExpensePage").then((m) => ({
    default: m.FinanceNewExpensePage,
  }))
);
const FinanceCategoriesPage = lazy(() =>
  import("../views/finance/FinanceCategoriesPage").then((m) => ({
    default: m.FinanceCategoriesPage,
  }))
);
const FinanceReportsPage = lazy(() =>
  import("../views/finance/FinanceReportsPage").then((m) => ({
    default: m.FinanceReportsPage,
  }))
);
const FinanceProfilePage = lazy(() =>
  import("../views/finance/FinanceProfilePage").then((m) => ({
    default: m.FinanceProfilePage,
  }))
);
const FinanceInventoryPage = lazy(() =>
  import("../views/finance/FinanceInventoryPage").then((m) => ({
    default: m.FinanceInventoryPage,
  }))
);
const FinanceExpenseApprovalsPage = lazy(() =>
  import("../views/finance/FinanceExpenseApprovalsPage").then((m) => ({
    default: m.FinanceExpenseApprovalsPage,
  }))
);

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    children: [
      {
        path: "/login",
        element: (
          <SuspenseWrapper>
            <LoginPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "/parcel/:token",
        element: (
          <SuspenseWrapper>
            <PublicParcelSlipPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "/",
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              {
                index: true,
                element: <RoleLanding />,
              },
              // Team Member Routes
              {
                path: "member",
                element: <ProtectedRoute allowedRoles={["TEAM_MEMBER"]} />,
                children: [
                  { path: "dashboard", element: <MemberDashboard /> },
                  { path: "sales", element: <MemberSalesPage /> },
                  { path: "contacts", element: <MemberContactsPage /> },
                  { path: "follow-ups", element: <MemberFollowUpsPage /> },
                  { path: "import", element: <MemberImportPage /> },
                  { path: "leaderboard", element: <MemberLeaderboardPage /> },
                  { path: "profile", element: <MemberProfilePage /> },
                ],
              },
              // Supervisor Routes
              {
                path: "supervisor",
                element: <ProtectedRoute allowedRoles={["SUPERVISOR"]} />,
                children: [
                  { path: "dashboard", element: <SupervisorDashboard /> },
                  { path: "team", element: <SupervisorTeamPage /> },
                  {
                    path: "team-members",
                    element: <SupervisorTeamMembersPage />,
                  },
                  {
                    path: "leaderboard",
                    element: <SupervisorTeamMembersPage />,
                  },
                  { path: "reports", element: <SupervisorReportsPage /> },
                  { path: "stock", element: <SupervisorStockPage /> },
                  { path: "import", element: <SupervisorImportPage /> },
                  { path: "allocation", element: <SupervisorAllocationPage /> },
                  {
                    path: "allocation/history",
                    element: <SupervisorAllocationHistoryPage />,
                  },
                  { path: "interested", element: <SupervisorInterestedPage /> },
                  {
                    path: "interested/:id",
                    element: <SupervisorCustomerDetailPage />,
                  },
                  {
                    path: "customers",
                    element: <Navigate to="/supervisor/interested" replace />,
                  },
                  {
                    path: "customers/:id",
                    element: <Navigate to="/supervisor/interested" replace />,
                  },
                  { path: "cash-on-hand", element: <SupervisorCashOnHandPage /> },
                  { path: "orders", element: <SupervisorOrdersPage /> },
                  { path: "profile", element: <SupervisorProfilePage /> },
                ],
              },
              // Admin Routes
              {
                path: "admin",
                element: <ProtectedRoute allowedRoles={["ADMIN"]} />,
                children: [
                  { path: "dashboard", element: <AdminDashboard /> },
                  { path: "sales-goals", element: <AdminSalesGoalsPage /> },
                  { path: "supervisor-goals", element: <AdminSupervisorGoalsPage /> },
                  { path: "teams", element: <AdminTeamsPage /> },
                  { path: "approvals", element: <AdminApprovalsPage /> },
                  { path: "products", element: <AdminProductsPage /> },
                  { path: "users", element: <AdminUsersPage /> },
                  { path: "users/:id", element: <AdminEmployeeDetailPage /> },
                  { path: "customers", element: <SupervisorInterestedPage /> },
                  { path: "cash-on-hand", element: <SupervisorCashOnHandPage /> },
                  { path: "reports", element: <AdminReportsPage /> },
                  { path: "reports/:reportId", element: <AdminReportsPage /> },
                  { path: "leaderboards", element: <AdminLeaderboardsPage /> },
                  { path: "activity", element: <AdminActivityPage /> },
                  { path: "profile", element: <AdminProfilePage /> },
                  {
                    path: "customers/:id",
                    element: <SupervisorCustomerDetailPage />,
                  },
                  { path: "orders", element: <SupervisorOrdersPage /> },
                  { path: "stock", element: <SupervisorStockPage /> },
                  { path: "team", element: <SupervisorTeamPage /> },
                  { path: "team-members", element: <SupervisorTeamMembersPage /> },
                  { path: "import", element: <SupervisorImportPage /> },
                  { path: "allocation", element: <SupervisorAllocationPage /> },
                  {
                    path: "allocation/history",
                    element: <SupervisorAllocationHistoryPage />,
                  },

                  // Finance Operations for Admin
                  {
                    path: "finance/dashboard",
                    element: <FinanceDashboard />,
                  },
                  {
                    path: "finance/sales-analysis",
                    element: <FinanceSalesAnalysisPage />,
                  },
                  {
                    path: "finance/petty-cash",
                    element: <FinancePettyCashPage />,
                  },
                  {
                    path: "finance/expenses",
                    element: <FinanceExpensesPage />,
                  },
                  {
                    path: "finance/expenses/new",
                    element: <FinanceNewExpensePage />,
                  },
                  {
                    path: "finance/inventory",
                    element: <FinanceInventoryPage />,
                  },
                  {
                    path: "finance/approvals",
                    element: <FinanceExpenseApprovalsPage />,
                  },
                  {
                    path: "finance/reports",
                    element: <FinanceReportsPage />,
                  },
                  {
                    path: "finance/reports/:reportId",
                    element: <FinanceReportsPage />,
                  },
                  {
                    path: "finance/categories",
                    element: <FinanceCategoriesPage />,
                  },
                ],
              },
              // Finance Routes
              {
                path: "finance",
                element: <ProtectedRoute allowedRoles={["FINANCE", "ADMIN"]} />,
                children: [
                  {
                    path: "dashboard",
                    element: <FinanceDashboard />,
                  },
                  {
                    path: "sales-analysis",
                    element: <FinanceSalesAnalysisPage />,
                  },
                  {
                    path: "petty-cash",
                    element: <FinancePettyCashPage />,
                  },
                  {
                    path: "expenses",
                    element: <FinanceExpensesPage />,
                  },
                  {
                    path: "expenses/new",
                    element: <FinanceNewExpensePage />,
                  },
                  {
                    path: "inventory",
                    element: <FinanceInventoryPage />,
                  },
                  {
                    path: "approvals",
                    element: <FinanceExpenseApprovalsPage />,
                  },
                  {
                    path: "reports",
                    element: <FinanceReportsPage />,
                  },
                  {
                    path: "reports/:reportId",
                    element: <FinanceReportsPage />,
                  },
                  {
                    path: "categories",
                    element: <FinanceCategoriesPage />,
                  },
                  { path: "profile", element: <FinanceProfilePage /> },
                ],
              },
            ],
          },
        ],
      },
      {
        path: "*",
        element: <Navigate to="/login" replace />,
      },
    ],
  },
]);
