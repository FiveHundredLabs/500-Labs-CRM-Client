import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type {
  ApprovalRequest,
  ApprovalStatus,
  ApprovalType,
  Team,
  Product,
  OrderRejectionRequest,
  OrderRejectionDamagedItem,
  OrderStatus,
  CashOnHandHandover,
  CashOnHandStatus,
} from '../../models/domain';
import {
  approvalRequestRepository,
  teamRepository,
  productRepository,
  orderRejectionRepository,
  cashOnHandRepository,
} from '../../repositories';
import { ActivityLogService } from '../../services/activityLogService';
import { getTeamBranding } from '../../config/branding';
import { formatCurrency } from '../../utils/currency';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { LoadingState } from '../../components/shared/LoadingState';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Package,
  DollarSign,
  Eye,
  Building2,
  Boxes,
  Layers,
  ArrowRight,
  TrendingUp,
  FileText,
  User,
  Calendar,
  RotateCcw,
  Check,
  AlertTriangle,
  Lock,
  Truck,
  Search,
  Banknote,
} from 'lucide-react';
import { format } from 'date-fns';

export const AdminApprovalsPage: React.FC = () => {
  const { user } = useAuth();

  // Stock & Pricing Requests State
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'ALL'>('PENDING');

  // Order Rejection & Transition Requests State
  const [orderRejections, setOrderRejections] = useState<OrderRejectionRequest[]>([]);
  const [rejectionStatusFilter, setRejectionStatusFilter] = useState<ApprovalStatus | 'ALL'>('PENDING');

  // Cash on Hand Handovers State
  const [cashHandovers, setCashHandovers] = useState<CashOnHandHandover[]>([]);
  const [cashStatusFilter, setCashStatusFilter] = useState<CashOnHandStatus | 'ALL'>('PENDING');
  const [activeMainTab, setActiveMainTab] = useState<'ALL' | 'CASH_ON_HAND' | 'STOCK_PRICE' | 'ORDER_TRANSITIONS'>('ALL');

  // Cash on Hand Modals State
  const [viewingCashHandover, setViewingCashHandover] = useState<CashOnHandHandover | null>(null);
  const [approvingCashHandover, setApprovingCashHandover] = useState<CashOnHandHandover | null>(null);
  const [cashApproveOutcome, setCashApproveOutcome] = useState<'DELIVERED' | 'DISPATCHED' | ''>('');
  const [cashApproveNotes, setCashApproveNotes] = useState('');
  const [decliningCashHandover, setDecliningCashHandover] = useState<CashOnHandHandover | null>(null);
  const [cashDeclineNotes, setCashDeclineNotes] = useState('');
  const [isSubmittingCashReview, setIsSubmittingCashReview] = useState(false);

  // View Details Modal State (Stock & Pricing)
  const [viewingRequest, setViewingRequest] = useState<ApprovalRequest | null>(null);

  // Approval Confirm Dialog State (Stock & Pricing)
  const [approvingRequest, setApprovingRequest] = useState<ApprovalRequest | null>(null);

  // Rejection Dialog State (Stock & Pricing)
  const [rejectingRequest, setRejectingRequest] = useState<ApprovalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Order Rejection Modals State
  const [viewingOrderRejection, setViewingOrderRejection] = useState<OrderRejectionRequest | null>(null);
  const [approvingOrderRejection, setApprovingOrderRejection] = useState<OrderRejectionRequest | null>(null);
  const [approveAdminNotes, setApproveAdminNotes] = useState('');
  const [decliningOrderRejection, setDecliningOrderRejection] = useState<OrderRejectionRequest | null>(null);
  const [declineAdminNotes, setDeclineAdminNotes] = useState('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allRequests, allTeams, allProducts, allOrderRejections, allCashHandovers] = await Promise.all([
        approvalRequestRepository.getAll(),
        teamRepository.getAll(),
        productRepository.getAll(),
        orderRejectionRepository.getAll(),
        cashOnHandRepository.getAllHandovers(),
      ]);
      setRequests(allRequests);
      setTeams(allTeams);
      setProducts(allProducts);
      setOrderRejections(allOrderRejections);
      setCashHandovers(allCashHandovers);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load approval requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Approval Action
  const handleConfirmApprove = async () => {
    if (!approvingRequest || !user) return;
    try {
      await approvalRequestRepository.review(approvingRequest.id, 'APPROVED', user);

      await ActivityLogService.logAction({
        userId: user.id,
        userRole: user.role,
        userName: user.fullName,
        action: approvingRequest.requestType === 'STOCK_ADDITION' ? 'STOCK_APPROVED' : 'PRICE_CHANGE_APPROVED',
        entityType: 'Approval',
        entityId: approvingRequest.id,
        description: `Approved ${approvingRequest.requestType.replace(/_/g, ' ')} for product ${approvingRequest.productName}`,
      });

      toast.success(`Approved ${approvingRequest.requestType.replace(/_/g, ' ')} request! Product stock updated.`);
      setApprovingRequest(null);
      if (viewingRequest?.id === approvingRequest.id) {
        setViewingRequest(null);
      }
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve request.');
    }
  };

  // Handle Rejection Submit
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequest || !user) return;

    setIsSubmitting(true);
    try {
      await approvalRequestRepository.review(rejectingRequest.id, 'REJECTED', user, rejectionReason);

      await ActivityLogService.logAction({
        userId: user.id,
        userRole: user.role,
        userName: user.fullName,
        action: rejectingRequest.requestType === 'STOCK_ADDITION' ? 'STOCK_REJECTED' : 'PRICE_CHANGE_REJECTED',
        entityType: 'Approval',
        entityId: rejectingRequest.id,
        description: `Rejected ${rejectingRequest.requestType.replace(/_/g, ' ')} for product ${rejectingRequest.productName}. Reason: ${rejectionReason}`,
      });

      toast.success(`Rejected request.`);
      setRejectingRequest(null);
      setRejectionReason('');
      if (viewingRequest?.id === rejectingRequest.id) {
        setViewingRequest(null);
      }
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Status Transition Badge
  const renderTransitionBadge = (fromStatus?: string, toStatus?: string) => {
    const from = fromStatus || 'DELIVERED';
    const to = toStatus || 'REJECTED';
    const getBadgeStyle = (status: string) => {
      switch (status) {
        case 'DELIVERED':
          return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'REJECTED':
          return 'bg-rose-50 text-rose-700 border-rose-200';
        case 'DISPATCHED':
          return 'bg-blue-50 text-blue-700 border-blue-200';
        default:
          return 'bg-slate-100 text-slate-700 border-slate-200';
      }
    };

    return (
      <div className="inline-flex items-center gap-1.5 font-mono text-[11px]">
        <span className={`px-2 py-0.5 rounded border font-semibold ${getBadgeStyle(from)}`}>
          {from}
        </span>
        <ArrowRight className="w-3 h-3 text-slate-400" />
        <span className={`px-2 py-0.5 rounded border font-bold ${getBadgeStyle(to)}`}>
          {to}
        </span>
      </div>
    );
  };

  // Order Rejection Handlers
  const handleConfirmApproveOrderRejection = async () => {
    if (!approvingOrderRejection || !user) return;
    setIsSubmittingRejection(true);
    const originStatus = approvingOrderRejection.fromStatus || 'DELIVERED';
    const targetStatus = approvingOrderRejection.toStatus || 'REJECTED';
    try {
      await orderRejectionRepository.review(approvingOrderRejection.id, {
        status: 'APPROVED',
        adminNotes: approveAdminNotes.trim() || undefined,
      });

      await ActivityLogService.logAction({
        userId: user.id,
        userRole: user.role,
        userName: user.fullName,
        action: 'ORDER_REJECTION_APPROVED',
        entityType: 'Order',
        entityId: approvingOrderRejection.orderId,
        description: `Approved status transition (${originStatus} ➔ ${targetStatus}) for order #${approvingOrderRejection.orderNumber}. Inventory updated.`,
      });

      toast.success(
        `Approved transition for Order #${approvingOrderRejection.orderNumber}. Order status set to ${targetStatus} and inventory updated.`,
      );
      setApprovingOrderRejection(null);
      setApproveAdminNotes('');
      if (viewingOrderRejection?.id === approvingOrderRejection.id) {
        setViewingOrderRejection(null);
      }
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to approve status transition.');
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  const handleConfirmDeclineOrderRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decliningOrderRejection || !user) return;
    if (!declineAdminNotes.trim()) {
      toast.error('Please provide an admin reason / note for declining the transition request.');
      return;
    }

    setIsSubmittingRejection(true);
    const originStatus = decliningOrderRejection.fromStatus || 'DELIVERED';
    const targetStatus = decliningOrderRejection.toStatus || 'REJECTED';
    try {
      await orderRejectionRepository.review(decliningOrderRejection.id, {
        status: 'REJECTED',
        adminNotes: declineAdminNotes.trim(),
      });

      await ActivityLogService.logAction({
        userId: user.id,
        userRole: user.role,
        userName: user.fullName,
        action: 'ORDER_REJECTION_REJECTED',
        entityType: 'Order',
        entityId: decliningOrderRejection.orderId,
        description: `Declined transition request (${originStatus} ➔ ${targetStatus}) for order #${decliningOrderRejection.orderNumber}. Reason: ${declineAdminNotes}`,
      });

      toast.success(
        `Declined transition request for Order #${decliningOrderRejection.orderNumber}. Order remains ${originStatus}.`,
      );
      setDecliningOrderRejection(null);
      setDeclineAdminNotes('');
      if (viewingOrderRejection?.id === decliningOrderRejection.id) {
        setViewingOrderRejection(null);
      }
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to decline status transition.');
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  const handleConfirmApproveCashHandover = async () => {
    if (!approvingCashHandover || !user) return;
    if (!cashApproveOutcome) {
      toast.error('Please choose an outcome: Mark Delivered or Keep Dispatched');
      return;
    }
    setIsSubmittingCashReview(true);
    try {
      await cashOnHandRepository.reviewHandover(approvingCashHandover.id, {
        status: 'APPROVED',
        adminOutcome: cashApproveOutcome,
        adminNotes: cashApproveNotes.trim() || undefined,
      });

      const action =
        cashApproveOutcome === 'DELIVERED'
          ? 'CASH_ON_HAND_APPROVED_DELIVERED'
          : 'CASH_ON_HAND_APPROVED_DISPATCHED';

      await ActivityLogService.logAction({
        userId: user.id,
        userRole: user.role,
        userName: user.fullName,
        action: action as any,
        entityType: 'CashOnHandHandover',
        entityId: approvingCashHandover.id,
        description: `Approved Cash on Hand request for order #${approvingCashHandover.orderNumber} with outcome ${cashApproveOutcome}. COD set to 0.`,
      });

      toast.success(
        `Approved Cash on Hand for Order #${approvingCashHandover.orderNumber} (${cashApproveOutcome}).`,
      );
      setApprovingCashHandover(null);
      setCashApproveOutcome('');
      setCashApproveNotes('');
      if (viewingCashHandover?.id === approvingCashHandover.id) {
        setViewingCashHandover(null);
      }
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to approve Cash on Hand request.');
    } finally {
      setIsSubmittingCashReview(false);
    }
  };

  const handleConfirmDeclineCashHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decliningCashHandover || !user) return;
    if (!cashDeclineNotes.trim()) {
      toast.error('Please provide a mandatory explanation for declining the cash handover.');
      return;
    }

    setIsSubmittingCashReview(true);
    try {
      await cashOnHandRepository.reviewHandover(decliningCashHandover.id, {
        status: 'DECLINED',
        rejectionReason: cashDeclineNotes.trim(),
        adminNotes: cashDeclineNotes.trim(),
      });

      await ActivityLogService.logAction({
        userId: user.id,
        userRole: user.role,
        userName: user.fullName,
        action: 'CASH_ON_HAND_DECLINED',
        entityType: 'CashOnHandHandover',
        entityId: decliningCashHandover.id,
        description: `Declined Cash on Hand request for order #${decliningCashHandover.orderNumber}. Reverted to normal COD. Reason: ${cashDeclineNotes.trim()}`,
      });

      toast.success(
        `Declined Cash on Hand request for Order #${decliningCashHandover.orderNumber}. Order remains in Prepared state with normal COD.`,
        { duration: 5000 },
      );
      setDecliningCashHandover(null);
      setCashDeclineNotes('');
      if (viewingCashHandover?.id === decliningCashHandover.id) {
        setViewingCashHandover(null);
      }
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to decline Cash on Hand request.');
    } finally {
      setIsSubmittingCashReview(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => statusFilter === 'ALL' || r.status === statusFilter);
  }, [requests, statusFilter]);

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  const filteredOrderRejections = useMemo(() => {
    return orderRejections.filter(
      (r) => rejectionStatusFilter === 'ALL' || r.status === rejectionStatusFilter,
    );
  }, [orderRejections, rejectionStatusFilter]);

  const pendingRejectionCount = orderRejections.filter((r) => r.status === 'PENDING').length;
  const approvedRejectionCount = orderRejections.filter((r) => r.status === 'APPROVED').length;
  const declinedRejectionCount = orderRejections.filter((r) => r.status === 'REJECTED').length;

  const filteredCashHandovers = useMemo(() => {
    return cashHandovers.filter((h) => {
      if (cashStatusFilter !== 'ALL' && h.status !== cashStatusFilter) return false;
      return true;
    });
  }, [cashHandovers, cashStatusFilter]);

  const pendingCashCount = cashHandovers.filter((h) => h.status === 'PENDING').length;
  const approvedCashCount = cashHandovers.filter((h) => h.status === 'APPROVED').length;
  const declinedCashCount = cashHandovers.filter((h) => h.status === 'DECLINED').length;
  const pendingCashAmount = cashHandovers
    .filter((h) => h.status === 'PENDING')
    .reduce((sum, h) => sum + Number(h.amountCollected || 0), 0);

  const totalPending = pendingCount + pendingRejectionCount + pendingCashCount;
  const totalApproved = approvedCount + approvedRejectionCount + approvedCashCount;
  const totalDeclined = rejectedCount + declinedRejectionCount + declinedCashCount;
  const totalSubmissions = requests.length + orderRejections.length + cashHandovers.length;

  if (loading) return <LoadingState rows={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centralized Approvals Center"
        description="Review, inspect, and approve supervisor stock replenishment, price changes, and order status transitions all in one place"
      />

      {/* Top Main Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveMainTab('ALL')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeMainTab === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Approvals ({totalSubmissions})
        </button>
        <button
          type="button"
          onClick={() => setActiveMainTab('CASH_ON_HAND')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeMainTab === 'CASH_ON_HAND'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Banknote className="w-4 h-4 text-emerald-300" />
          Cash on Hand ({cashHandovers.length})
          {pendingCashCount > 0 && (
            <span className="bg-amber-400 text-amber-950 font-black px-1.5 py-0.2 rounded-full text-[10px]">
              {pendingCashCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveMainTab('STOCK_PRICE')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeMainTab === 'STOCK_PRICE'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Boxes className="w-4 h-4 text-blue-300" />
          Product &amp; Stock ({requests.length})
          {pendingCount > 0 && (
            <span className="bg-amber-400 text-amber-950 font-black px-1.5 py-0.2 rounded-full text-[10px]">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveMainTab('ORDER_TRANSITIONS')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeMainTab === 'ORDER_TRANSITIONS'
              ? 'bg-indigo-700 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-indigo-300" />
          Order Rejections ({orderRejections.length})
          {pendingRejectionCount > 0 && (
            <span className="bg-amber-400 text-amber-950 font-black px-1.5 py-0.2 rounded-full text-[10px]">
              {pendingRejectionCount}
            </span>
          )}
        </button>
      </div>

      {/* Stat Cards */}
      {activeMainTab === 'CASH_ON_HAND' ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard
            title="Pending Verification"
            value={pendingCashCount}
            subtitle="Cash in supervisor possession"
            icon={<Clock className="w-4 h-4 text-amber-600" />}
            accentColor={pendingCashCount > 0 ? 'amber' : 'green'}
          />
          <StatCard
            title="Verified &amp; Received"
            value={approvedCashCount}
            subtitle="Physical cash received by Admin"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            accentColor="green"
          />
          <StatCard
            title="Declined (Reverted)"
            value={declinedCashCount}
            subtitle="Orders reverted to Interested"
            icon={<XCircle className="w-4 h-4 text-rose-600" />}
            accentColor="red"
          />
          <StatCard
            title="Pending Physical Cash"
            value={formatCurrency(pendingCashAmount)}
            subtitle="Total cash awaiting handover"
            icon={<Banknote className="w-4 h-4 text-emerald-600" />}
            accentColor="blue"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard
            title="Total Pending Approvals"
            value={totalPending}
            subtitle={`${pendingCount} stock/price, ${pendingRejectionCount} transitions, ${pendingCashCount} cash`}
            icon={<Clock className="w-4 h-4 text-amber-600" />}
            accentColor={totalPending > 0 ? 'amber' : 'green'}
          />
          <StatCard
            title="Total Approved"
            value={totalApproved}
            subtitle={`${approvedCount} stock/price, ${approvedRejectionCount} transitions, ${approvedCashCount} cash`}
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            accentColor="green"
          />
          <StatCard
            title="Total Rejected / Declined"
            value={totalDeclined}
            subtitle={`${rejectedCount} stock/price, ${declinedRejectionCount} transitions, ${declinedCashCount} cash`}
            icon={<XCircle className="w-4 h-4 text-rose-600" />}
            accentColor="red"
          />
          <StatCard
            title="Total Submissions"
            value={totalSubmissions}
            subtitle="Combined approval audit trail"
            icon={<Package className="w-4 h-4 text-blue-600" />}
            accentColor="blue"
          />
        </div>
      )}

      {/* Table 1: Stock & Price Approvals */}
      {(activeMainTab === 'ALL' || activeMainTab === 'STOCK_PRICE') && (
      <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-blue-600" />
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Stock &amp; Price Approvals Queue
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review supervisor requests for product stock additions and catalog price modifications.
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'PENDING', label: `Pending (${pendingCount})` },
                { key: 'APPROVED', label: `Approved (${approvedCount})` },
                { key: 'REJECTED', label: `Rejected (${rejectedCount})` },
                { key: 'ALL', label: `All (${requests.length})` },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(item.key as any)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === item.key
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Requested By</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Target Product</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 text-xs italic font-sans">
                        No stock or price requests found matching filter "{statusFilter}".
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => {
                      const teamInfo = teams.find((t) => t.id === req.teamId);
                      const brand = getTeamBranding(teamInfo);

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* 1. Type */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                req.requestType === 'STOCK_ADDITION'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                            >
                              {req.requestType === 'STOCK_ADDITION' ? (
                                <Boxes className="w-3 h-3 text-blue-600" />
                              ) : (
                                <DollarSign className="w-3 h-3 text-purple-600" />
                              )}
                              {req.requestType === 'STOCK_ADDITION'
                                ? 'STOCK ADDITION'
                                : req.requestType === 'PRODUCT_COST_PRICE_CHANGE'
                                ? 'COST PRICE'
                                : 'SELLING PRICE'}
                            </span>
                          </td>

                          {/* 2. Requested By */}
                          <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                            {req.requestedByName}
                          </td>

                          {/* 3. Team */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border"
                              style={{
                                backgroundColor: `${brand.brandColor}15`,
                                borderColor: `${brand.brandColor}40`,
                                color: brand.brandColor,
                              }}
                            >
                              <Building2 className="w-3 h-3" />
                              {teamInfo?.name || brand.name}
                            </span>
                          </td>

                          {/* 4. Target Product */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 line-clamp-1 max-w-[280px]" title={req.productName}>
                              {req.productName}
                            </div>
                            {req.items && req.items.length > 0 && (
                              <div className="text-[11px] text-blue-600 font-medium mt-0.5">
                                {req.items.length} Products Included in Batch
                              </div>
                            )}
                          </td>

                          {/* 5. Date */}
                          <td className="py-3.5 px-4 font-sans text-slate-500 text-[11px] whitespace-nowrap">
                            {req.createdAt ? format(new Date(req.createdAt), 'MMM dd, yyyy HH:mm') : '—'}
                          </td>

                          {/* 6. Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                req.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : req.status === 'REJECTED'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                              }`}
                            >
                              {req.status === 'APPROVED' ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ) : req.status === 'REJECTED' ? (
                                <XCircle className="w-3 h-3 text-rose-600" />
                              ) : (
                                <Clock className="w-3 h-3 text-amber-600" />
                              )}
                              {req.status}
                            </span>
                          </td>

                          {/* 7. Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
                              onClick={() => setViewingRequest(req)}
                              className="text-xs px-2.5 py-1 font-semibold border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table 2: Order Status Transitions */}
      {(activeMainTab === 'ALL' || activeMainTab === 'ORDER_TRANSITIONS') && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-indigo-600" />
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Order Status Transition Queue
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review supervisor requests to transition Delivered and Rejected orders within the 7-day review window.
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'PENDING', label: `Pending (${pendingRejectionCount})` },
                { key: 'APPROVED', label: `Approved (${approvedRejectionCount})` },
                { key: 'REJECTED', label: `Declined (${declinedRejectionCount})` },
                { key: 'ALL', label: `All (${orderRejections.length})` },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setRejectionStatusFilter(item.key as any)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    rejectionStatusFilter === item.key
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Order # &amp; Team</th>
                    <th className="py-3 px-4">Requested Transition</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Base Event Date</th>
                    <th className="py-3 px-4">Supervisor &amp; Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrderRejections.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 text-xs italic font-sans">
                        No status transition requests found matching filter "{rejectionStatusFilter === 'REJECTED' ? 'DECLINED' : rejectionStatusFilter}".
                      </td>
                    </tr>
                  ) : (
                    filteredOrderRejections.map((req) => {
                      const team = teams.find((t) => t.id === req.teamId);
                      const branding = getTeamBranding(team);
                      const originStatus = req.fromStatus || 'DELIVERED';
                      const targetStatus = req.toStatus || 'REJECTED';
                      const baseDateStr = originStatus === 'REJECTED'
                        ? (req.order?.rejectedAt || req.deliveredAt)
                        : (req.deliveredAt || req.order?.deliveredAt);
                      const eventDate = baseDateStr ? new Date(baseDateStr) : null;
                      const daysAgo = eventDate
                        ? Math.floor((Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24))
                        : null;
                      const damagedCount = Array.isArray(req.damagedItems)
                        ? req.damagedItems.reduce((sum, item) => sum + (item.quantity || 0), 0)
                        : 0;

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* 1. Order # & Team */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>#{req.orderNumber}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              {team && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border"
                                  style={{
                                    backgroundColor: `${branding.brandColor}15`,
                                    borderColor: `${branding.brandColor}40`,
                                    color: branding.brandColor,
                                  }}
                                >
                                  <Building2 className="w-2.5 h-2.5" />
                                  {team.name}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID: {req.id.slice(0, 8)}...
                              </span>
                            </div>
                          </td>

                          {/* 2. Requested Transition */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {renderTransitionBadge(originStatus, targetStatus)}
                          </td>

                          {/* 3. Customer */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-800">
                              {req.order?.customer?.fullName || 'Customer'}
                            </div>
                            {req.order?.customer?.phone && (
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                {req.order.customer.phone}
                              </div>
                            )}
                            {req.order?.totalAmount !== undefined && (
                              <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                                {formatCurrency(req.order.totalAmount)}
                              </div>
                            )}
                          </td>

                          {/* 4. Base Event Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="text-slate-700 font-medium flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {eventDate ? format(eventDate, 'MMM dd, yyyy') : '—'}
                            </div>
                            {daysAgo !== null && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {originStatus === 'REJECTED' ? 'Rejected' : 'Delivered'} {daysAgo === 0 ? 'today' : `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`}
                              </div>
                            )}
                          </td>

                          {/* 5. Supervisor & Reason */}
                          <td className="py-3.5 px-4 max-w-[280px]">
                            <div className="flex items-center gap-1 text-slate-800 font-medium">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{req.requestedByName}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5 font-normal italic" title={req.reason}>
                              "{req.reason}"
                            </p>
                            {damagedCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 mt-1">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                {damagedCount} Damaged Unit{damagedCount > 1 ? 's' : ''} Reported
                              </span>
                            )}
                          </td>

                          {/* 6. Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                req.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : req.status === 'REJECTED'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                              }`}
                            >
                              {req.status === 'APPROVED' ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ) : req.status === 'REJECTED' ? (
                                <XCircle className="w-3 h-3 text-rose-600" />
                              ) : (
                                <Clock className="w-3 h-3 text-amber-600" />
                              )}
                              {req.status === 'REJECTED' ? 'DECLINED' : req.status}
                            </span>
                          </td>

                          {/* 7. Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="secondary"
                                size="sm"
                                leftIcon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
                                onClick={() => setViewingOrderRejection(req)}
                                className="text-xs px-2.5 py-1 font-semibold border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                              >
                                View
                              </Button>
                              {req.status === 'PENDING' && (
                                <>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    leftIcon={<Check className="w-3.5 h-3.5 text-emerald-600" />}
                                    onClick={() => setApprovingOrderRejection(req)}
                                    className="text-xs px-2.5 py-1 font-semibold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    leftIcon={<XCircle className="w-3.5 h-3.5 text-rose-600" />}
                                    onClick={() => {
                                      setDecliningOrderRejection(req);
                                      setDeclineAdminNotes('');
                                    }}
                                    className="text-xs px-2.5 py-1 font-semibold border-rose-200 text-rose-700 hover:bg-rose-50"
                                  >
                                    Decline
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table 3: Cash on Hand Verification Queue */}
      {(activeMainTab === 'ALL' || activeMainTab === 'CASH_ON_HAND') && (
        <Card className="border-emerald-200 shadow-xs">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-emerald-100 bg-emerald-50/40 pb-4">
            <div className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-600" />
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Cash on Hand Physical Verification Queue
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify supervisor handover of collected cash for Interested orders. Declining reverts order to Interested and restores stock.
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'PENDING', label: `Pending Verification (${pendingCashCount})` },
                { key: 'APPROVED', label: `Verified (${approvedCashCount})` },
                { key: 'DECLINED', label: `Declined (${declinedCashCount})` },
                { key: 'ALL', label: `All (${cashHandovers.length})` },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCashStatusFilter(item.key as any)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    cashStatusFilter === item.key
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Requester & Team</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Packages</th>
                    <th className="px-4 py-3 text-right">Delivery Fee</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-900">Current COD</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCashHandovers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
                        No Cash on Hand approval records found matching filter "{cashStatusFilter}".
                      </td>
                    </tr>
                  ) : (
                    filteredCashHandovers.map((h) => {
                      const codAmount = Number(h.amountCollected || (Number(h.productValue) + Number(h.deliveryCharge)));
                      return (
                        <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                            {format(new Date(h.createdAt), 'MMM dd, HH:mm')}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-indigo-700 whitespace-nowrap">
                            #{h.orderNumber}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-slate-900 block">
                              {h.supervisorName}
                            </span>
                            {h.team && (
                              <span className="text-[10px] text-slate-500">
                                {h.team.name}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-slate-900 block">
                              {h.customerName}
                            </span>
                            <span className="text-slate-400 text-[11px] block">{h.customerPhone}</span>
                            {h.order?.customer?.address && (
                              <span className="text-slate-400 text-[10px] block truncate max-w-[180px]">{h.order.customer.address}</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 max-w-[200px]">
                            {h.order?.items && h.order.items.length > 0 ? (
                              <div className="space-y-0.5">
                                {h.order.items.map((it, idx) => (
                                  <div key={it.id || idx} className="text-[11px] text-slate-700 truncate">
                                    {it.productName} <span className="text-slate-400 font-mono">×{it.quantity}</span>
                                  </div>
                                ))}
                                <span className="text-[10px] font-mono text-slate-500 block">
                                  Total: {formatCurrency(Number(h.productValue))}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-slate-800 font-medium block truncate">
                                  {h.order?.itemsDescription || 'Package'}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500 block">
                                  Total: {formatCurrency(Number(h.productValue))}
                                </span>
                              </div>
                            )}
                            {h.requestNotes && (
                              <span className="text-[10px] italic text-amber-800 bg-amber-50 rounded px-1 py-0.2 mt-1 block truncate" title={h.requestNotes}>
                                Note: "{h.requestNotes}"
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-slate-600 whitespace-nowrap">
                            {formatCurrency(Number(h.deliveryCharge))}
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-slate-900 text-sm whitespace-nowrap">
                            {formatCurrency(codAmount)}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {h.status === 'APPROVED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Approved {h.outcomeStatus ? `(${h.outcomeStatus})` : ''}
                              </span>
                            ) : h.status === 'DECLINED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Declined
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Pending Admin Approval
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {h.status === 'PENDING' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setApprovingCashHandover(h);
                                      setCashApproveOutcome('');
                                      setCashApproveNotes('');
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 h-auto flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setDecliningCashHandover(h);
                                      setCashDeclineNotes('');
                                    }}
                                    className="border-rose-300 text-rose-700 hover:bg-rose-50 text-[11px] font-bold px-2.5 py-1 h-auto flex items-center gap-1 cursor-pointer"
                                  >
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingCashHandover(h)}
                                className="text-slate-600 hover:text-slate-900 px-2 py-1 h-auto cursor-pointer"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comprehensive View Details Modal */}
      <Dialog
        isOpen={!!viewingRequest}
        onClose={() => setViewingRequest(null)}
        title="Approval Request Dossier"
        description="Comprehensive review of the requested stock modifications, items breakdown, and supervisor justification."
        maxWidth="3xl"
      >
        {viewingRequest && (
          <div className="space-y-4">
            {/* Top Overview KPI Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                <div>
                  <span className="text-[11px] font-mono text-slate-400">ID: {viewingRequest.id}</span>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">{viewingRequest.productName}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      viewingRequest.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : viewingRequest.status === 'REJECTED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {viewingRequest.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Request Type</span>
                  <div className="font-bold text-slate-900 mt-0.5">{viewingRequest.requestType.replace(/_/g, ' ')}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Requested By</span>
                  <div className="font-bold text-slate-900 mt-0.5">{viewingRequest.requestedByName}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Assigned Team</span>
                  <div className="font-bold text-blue-700 mt-0.5">
                    {teams.find((t) => t.id === viewingRequest.teamId)?.name || viewingRequest.teamId}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Submission Date</span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {viewingRequest.createdAt ? format(new Date(viewingRequest.createdAt), 'MMM dd, yyyy') : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Justification & Reason Box */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Supervisor Request Reason &amp; Justification:</span>
              </div>
              <p className="text-xs text-blue-900 leading-relaxed font-sans pl-5">
                "{viewingRequest.reason || 'No additional notes provided.'}"
              </p>
            </div>

            {/* Multi-Product Bulk Addition Items Breakdown */}
            {viewingRequest.items && viewingRequest.items.length > 0 ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-emerald-600" />
                    <span>Product Stock Additions Breakdown ({viewingRequest.items.length} Products)</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    +{viewingRequest.items.reduce((s, it) => s + (it.quantity || 0), 0)} Total Units
                  </span>
                </div>

                {/* Desktop Table (sm: and up) */}
                <div className="hidden sm:block border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3 w-[8%]">#</th>
                        <th className="py-2.5 px-3 w-[32%]">Product Name</th>
                        <th className="py-2.5 px-3 w-[15%] text-center">Add Qty</th>
                        <th className="py-2.5 px-3 w-[22%] text-center">Batch Unit Cost</th>
                        <th className="py-2.5 px-3 w-[23%] text-center">Proposed Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {viewingRequest.items.map((it, idx) => {
                        const prod = products.find((p) => p.id === it.productId);
                        const isCostChanged =
                          prod &&
                          it.unitCostPrice !== undefined &&
                          it.unitCostPrice !== null &&
                          Number(it.unitCostPrice) !== Number(prod.costPrice);
                        const isPriceChanged =
                          prod &&
                          it.proposedSellingPrice !== undefined &&
                          it.proposedSellingPrice !== null &&
                          Number(it.proposedSellingPrice) !== Number(prod.sellingPrice);

                        return (
                          <tr key={idx} className={`transition-colors ${isPriceChanged || isCostChanged ? 'bg-amber-50/25' : 'hover:bg-slate-50'}`}>
                            <td className="py-2.5 px-3 text-slate-400 font-sans">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-sans">
                              <div className="font-bold text-slate-900">{it.productName}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {prod && <span className="text-[10px] font-mono text-slate-400">{prod.code}</span>}
                                {(isPriceChanged || isCostChanged) && (
                                  <span className="inline-flex items-center text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.2 rounded-full">
                                    Price Changed
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-emerald-700 bg-emerald-50/40 font-mono">
                              +{it.quantity}
                            </td>

                            {/* Batch Cost */}
                            <td className="py-2.5 px-3 text-center font-mono">
                              {isCostChanged ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-md text-xs">
                                    {formatCurrency(it.unitCostPrice)}
                                  </span>
                                  <span className="text-[9px] text-slate-400 line-through mt-0.5">
                                    was {formatCurrency(prod.costPrice)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-700">
                                  {it.unitCostPrice ? formatCurrency(it.unitCostPrice) : '—'}
                                </span>
                              )}
                            </td>

                            {/* Proposed Price */}
                            <td className="py-2.5 px-3 text-center font-mono">
                              {isPriceChanged ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="font-bold text-blue-900 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-md text-xs">
                                    {formatCurrency(it.proposedSellingPrice)}
                                  </span>
                                  <span className="text-[9px] text-slate-400 line-through mt-0.5">
                                    was {formatCurrency(prod.sellingPrice)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-700">
                                  {it.proposedSellingPrice ? formatCurrency(it.proposedSellingPrice) : '—'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View (< sm) */}
                <div className="block sm:hidden space-y-2">
                  {viewingRequest.items.map((it, idx) => {
                    const prod = products.find((p) => p.id === it.productId);
                    const isCostChanged =
                      prod &&
                      it.unitCostPrice !== undefined &&
                      it.unitCostPrice !== null &&
                      Number(it.unitCostPrice) !== Number(prod.costPrice);
                    const isPriceChanged =
                      prod &&
                      it.proposedSellingPrice !== undefined &&
                      it.proposedSellingPrice !== null &&
                      Number(it.proposedSellingPrice) !== Number(prod.sellingPrice);

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border space-y-2 ${
                          isPriceChanged || isCostChanged
                            ? 'bg-amber-50/20 border-amber-200'
                            : 'bg-slate-50/60 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{it.productName}</div>
                            {prod && <div className="text-[10px] font-mono text-slate-400">{prod.code}</div>}
                          </div>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-mono">
                            +{it.quantity} units
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-xs font-mono">
                          <div>
                            <span className="text-[10px] text-slate-400 font-sans block">Batch Cost</span>
                            {isCostChanged ? (
                              <div>
                                <span className="font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-[11px] inline-block">
                                  {formatCurrency(it.unitCostPrice)}
                                </span>
                                <div className="text-[9px] text-slate-400 line-through">
                                  was {formatCurrency(prod.costPrice)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-700 text-[11px]">
                                {it.unitCostPrice ? formatCurrency(it.unitCostPrice) : '—'}
                              </span>
                            )}
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-sans block">Proposed Price</span>
                            {isPriceChanged ? (
                              <div>
                                <span className="font-bold text-blue-900 bg-blue-100 border border-blue-300 px-1.5 py-0.5 rounded text-[11px] inline-block">
                                  {formatCurrency(it.proposedSellingPrice)}
                                </span>
                                <div className="text-[9px] text-slate-400 line-through">
                                  was {formatCurrency(prod.sellingPrice)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-700 text-[11px]">
                                {it.proposedSellingPrice ? formatCurrency(it.proposedSellingPrice) : '—'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Single Item Value Details with Batch Cost & Strategy */
              (() => {
                const targetProd = products.find((p) => p.id === viewingRequest.productId);
                const isSingleCostChanged =
                  targetProd &&
                  viewingRequest.unitCostPrice !== undefined &&
                  viewingRequest.unitCostPrice !== null &&
                  Number(viewingRequest.unitCostPrice) !== Number(targetProd.costPrice);
                const isSinglePriceChanged =
                  targetProd &&
                  viewingRequest.proposedSellingPrice !== undefined &&
                  viewingRequest.proposedSellingPrice !== null &&
                  Number(viewingRequest.proposedSellingPrice) !== Number(targetProd.sellingPrice);

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px]">Quantity to Add</span>
                        <div className="text-sm font-bold text-emerald-700 font-mono mt-0.5">
                          +{viewingRequest.quantity ?? viewingRequest.newValue ?? 0} units
                        </div>
                      </div>

                      {/* Single Cost */}
                      <div>
                        <span className="text-slate-400 text-[11px]">Batch Acquisition Cost</span>
                        <div className="mt-0.5">
                          {isSingleCostChanged ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md font-mono inline-block">
                                {formatCurrency(viewingRequest.unitCostPrice)}
                              </span>
                              <span className="text-[10px] text-slate-400 line-through mt-0.5">
                                was {formatCurrency(targetProd.costPrice)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-slate-800 font-mono">
                              {viewingRequest.unitCostPrice
                                ? formatCurrency(viewingRequest.unitCostPrice)
                                : formatCurrency(viewingRequest.oldValue)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Single Proposed Price */}
                      <div>
                        <span className="text-slate-400 text-[11px]">Proposed Selling Price</span>
                        <div className="mt-0.5">
                          {isSinglePriceChanged ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-blue-900 bg-blue-100 border border-blue-300 px-1.5 py-0.5 rounded-md font-mono inline-block">
                                {formatCurrency(viewingRequest.proposedSellingPrice)}
                              </span>
                              <span className="text-[10px] text-slate-400 line-through mt-0.5">
                                was {formatCurrency(targetProd.sellingPrice)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-blue-700 font-mono">
                              {viewingRequest.proposedSellingPrice
                                ? formatCurrency(viewingRequest.proposedSellingPrice)
                                : 'Unchanged'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[11px]">Pricing Strategy</span>
                        <div className="text-xs font-semibold text-purple-700 mt-0.5">
                          {viewingRequest.pricingMode === 'BATCH_SPECIFIC'
                            ? 'Batch-Specific Price'
                            : 'Global Catalog Update'}
                        </div>
                      </div>
                    </div>

                    {(viewingRequest.batchNumber || viewingRequest.supplierName) && (
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono px-2">
                        {viewingRequest.batchNumber && <span>Lot #: <strong>{viewingRequest.batchNumber}</strong></span>}
                        {viewingRequest.supplierName && <span>Supplier / Inv: <strong>{viewingRequest.supplierName}</strong></span>}
                      </div>
                    )}
                  </div>
                );
              })()
            )}

            {/* Review Details (If Already Reviewed) */}
            {viewingRequest.status !== 'PENDING' && (
              <div className="p-3 bg-slate-100 rounded-xl text-xs space-y-1 text-slate-600">
                <div className="font-semibold text-slate-900">
                  Reviewed by {viewingRequest.reviewedByName || 'System Administrator'} on{' '}
                  {viewingRequest.reviewedDate ? format(new Date(viewingRequest.reviewedDate), 'MMM dd, yyyy HH:mm') : '—'}
                </div>
                {viewingRequest.rejectionReason && (
                  <div className="text-rose-700 font-medium">Rejection Reason: "{viewingRequest.rejectionReason}"</div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              {viewingRequest.status === 'PENDING' ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    leftIcon={<XCircle className="w-4 h-4 text-rose-600" />}
                    onClick={() => {
                      setRejectingRequest(viewingRequest);
                      setRejectionReason('');
                    }}
                    className="border-rose-300 text-rose-700 hover:bg-rose-50 flex-1 sm:flex-initial"
                  >
                    Reject Request
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => setApprovingRequest(viewingRequest)}
                    className="bg-emerald-600 hover:bg-emerald-700 flex-1 sm:flex-initial font-semibold"
                  >
                    Approve Request
                  </Button>
                </>
              ) : (
                <Button type="button" variant="secondary" onClick={() => setViewingRequest(null)}>
                  Close
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Confirmation Dialog for Approving Request */}
      <ConfirmDialog
        isOpen={!!approvingRequest}
        onClose={() => setApprovingRequest(null)}
        onConfirm={handleConfirmApprove}
        title="Approve Stock Addition Request"
        message={
          approvingRequest?.items && approvingRequest.items.length > 0
            ? `Are you sure you want to approve this bulk stock request for ${approvingRequest.items.length} products (+${approvingRequest.items.reduce((s, it) => s + (it.quantity || 0), 0)} total units)? Product inventory in the database will be updated immediately.`
            : `Are you sure you want to approve this ${approvingRequest?.requestType.replace(/_/g, ' ')} for product "${approvingRequest?.productName}"? Database stock quantities will be updated immediately.`
        }
        confirmText="Confirm & Approve"
      />

      {/* Reject Reason Dialog */}
      <Dialog
        isOpen={!!rejectingRequest}
        onClose={() => setRejectingRequest(null)}
        title="Reject Approval Request"
        description={`Provide a reason for rejecting request #${rejectingRequest?.id}`}
      >
        <form onSubmit={handleConfirmReject} className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
            <div className="font-bold">{rejectingRequest?.productName}</div>
            <div>
              Requested by {rejectingRequest?.requestedByName} on{' '}
              {rejectingRequest?.createdAt ? format(new Date(rejectingRequest.createdAt), 'MMM dd, yyyy') : ''}
            </div>
          </div>

          <Input
            label="Rejection Reason *"
            placeholder="e.g. Budget limit exceeded, stock count discrepancy, or pending supervisor clarification"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setRejectingRequest(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="bg-rose-600 hover:bg-rose-700" isLoading={isSubmitting}>
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Order Status Transition Dossier Modal */}
      <Dialog
        isOpen={!!viewingOrderRejection}
        onClose={() => setViewingOrderRejection(null)}
        title="Order Status Transition Dossier"
        description="Comprehensive review of the supervisor's status transition request, base timeline, and inventory impact."
        maxWidth="2xl"
      >
        {viewingOrderRejection && (
          <div className="space-y-4">
            {/* Top Overview KPI Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                <div>
                  <span className="text-[11px] font-mono text-slate-400">Request ID: {viewingOrderRejection.id}</span>
                  <h4 className="text-base font-bold text-slate-900 mt-0.5">
                    Order #{viewingOrderRejection.orderNumber}
                  </h4>
                  <div className="mt-1">
                    {renderTransitionBadge(viewingOrderRejection.fromStatus, viewingOrderRejection.toStatus)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      viewingOrderRejection.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : viewingOrderRejection.status === 'REJECTED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {viewingOrderRejection.status === 'REJECTED' ? 'DECLINED' : viewingOrderRejection.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Customer</span>
                  <span className="font-bold text-slate-900">
                    {viewingOrderRejection.order?.customer?.fullName || 'Customer'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Base Event Date</span>
                  <span className="font-semibold text-slate-800">
                    {(() => {
                      const baseDateStr = viewingOrderRejection.fromStatus === 'REJECTED'
                        ? (viewingOrderRejection.order?.rejectedAt || viewingOrderRejection.deliveredAt)
                        : (viewingOrderRejection.deliveredAt || viewingOrderRejection.order?.deliveredAt);
                      return baseDateStr ? format(new Date(baseDateStr), 'MMM dd, yyyy') : '—';
                    })()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Requested By</span>
                  <span className="font-semibold text-slate-800">{viewingOrderRejection.requestedByName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Request Date</span>
                  <span className="font-semibold text-slate-800">
                    {viewingOrderRejection.createdAt
                      ? format(new Date(viewingOrderRejection.createdAt), 'MMM dd, yyyy')
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Supervisor Rationale */}
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-700" />
                Supervisor's Transition Rationale
              </span>
              <p className="text-xs text-amber-950 font-medium leading-relaxed">
                "{viewingOrderRejection.reason}"
              </p>
            </div>

            {/* Damaged Goods Breakdown if reported */}
            {Array.isArray(viewingOrderRejection.damagedItems) && viewingOrderRejection.damagedItems.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Reported Damaged Items ({viewingOrderRejection.damagedItems.length})
                </h5>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-2 px-3">Product</th>
                        <th className="py-2 px-3 text-center">Damaged Units</th>
                        <th className="py-2 px-3">Specific Damage Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingOrderRejection.damagedItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-medium text-slate-900">{item.productName}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-full text-[11px] border border-rose-200">
                              {item.quantity} units
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 italic">{item.reason || 'No specific note'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  * Note: Damaged units will be segregated into Damaged Stock (quarantine), while non-damaged order items will be restored to Current Stock.
                </p>
              </div>
            )}

            {/* Admin Review Audit Trail (if already reviewed) */}
            {viewingOrderRejection.reviewedAt && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
                  Admin Review Details
                </div>
                <div className="text-slate-600">
                  Reviewed by <span className="font-semibold text-slate-900">{viewingOrderRejection.reviewedByName || 'Admin'}</span> on{' '}
                  <span className="font-semibold">{format(new Date(viewingOrderRejection.reviewedAt), 'MMM dd, yyyy HH:mm')}</span>
                </div>
                {viewingOrderRejection.adminNotes && (
                  <div className="mt-1 text-slate-700 bg-white p-2 rounded-lg border border-slate-200 text-xs">
                    <span className="font-bold text-slate-900">Admin Note: </span>
                    {viewingOrderRejection.adminNotes}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              {viewingOrderRejection.status === 'PENDING' ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    className="border-rose-200 text-rose-700 hover:bg-rose-50"
                    onClick={() => {
                      setDecliningOrderRejection(viewingOrderRejection);
                      setDeclineAdminNotes('');
                    }}
                  >
                    Decline Request
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setApprovingOrderRejection(viewingOrderRejection)}
                  >
                    Approve Transition
                  </Button>
                </>
              ) : (
                <Button type="button" variant="secondary" onClick={() => setViewingOrderRejection(null)}>
                  Close
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Confirmation Dialog for Approving Order Status Transition */}
      <Dialog
        isOpen={!!approvingOrderRejection}
        onClose={() => setApprovingOrderRejection(null)}
        title="Approve Order Status Transition"
        description={`Confirm approval to transition order #${approvingOrderRejection?.orderNumber} from ${approvingOrderRejection?.fromStatus || 'DELIVERED'} to ${approvingOrderRejection?.toStatus || 'REJECTED'}`}
      >
        {approvingOrderRejection && (
          <div className="space-y-4">
            {(() => {
              const originStatus = approvingOrderRejection.fromStatus || 'DELIVERED';
              const targetStatus = approvingOrderRejection.toStatus || 'REJECTED';

              return (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1.5">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    Inventory &amp; Status Impact:
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-amber-900">
                    <li>
                      Order <strong>#{approvingOrderRejection.orderNumber}</strong> status will be changed from{' '}
                      <span className="font-bold">{originStatus}</span> to{' '}
                      <span className="font-bold text-indigo-700">{targetStatus}</span>.
                    </li>
                    {originStatus === 'DELIVERED' && targetStatus === 'REJECTED' && (
                      <>
                        <li><strong>Sold stock</strong> will be decremented for all products in this order.</li>
                        <li>Clean items will be restored to <strong>Current Stock</strong>.</li>
                        {Array.isArray(approvingOrderRejection.damagedItems) && approvingOrderRejection.damagedItems.length > 0 && (
                          <li>
                            Reported damaged items ({approvingOrderRejection.damagedItems.reduce((s, it) => s + (it.quantity || 0), 0)} units) will be transferred to <strong>Damaged Stock</strong> (quarantine).
                          </li>
                        )}
                      </>
                    )}
                    {originStatus === 'DELIVERED' && targetStatus === 'DISPATCHED' && (
                      <li>
                        <strong>Sold stock</strong> will be decremented and converted back to <strong>Dispatched Stock</strong>.
                      </li>
                    )}
                    {originStatus === 'REJECTED' && targetStatus === 'DELIVERED' && (
                      <li>
                        For incorrectly rejected orders, the rejection will be <strong>fully reversed</strong>: damaged stock and available stock will be deducted and restored to <strong>Sold Stock</strong>.
                      </li>
                    )}
                    {originStatus === 'REJECTED' && targetStatus === 'DISPATCHED' && (
                      <li>
                        Items from <strong>Current Stock</strong> will be converted to <strong>Dispatched Stock</strong>.
                      </li>
                    )}
                    <li>This action is final and recorded in the audit log.</li>
                  </ul>
                </div>
              );
            })()}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Optional Admin Notes
              </label>
              <Input
                placeholder="e.g. Approved status transition per supervisor inspection."
                value={approveAdminNotes}
                onChange={(e) => setApproveAdminNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setApprovingOrderRejection(null)}
                disabled={isSubmittingRejection}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleConfirmApproveOrderRejection}
                isLoading={isSubmittingRejection}
              >
                Confirm &amp; Approve Transition
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Dialog for Declining Order Status Transition */}
      <Dialog
        isOpen={!!decliningOrderRejection}
        onClose={() => setDecliningOrderRejection(null)}
        title="Decline Status Transition Request"
        description={`Decline supervisor request to transition order #${decliningOrderRejection?.orderNumber}`}
      >
        <form onSubmit={handleConfirmDeclineOrderRejection} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 space-y-1">
            <div className="font-bold text-slate-900">
              Order #{decliningOrderRejection?.orderNumber} will remain {decliningOrderRejection?.fromStatus || 'DELIVERED'}
            </div>
            <div className="text-slate-500">
              The supervisor will be notified of this decline and the order status will remain unchanged.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Decline Reason / Explanation *
            </label>
            <Input
              placeholder="e.g. Proof of delivery confirmed, invalid reason, or status transition rejected."
              value={declineAdminNotes}
              onChange={(e) => setDeclineAdminNotes(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDecliningOrderRejection(null)}
              disabled={isSubmittingRejection}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-rose-600 hover:bg-rose-700"
              isLoading={isSubmittingRejection}
            >
              Confirm Decline
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Dialog for Approving Cash on Hand Request */}
      <Dialog
        isOpen={!!approvingCashHandover}
        onClose={() => !isSubmittingCashReview && setApprovingCashHandover(null)}
        title="Approve Cash On Hand Request"
        description={`Order #${approvingCashHandover?.orderNumber} • ${approvingCashHandover?.customerName}`}
      >
        {approvingCashHandover && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Order Number:</span>
                <span className="font-bold text-slate-900 font-mono">#{approvingCashHandover.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requester:</span>
                <span className="font-semibold text-slate-800">{approvingCashHandover.supervisorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-medium text-slate-900">
                  {approvingCashHandover.customerName} ({approvingCashHandover.customerPhone})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Package Total:</span>
                <span className="font-mono text-slate-800">
                  {formatCurrency(Number(approvingCashHandover.productValue))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery Charge:</span>
                <span className="font-mono text-slate-800">
                  {formatCurrency(Number(approvingCashHandover.deliveryCharge))}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-900">Approved COD to Customer:</span>
                <span className="font-bold text-emerald-700 text-sm">
                  LKR 0.00 (Cash on Hand)
                </span>
              </div>
              {approvingCashHandover.requestNotes && (
                <div className="pt-1.5 border-t border-slate-200/80 text-[11px] text-amber-900 bg-amber-50/70 p-2 rounded">
                  <span className="font-bold block">Requester Note:</span>
                  "{approvingCashHandover.requestNotes}"
                </div>
              )}
            </div>

            {/* Outcome Selection (Mandatory) */}
            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/60">
              <label className="block text-xs font-bold text-slate-800">
                Select Order Outcome <span className="text-rose-600">*</span>
              </label>
              <div className="space-y-2">
                <label
                  className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                    cashApproveOutcome === 'DELIVERED'
                      ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="cohOutcome"
                    value="DELIVERED"
                    checked={cashApproveOutcome === 'DELIVERED'}
                    onChange={() => setCashApproveOutcome('DELIVERED')}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mark Delivered</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Order transitions to <strong>DELIVERED</strong>. Allocated stock moves to <strong>Sold Stock</strong>. COD is set to 0.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                    cashApproveOutcome === 'DISPATCHED'
                      ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="cohOutcome"
                    value="DISPATCHED"
                    checked={cashApproveOutcome === 'DISPATCHED'}
                    onChange={() => setCashApproveOutcome('DISPATCHED')}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Keep Dispatched</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Order transitions to <strong>DISPATCHED</strong>. Allocated stock moves to <strong>Dispatched Stock</strong>. COD is set to 0. Enters courier workflow.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Optional Admin Notes
              </label>
              <Input
                placeholder="e.g. Handover approved by Admin; verified collection."
                value={cashApproveNotes}
                onChange={(e) => setCashApproveNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setApprovingCashHandover(null)}
                disabled={isSubmittingCashReview}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={handleConfirmApproveCashHandover}
                disabled={!cashApproveOutcome || isSubmittingCashReview}
                isLoading={isSubmittingCashReview}
              >
                Confirm &amp; Approve
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Dialog for Declining Cash on Hand Request */}
      <Dialog
        isOpen={!!decliningCashHandover}
        onClose={() => !isSubmittingCashReview && setDecliningCashHandover(null)}
        title="Reject Cash On Hand Request"
        description={`Reject Cash On Hand request for Order #${decliningCashHandover?.orderNumber}`}
      >
        {decliningCashHandover && (
          <form onSubmit={handleConfirmDeclineCashHandover} className="space-y-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                Preserve Normal COD Workflow
              </div>
              <p className="text-rose-800">
                Rejecting this request will keep <strong>Order #{decliningCashHandover.orderNumber}</strong> in its
                valid <strong>Prepared (`PREPARED`) state</strong> as a normal COD order. Stock will not move and remains in allocated stock.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rejection Reason <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Customer did not pick up, cash payment not confirmed, must proceed via postal COD..."
                value={cashDeclineNotes}
                onChange={(e) => setCashDeclineNotes(e.target.value)}
                required
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDecliningCashHandover(null)}
                disabled={isSubmittingCashReview}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                isLoading={isSubmittingCashReview}
              >
                Confirm Rejection
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Dossier Dialog for Viewing Cash on Hand Details */}
      <Dialog
        isOpen={!!viewingCashHandover}
        onClose={() => setViewingCashHandover(null)}
        title="Cash on Hand Handover Dossier"
        description="Comprehensive audit details for cash collected and handover status"
        maxWidth="2xl"
      >
        {viewingCashHandover && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-slate-400 block font-medium">Order Number</span>
                <span className="font-bold text-indigo-700 text-sm">#{viewingCashHandover.orderNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Outcome Status</span>
                <span className="font-bold text-slate-800">{viewingCashHandover.outcomeStatus}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Supervisor</span>
                <span className="font-semibold text-slate-800">{viewingCashHandover.supervisorName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Team</span>
                <span className="text-slate-700">{viewingCashHandover.team?.name || 'Assigned Team'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Customer</span>
                <span className="font-semibold text-slate-800">{viewingCashHandover.customerName}</span>
                <span className="text-slate-500 block">{viewingCashHandover.customerPhone}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Submitted At</span>
                <span className="text-slate-700">{format(new Date(viewingCashHandover.createdAt), 'MMM dd, yyyy HH:mm')}</span>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Product Sales Value:</span>
                <span className="font-bold text-slate-900">{formatCurrency(Number(viewingCashHandover.productValue))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Delivery Fee Collected:</span>
                <span className="font-bold text-slate-900">{formatCurrency(Number(viewingCashHandover.deliveryCharge))}</span>
              </div>
              <div className="pt-2 border-t border-emerald-200 flex justify-between items-center text-sm font-bold">
                <span className="text-emerald-950">Total Cash Collected:</span>
                <span className="text-emerald-950 font-black text-lg">{formatCurrency(Number(viewingCashHandover.amountCollected))}</span>
              </div>
            </div>

            {viewingCashHandover.rejectionReason && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="font-bold text-amber-900 block mb-0.5">Rejection Reason:</span>
                <span className="text-amber-800">{viewingCashHandover.rejectionReason}</span>
              </div>
            )}

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Verification Status:</span>
                <span className="font-bold text-slate-900">{viewingCashHandover.status}</span>
              </div>
              {viewingCashHandover.reviewedByName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Reviewed By:</span>
                  <span className="text-slate-800">{viewingCashHandover.reviewedByName}</span>
                </div>
              )}
              {viewingCashHandover.reviewedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Reviewed At:</span>
                  <span className="text-slate-800">{format(new Date(viewingCashHandover.reviewedAt), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              )}
              {viewingCashHandover.adminNotes && (
                <div className="pt-1 text-slate-700">
                  <span className="font-semibold block text-slate-800">Admin Notes:</span>
                  {viewingCashHandover.adminNotes}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setViewingCashHandover(null)}
              >
                Close
              </Button>
              {viewingCashHandover.status === 'PENDING' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDecliningCashHandover(viewingCashHandover);
                      setViewingCashHandover(null);
                    }}
                    className="border-rose-300 text-rose-700 hover:bg-rose-50"
                  >
                    Decline Handover
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setApprovingCashHandover(viewingCashHandover);
                      setViewingCashHandover(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    Confirm Received
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

