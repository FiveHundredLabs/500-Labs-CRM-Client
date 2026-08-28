# Enterprise Role-Based CRM, Sales & Order Fulfillment System

A high-performance, mobile-first SaaS frontend application built for role-based CRM management, click-to-call operational workflows, order fulfillment tracking, employee performance leaderboards, delivery label printing, and finance expenditure tracking.

---

## Key Features

- **MVC-Inspired Architecture**: Strict separation of concerns (Views -> Controllers/Hooks -> Services -> Repositories -> Data Store) guaranteeing zero direct JSON imports in UI pages.
- **Relational Data Modeling**: Normalized mock entities simulating PostgreSQL foreign keys (`users.teamId`, `contacts.importedBy`, `orders.customerId`, etc.).
- **Fine-Grained RBAC**: Centralized role-based access control matrix powering 4 roles (**ADMIN**, **SUPERVISOR**, **TEAM_MEMBER**, **FINANCE**) with single-login interface.
- **Mobile-First UX**: Responsive collapsible sidebar on desktop; role-specific persistent bottom navigation bar on mobile devices (<768px).
- **Click-to-Call & Post-Call Drawer**: Native `tel:<number>` dialer trigger and outcome modal automatically creating Customer records when marked `INTERESTED`.
- **Deterministic Round-Robin Allocation**: Configurable `AllocationStrategy` pattern ignoring disabled members and saving allocation batches.
- **Order Lifecycle & Email Simulation**: Tracks status transitions (`DRAFT` -> `PREPARED` -> `DISPATCHED` -> `DELIVERED` / `REJECTED` / `RETURNED`), writing audit logs and triggering mock email delivery confirmation.
- **A4 / A6 Print Engine**: Generates 2x2 grid A4 Landscape sheets containing up to FOUR A6 Landscape (`148mm x 105mm`) delivery labels per page with `@media print` CSS rules.
- **Finance Expenditure Tracking**: Expenditure dashboard with category breakdown, custom category support, and Zod form validation.

---

## Demo Credentials (One-Tap Quick Login Available)

| Role            | Email                      | Password     | Predefined Team Context    |
| :-------------- | :------------------------- | :----------- | :------------------------- |
| **Admin**       | `admin@crm.com`            | `admin123`   | Cross-System Administrator |
| **Supervisor**  | `supervisor.alpha@crm.com` | `super123`   | Team 1: **Brand Alpha**    |
| **Supervisor**  | `supervisor.beta@crm.com`  | `super123`   | Team 2: **Brand Beta**     |
| **Team Member** | `member.a1@crm.com`        | `member123`  | Team 1: **Brand Alpha**    |
| **Team Member** | `member.b1@crm.com`        | `member123`  | Team 2: **Brand Beta**     |
| **Finance**     | `finance@crm.com`          | `finance123` | Financial Management       |

---

## Setup & Running Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Launch Development Server

```bash
npm run dev
```

### 3. Build Production Bundle

```bash
npm run build
```

---

## Backend API & Cookie Authentication

Browser API calls are same-origin and relative:

```ts
axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
});
```

On Vercel, `/api/*` is rewritten externally to `https://api.500crm.residuesolution.io/api/*`. In local development, Vite proxies `/api` to `http://localhost:3000`.

Current production topology:

- Frontend: `https://500crm-frontend.vercel.app`
- Backend: `https://api.500crm.residuesolution.io`

The browser must not call `api.500crm.residuesolution.io` directly. JWTs are stored only in backend-set HttpOnly cookies scoped to the frontend origin through the rewrite response; frontend code must not read cookies, attach Bearer tokens, or store JWTs in `localStorage`/`sessionStorage`.

---

## Architecture & Replacing `MockRepository` with `ApiRepository`

The project uses clean Repository interfaces defined in `src/repositories/interfaces/`. All repository methods return `Promise<T>` to mimic REST/GraphQL API behavior.

### To Switch to a Real PostgreSQL Backend:

1. Implement the API repository classes in `src/repositories/api/apiRepositories.ts`.
2. Update `src/repositories/index.ts` to export instances of `ApiRepository` instead of `MockRepository`:

```typescript
// src/repositories/index.ts
import { ApiUserRepository } from "./api/apiRepositories";

// Replace:
// export const userRepository = new MockUserRepository();

// With:
export const userRepository = new ApiUserRepository();
```

**Zero UI page rewrite required.**

---

## Mock Data Note

The production API path does not use browser token storage. Any `localStorage` usage in `src/repositories/mock` is only for the legacy mock repository mode and must not be used for authentication.

If mock mode is restored for local demos and you need to reset mock records, run this command in your browser developer console:

```javascript
localStorage.clear();
```

---

## Important Application Routes

- `/login` — Branded single login screen for all roles with quick demo buttons
- `/member/dashboard` — Team Member metrics, progress bar & quick follow-ups
- `/member/contacts` — Contact list with native dialer and call outcome modal
- `/member/follow-ups` — Rapid retry list for unanswered / switched-off calls
- `/member/leaderboard` — Monthly team ranking and success rate metrics
- `/supervisor/dashboard` — Team operational dashboard & quick actions
- `/supervisor/team` — Team roster, member recruitment, and account disablement
- `/supervisor/import` — Manual contact entry and CSV/Excel bulk import validator
- `/supervisor/allocation` — Round-Robin contact distribution preview & execution
- `/supervisor/customers` — Interested customers CRM and order creation
- `/supervisor/orders` — Order state machine, status transitions & delivery history
- `/supervisor/print` — A4 / A6 print preview engine
- `/admin/dashboard` — Cross-system executive KPIs & Recharts comparisons
- `/admin/users` — Cross-brand user & supervisor management
- `/admin/reports` — Analytics, conversion reports, and monthly trend graphs
- `/admin/activity` — Read-only immutable system activity log
- `/finance/dashboard` — Monthly expenditure metrics and pie chart breakdown
- `/finance/expenses/new` — New expense voucher entry with Zod validation
