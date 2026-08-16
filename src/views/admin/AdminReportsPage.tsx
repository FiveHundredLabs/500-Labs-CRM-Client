import React, { useState, useEffect, useMemo } from 'react';
import {
  contactRepository,
  orderRepository,
  customerRepository,
  userRepository,
  expenseRepository,
  activityLogRepository,
} from '../../repositories';
import { Contact, Order, Customer, User, Expense, ActivityLog } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Download, Printer, Calendar, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/currency';

type AdminReportType =
  | 'ALL_LEADS'
  | 'QUALIFIED_ORDERS'
  | 'TELECALLER_PERFORMANCE'
  | 'FINANCE_EXPENSES'
  | 'SECURITY_AUDIT'
  | 'USER_DIRECTORY';

interface EnrichedOrder extends Order {
  customer?: Customer;
}

export const AdminReportsPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Report Name & Team Filter
  const [reportType, setReportType] = useState<AdminReportType>('ALL_LEADS');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');

  // 2. Date Range State
  const [datePreset, setDatePreset] = useState<string>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 3. Export Format (CSV or PDF)
  const [exportFormat, setExportFormat] = useState<'CSV' | 'PDF'>('CSV');

  // Printable Statement Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    const loadAllSystemData = async () => {
      setLoading(true);
      try {
        const [cList, oList, custList, uList, eList, aList] = await Promise.all([
          contactRepository.getAll(),
          orderRepository.getAll(),
          customerRepository.getAll(),
          userRepository.getAll(),
          expenseRepository.getAll(),
          activityLogRepository.getAll(),
        ]);

        const custMap: Record<string, Customer> = {};
        custList.forEach((c) => (custMap[c.id] = c));

        const enrichedOrders: EnrichedOrder[] = oList.map((o) => ({
          ...o,
          customer: custMap[o.customerId],
        }));

        setContacts(cList);
        setOrders(enrichedOrders);
        setUsers(uList);
        setExpenses(eList);
        setActivities(aList);
      } finally {
        setLoading(false);
      }
    };
    loadAllSystemData();
  }, []);

  // Quick Date Preset Change
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(format(firstDay, 'yyyy-MM-dd'));
      setEndDate(format(lastDay, 'yyyy-MM-dd'));
    } else if (preset === 'LAST_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(format(firstDay, 'yyyy-MM-dd'));
      setEndDate(format(lastDay, 'yyyy-MM-dd'));
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay();
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - day);
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);
      setStartDate(format(firstDay, 'yyyy-MM-dd'));
      setEndDate(format(lastDay, 'yyyy-MM-dd'));
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  useEffect(() => {
    handlePresetChange('THIS_MONTH');
  }, []);

  const usersMap = useMemo(() => {
    const map: Record<string, User> = {};
    users.forEach((u) => (map[u.id] = u));
    return map;
  }, [users]);

  // Helper date checker
  const isDateInRange = (dateStr: string) => {
    if (!dateStr) return true;
    const formatted = dateStr.slice(0, 10);
    if (startDate && formatted < startDate) return false;
    if (endDate && formatted > endDate) return false;
    return true;
  };

  // Filtered dataset according to selected report type
  const reportData = useMemo(() => {
    switch (reportType) {
      case 'ALL_LEADS':
        return contacts.filter((c) => {
          const matchTeam = teamFilter === 'ALL' || c.teamId === teamFilter;
          const matchDate = isDateInRange(c.importedAt || c.updatedAt);
          return matchTeam && matchDate;
        });

      case 'QUALIFIED_ORDERS':
        return orders.filter((o) => {
          const matchTeam = teamFilter === 'ALL' || o.teamId === teamFilter;
          const matchDate = isDateInRange(o.createdAt);
          return matchTeam && matchDate;
        });

      case 'TELECALLER_PERFORMANCE': {
        const teamMembers = users.filter(
          (u) => u.role === 'TEAM_MEMBER' && (teamFilter === 'ALL' || u.teamId === teamFilter)
        );

        return teamMembers.map((member) => {
          const memberContacts = contacts.filter(
            (c) => c.allocatedToId === member.id && isDateInRange(c.allocatedAt || c.updatedAt)
          );
          const calledContacts = memberContacts.filter((c) => c.status !== 'NEW');
          const interestedContacts = memberContacts.filter((c) => c.status === 'INTERESTED');
          const dispatchedCount = memberContacts.filter(
            (c) => c.status === 'DISPATCHED' || c.status === 'DELIVERED'
          );
          const conversionRate =
            calledContacts.length > 0
              ? Math.round((interestedContacts.length / calledContacts.length) * 100)
              : 0;

          return {
            id: member.id,
            name: member.fullName,
            email: member.email,
            phone: member.phone,
            teamId: member.teamId,
            city: member.city,
            totalAssigned: memberContacts.length,
            totalCalled: calledContacts.length,
            interested: interestedContacts.length,
            conversions: dispatchedCount.length,
            conversionRate,
          };
        });
      }

      case 'FINANCE_EXPENSES':
        return expenses.filter((e) => isDateInRange(e.expenseDate || e.createdAt));

      case 'SECURITY_AUDIT':
        return activities.filter((a) => {
          const matchTeam = teamFilter === 'ALL' || !a.teamId || a.teamId === teamFilter;
          const matchDate = isDateInRange(a.createdAt);
          return matchTeam && matchDate;
        });

      case 'USER_DIRECTORY':
        return users.filter((u) => {
          const matchTeam = teamFilter === 'ALL' || !u.teamId || u.teamId === teamFilter;
          const matchDate = isDateInRange(u.joiningDate || u.createdAt);
          return matchTeam && matchDate;
        });

      default:
        return [];
    }
  }, [reportType, teamFilter, startDate, endDate, contacts, orders, users, expenses, activities]);

  const getReportTitleLabel = () => {
    switch (reportType) {
      case 'ALL_LEADS':
        return 'Contacts & Leads Allocation Pipeline Report';
      case 'QUALIFIED_ORDERS':
        return 'Orders & Delivery Fulfillment Audit Report';
      case 'TELECALLER_PERFORMANCE':
        return 'Sales Specialists Tele-Calling Performance Report';
      case 'FINANCE_EXPENSES':
        return 'System-Wide Operational Expenditures & Finance Report';
      case 'SECURITY_AUDIT':
        return 'Security & User Activity Audit Logs Report';
      case 'USER_DIRECTORY':
        return 'Employee & System Accounts Directory Report';
    }
  };

  // CSV Generator Handler
  const generateCSV = () => {
    if (reportData.length === 0) {
      toast.error('No records found for the selected report options.');
      return;
    }

    let headers: string[] = [];
    let rows: string[][] = [];

    if (reportType === 'ALL_LEADS') {
      headers = ['Contact ID', 'Phone Number', 'Calling Status', 'Team', 'Assigned Specialist', 'Import Date', 'Attempt Count'];
      rows = (reportData as Contact[]).map((c) => [
        c.id,
        c.phone,
        c.status,
        c.teamId === 'team_001' ? 'Brand Alpha' : 'Brand Beta',
        c.allocatedToId && usersMap[c.allocatedToId] ? usersMap[c.allocatedToId].fullName : 'Unallocated',
        c.importedAt ? format(new Date(c.importedAt), 'yyyy-MM-dd') : '',
        String(c.attemptCount || 0),
      ]);
    } else if (reportType === 'QUALIFIED_ORDERS') {
      headers = ['Order ID', 'Order Number', 'Customer Name', 'Customer Phone', 'Items Description', 'Total Amount (LKR)', 'Status', 'Team', 'Created At'];
      rows = (reportData as EnrichedOrder[]).map((o) => [
        o.id,
        o.orderNumber,
        `"${(o.customer?.fullName || 'Customer').replace(/"/g, '""')}"`,
        o.customer?.phone || '',
        `"${o.itemsDescription.replace(/"/g, '""')}"`,
        o.totalAmount.toFixed(2),
        o.status,
        o.teamId === 'team_001' ? 'Brand Alpha' : 'Brand Beta',
        format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm'),
      ]);
    } else if (reportType === 'TELECALLER_PERFORMANCE') {
      headers = ['Salesman ID', 'Name', 'Phone', 'Team', 'City', 'Assigned Contacts', 'Calls Made', 'Interested Leads', 'Orders Placed', 'Conversion Rate %'];
      rows = (reportData as any[]).map((r) => [
        r.id,
        `"${r.name.replace(/"/g, '""')}"`,
        r.phone,
        r.teamId === 'team_001' ? 'Brand Alpha' : 'Brand Beta',
        r.city,
        String(r.totalAssigned),
        String(r.totalCalled),
        String(r.interested),
        String(r.conversions),
        `${r.conversionRate}%`,
      ]);
    } else if (reportType === 'FINANCE_EXPENSES') {
      headers = ['Voucher ID', 'Category', 'Expense Date', 'Remarks', 'Recorded By', 'Amount (LKR)'];
      rows = (reportData as Expense[]).map((e) => [
        e.id,
        `"${e.categoryName.replace(/"/g, '""')}"`,
        e.expenseDate,
        `"${e.remarks.replace(/"/g, '""')}"`,
        `"${e.createdByName.replace(/"/g, '""')}"`,
        e.amount.toFixed(2),
      ]);
    } else if (reportType === 'SECURITY_AUDIT') {
      headers = ['Log ID', 'Timestamp', 'User Name', 'Role', 'Action', 'Entity', 'Description'];
      rows = (reportData as ActivityLog[]).map((a) => [
        a.id,
        format(new Date(a.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        `"${a.userName.replace(/"/g, '""')}"`,
        a.userRole,
        a.action,
        a.entityType,
        `"${a.description.replace(/"/g, '""')}"`,
      ]);
    } else if (reportType === 'USER_DIRECTORY') {
      headers = ['User ID', 'Full Name', 'Email', 'Phone', 'Role', 'Team', 'City', 'NIC', 'Status', 'Joined Date'];
      rows = (reportData as User[]).map((u) => [
        u.id,
        `"${u.fullName.replace(/"/g, '""')}"`,
        u.email,
        u.phone,
        u.role,
        u.teamId ? (u.teamId === 'team_001' ? 'Brand Alpha' : 'Brand Beta') : 'All Teams',
        u.city,
        u.nic || '',
        u.isActive ? 'ACTIVE' : 'DISABLED',
        format(new Date(u.joiningDate), 'yyyy-MM-dd'),
      ]);
    }

    const csvContent = [
      `"Report Name","${getReportTitleLabel()}"`,
      `"Generated Date","${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}"`,
      `"Team / Brand Filter","${teamFilter === 'ALL' ? 'All Teams' : teamFilter === 'team_001' ? 'Brand Alpha' : 'Brand Beta'}"`,
      `"Date Range","${startDate || 'All Time'} to ${endDate || 'Present'}"`,
      `"Total Records","${reportData.length}"`,
      '',
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Admin_Report_${reportType}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Admin CSV report downloaded successfully!');
  };

  // Form Submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reportData.length === 0) {
      toast.error('No matching records found for the selected options.');
      return;
    }

    if (exportFormat === 'CSV') {
      generateCSV();
    } else {
      setIsPrintModalOpen(true);
    }
  };

  if (loading) return <LoadingState rows={8} />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Admin System Reports"
        description="Select report name, date range, and generate system-wide CSV spreadsheets or official PDF statements"
      />

      {/* Simple 3-Step Report Selection Form */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="bg-slate-50/80 border-b border-slate-200 pb-4">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Generate System Report</span>
          </CardTitle>
          <CardDescription>
            Configure report parameters, date filters, and export format
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Step 1: Select Report Name & Scope */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-extrabold">1</span>
                <span>Select System Report Type</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Report Specification</label>
                  <Select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as AdminReportType)}
                    options={[
                      { value: 'ALL_LEADS', label: '1. Contacts & Leads Pipeline Report' },
                      { value: 'QUALIFIED_ORDERS', label: '2. Orders & Delivery Fulfillment Report' },
                      { value: 'TELECALLER_PERFORMANCE', label: '3. Sales Specialists Tele-Calling Performance Report' },
                      { value: 'FINANCE_EXPENSES', label: '4. System-Wide Operational Expenditures Report' },
                      { value: 'SECURITY_AUDIT', label: '5. Security & User Activity Audit Log Report' },
                      { value: 'USER_DIRECTORY', label: '6. Employee & System Accounts Directory Report' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Team / Brand Scope</label>
                  <Select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    options={[
                      { value: 'ALL', label: 'All Teams (Alpha & Beta)' },
                      { value: 'team_001', label: 'Brand Alpha' },
                      { value: 'team_002', label: 'Brand Beta' },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Select Date Range */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-extrabold">2</span>
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Select Date Range</span>
              </label>

              <Select
                value={datePreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                options={[
                  { value: 'THIS_MONTH', label: 'This Month' },
                  { value: 'LAST_MONTH', label: 'Last Month' },
                  { value: 'THIS_WEEK', label: 'This Week' },
                  { value: 'ALL', label: 'All Time' },
                  { value: 'CUSTOM', label: 'Custom Date Range' },
                ]}
              />

              {/* Custom Date Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setDatePreset('CUSTOM');
                      setStartDate(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setDatePreset('CUSTOM');
                      setEndDate(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Select Format (CSV or PDF) */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-extrabold">3</span>
                <span>Select Type of Report Format</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                    exportFormat === 'CSV'
                      ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value="CSV"
                    checked={exportFormat === 'CSV'}
                    onChange={() => setExportFormat('CSV')}
                    className="text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-emerald-600" />
                      <span>CSV Spreadsheet (.csv)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Instant CSV data file download</div>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                    exportFormat === 'PDF'
                      ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value="PDF"
                    checked={exportFormat === 'PDF'}
                    onChange={() => setExportFormat('PDF')}
                    className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Printer className="w-4 h-4 text-blue-600" />
                      <span>PDF Audit Statement (.pdf)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Print or Save as PDF document</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Footer */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600">
                Matching System Records: <strong className="text-slate-900 font-mono">{reportData.length} entries</strong>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                leftIcon={exportFormat === 'CSV' ? <Download className="w-4 h-4" /> : <Printer className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                {exportFormat === 'CSV' ? 'Download CSV Report' : 'Generate PDF Statement'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Preview Table of Matching Records */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Report Preview Data ({getReportTitleLabel()})</span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
              {reportData.length} Records
            </span>
          </CardTitle>
          <CardDescription>
            Review preview rows that will be included in the generated report
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {reportData.length === 0 ? (
            <EmptyState title="No records found" description="Adjust your report type or date range." />
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0">
                  {reportType === 'ALL_LEADS' && (
                    <tr>
                      <th className="py-3 px-4">Contact ID</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Team</th>
                      <th className="py-3 px-4">Assigned Salesman</th>
                      <th className="py-3 px-4">Imported At</th>
                    </tr>
                  )}
                  {reportType === 'QUALIFIED_ORDERS' && (
                    <tr>
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Items Description</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  )}
                  {reportType === 'TELECALLER_PERFORMANCE' && (
                    <tr>
                      <th className="py-3 px-4">Specialist</th>
                      <th className="py-3 px-4">Team</th>
                      <th className="py-3 px-4 text-center">Assigned</th>
                      <th className="py-3 px-4 text-center">Called</th>
                      <th className="py-3 px-4 text-center">Interested</th>
                      <th className="py-3 px-4 text-right">Conversion %</th>
                    </tr>
                  )}
                  {reportType === 'FINANCE_EXPENSES' && (
                    <tr>
                      <th className="py-3 px-4">Voucher ID</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Remarks</th>
                      <th className="py-3 px-4 text-right">Amount (LKR)</th>
                    </tr>
                  )}
                  {reportType === 'SECURITY_AUDIT' && (
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Description</th>
                    </tr>
                  )}
                  {reportType === 'USER_DIRECTORY' && (
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Team</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportType === 'ALL_LEADS' &&
                    (reportData as Contact[]).map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">{c.id}</td>
                        <td className="py-3 px-4 font-mono">{c.phone}</td>
                        <td className="py-3 px-4">
                          <StatusBadge type="contact" status={c.status} />
                        </td>
                        <td className="py-3 px-4">{c.teamId === 'team_001' ? 'Brand Alpha' : 'Brand Beta'}</td>
                        <td className="py-3 px-4">
                          {c.allocatedToId && usersMap[c.allocatedToId] ? usersMap[c.allocatedToId].fullName : 'Unallocated'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-xs">
                          {c.importedAt ? format(new Date(c.importedAt), 'MMM dd, yyyy') : '-'}
                        </td>
                      </tr>
                    ))}

                  {reportType === 'QUALIFIED_ORDERS' &&
                    (reportData as EnrichedOrder[]).map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">{o.orderNumber || o.id}</td>
                        <td className="py-3 px-4 font-medium">{o.customer?.fullName || 'Customer'}</td>
                        <td className="py-3 px-4 font-mono">{o.customer?.phone || '-'}</td>
                        <td className="py-3 px-4 text-xs text-slate-600 truncate max-w-xs">{o.itemsDescription}</td>
                        <td className="py-3 px-4">
                          <StatusBadge type="order" status={o.status} />
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(o.totalAmount)}
                        </td>
                      </tr>
                    ))}

                  {reportType === 'TELECALLER_PERFORMANCE' &&
                    (reportData as any[]).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{r.name}</td>
                        <td className="py-3 px-4">{r.teamId === 'team_001' ? 'Brand Alpha' : 'Brand Beta'}</td>
                        <td className="py-3 px-4 text-center font-mono">{r.totalAssigned}</td>
                        <td className="py-3 px-4 text-center font-mono">{r.totalCalled}</td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-blue-600">{r.interested}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                          {r.conversionRate}%
                        </td>
                      </tr>
                    ))}

                  {reportType === 'FINANCE_EXPENSES' &&
                    (reportData as Expense[]).map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">{e.id}</td>
                        <td className="py-3 px-4 font-semibold text-blue-700">{e.categoryName}</td>
                        <td className="py-3 px-4 font-mono">{e.expenseDate}</td>
                        <td className="py-3 px-4 truncate max-w-xs">{e.remarks}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(e.amount)}
                        </td>
                      </tr>
                    ))}

                  {reportType === 'SECURITY_AUDIT' &&
                    (reportData as ActivityLog[]).map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">
                          {format(new Date(a.createdAt), 'MMM dd • HH:mm:ss')}
                        </td>
                        <td className="py-3 px-4 font-semibold">{a.userName}</td>
                        <td className="py-3 px-4 text-xs">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">{a.userRole}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-blue-700 text-xs">{a.action}</td>
                        <td className="py-3 px-4 text-slate-600 text-xs">{a.description}</td>
                      </tr>
                    ))}

                  {reportType === 'USER_DIRECTORY' &&
                    (reportData as User[]).map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{u.fullName}</div>
                          <div className="text-xs text-slate-400 font-mono">{u.id}</div>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div>{u.email}</div>
                          <div className="font-mono text-slate-500">{u.phone}</div>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold">{u.role}</td>
                        <td className="py-3 px-4 text-xs">
                          {u.teamId ? (u.teamId === 'team_001' ? 'Brand Alpha' : 'Brand Beta') : 'All Teams'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge type="user" status={String(u.isActive)} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Printable PDF Statement Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Official System PDF Report Statement</h3>
                <p className="text-xs text-slate-500">Ready to print or save as PDF document</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="primary" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
                  Print / Save as PDF
                </Button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Sheet */}
            <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-6 font-sans text-slate-900 printable-document">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="text-xl font-black tracking-tight text-slate-900">500 LABS CRM ENTERPRISE</div>
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-0.5">
                    {getReportTitleLabel()}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500 space-y-0.5 font-mono">
                  <div>Statement Ref: #ADM-{format(new Date(), 'yyyyMMdd-HHmm')}</div>
                  <div>Generated: {format(new Date(), 'MMM dd, yyyy hh:mm a')}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Report Scope:</span>
                  <div className="font-bold text-slate-900 mt-0.5 truncate">{teamFilter === 'ALL' ? 'All Teams' : teamFilter}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Date Interval:</span>
                  <div className="font-bold text-slate-900 mt-0.5 font-mono">
                    {startDate || 'All Time'} to {endDate || 'Present'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Matching Entries:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{reportData.length} Records</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">System Authorization:</span>
                  <div className="font-bold text-emerald-700 mt-0.5">ADMIN VERIFIED</div>
                </div>
              </div>

              {/* Printable Table */}
              <div className="text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase font-semibold text-[10px] border-y border-slate-300">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Reference / ID</th>
                      <th className="py-2 px-3">Primary Detail</th>
                      <th className="py-2 px-3">Team / Role</th>
                      <th className="py-2 px-3">Status / Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.slice(0, 100).map((row: any, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{row.orderNumber || row.id}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {row.phone || row.customer?.fullName || row.name || row.categoryName || row.userName || row.fullName}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {row.teamId === 'team_001' ? 'Brand Alpha' : row.teamId === 'team_002' ? 'Brand Beta' : row.role || row.action || 'General'}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {row.status || row.expenseDate || row.createdAt?.slice(0, 10) || row.joiningDate?.slice(0, 10) || 'ACTIVE'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-10 grid grid-cols-2 gap-8 text-xs border-t border-slate-200">
                <div className="space-y-8">
                  <div className="border-b border-slate-400 w-48" />
                  <div>
                    <p className="font-bold text-slate-900">System Administrator Sign-off</p>
                    <p className="text-[11px] text-slate-500">Administrator Authority (500 Labs CRM)</p>
                  </div>
                </div>
                <div className="space-y-8">
                  <div className="border-b border-slate-400 w-48" />
                  <div>
                    <p className="font-bold text-slate-900">Official System Seal & Stamp</p>
                    <p className="text-[11px] text-slate-500">Security & Operational Compliance Verified</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
