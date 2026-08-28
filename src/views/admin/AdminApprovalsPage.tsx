import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { ApprovalRequest, ApprovalStatus, Team } from '../../models/domain';
import { approvalRequestRepository, teamRepository } from '../../repositories';
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
} from 'lucide-react';
import { format } from 'date-fns';

export const AdminApprovalsPage: React.FC = () => {
  const { user } = useAuth();

  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'ALL'>('PENDING');

  // View Details Modal State
  const [viewingRequest, setViewingRequest] = useState<ApprovalRequest | null>(null);

  // Approval Confirm Dialog State
  const [approvingRequest, setApprovingRequest] = useState<ApprovalRequest | null>(null);

  // Rejection Dialog State
  const [rejectingRequest, setRejectingRequest] = useState<ApprovalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allRequests, allTeams] = await Promise.all([
        approvalRequestRepository.getAll(),
        teamRepository.getAll(),
      ]);
      setRequests(allRequests);
      setTeams(allTeams);
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

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => statusFilter === 'ALL' || r.status === statusFilter);
  }, [requests, statusFilter]);

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  if (loading) return <LoadingState rows={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centralized Approvals Center"
        description="Review, inspect, and approve supervisor stock replenishment and product price change requests"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Pending Approvals"
          value={pendingCount}
          subtitle="Requests awaiting action"
          icon={<Clock className="w-4 h-4 text-amber-600" />}
          accentColor={pendingCount > 0 ? 'amber' : 'green'}
        />
        <StatCard
          title="Approved Requests"
          value={approvedCount}
          subtitle="Stock & prices active in CRM"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          accentColor="green"
        />
        <StatCard
          title="Rejected Requests"
          value={rejectedCount}
          subtitle="Declined submissions"
          icon={<XCircle className="w-4 h-4 text-rose-600" />}
          accentColor="red"
        />
        <StatCard
          title="Total Requests"
          value={requests.length}
          subtitle="System-wide audit trail"
          icon={<Package className="w-4 h-4 text-blue-600" />}
          accentColor="blue"
        />
      </div>

      {/* Approvals Table Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            <CardTitle className="text-base font-bold text-slate-900">
              Approval Requests Queue
            </CardTitle>
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
                      No approval requests found matching filter "{statusFilter}".
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const teamInfo = teams.find((t) => t.id === req.teamId);
                    const brand = getTeamBranding(req.teamId);

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
                            {req.requestType.replace(/_/g, ' ')}
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

                        {/* 4. Target Product (Single line title) */}
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

                        {/* 7. Actions (View Details Button) */}
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

      {/* Comprehensive View Details Modal */}
      <Dialog
        isOpen={!!viewingRequest}
        onClose={() => setViewingRequest(null)}
        title="Approval Request Dossier"
        description="Comprehensive review of the requested stock modifications, items breakdown, and supervisor justification."
      >
        {viewingRequest && (
          <div className="space-y-5">
            {/* Top Overview KPI Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
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
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Supervisor Request Reason &amp; Justification:</span>
              </div>
              <p className="text-xs text-blue-900 leading-relaxed font-sans pl-5">
                "{viewingRequest.reason || 'No additional notes provided.'}"
              </p>
            </div>

            {/* Multi-Product Bulk Addition Items Table (When multiple items exist) */}
            {viewingRequest.items && viewingRequest.items.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-emerald-600" />
                    <span>Product Stock Additions Breakdown ({viewingRequest.items.length} Products)</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    +{viewingRequest.items.reduce((s, it) => s + (it.quantity || 0), 0)} Total Units
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 sticky top-0">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Product Name</th>
                        <th className="p-2.5 text-center">Previous Stock</th>
                        <th className="p-2.5 text-center">Quantity Added</th>
                        <th className="p-2.5 text-center">New Stock Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {viewingRequest.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 text-slate-400 font-sans">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-slate-900 font-sans">{it.productName}</td>
                          <td className="p-2.5 text-center text-slate-600">{it.oldStock ?? '—'} units</td>
                          <td className="p-2.5 text-center font-bold text-emerald-700 bg-emerald-50/50">
                            +{it.quantity} units
                          </td>
                          <td className="p-2.5 text-center font-black text-blue-700">
                            {it.newStock ?? ((it.oldStock || 0) + it.quantity)} units
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Single Item Value Details */
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Previous Value / Stock</span>
                  <div className="text-base font-bold text-slate-800 font-mono mt-0.5">
                    {viewingRequest.requestType === 'STOCK_ADDITION'
                      ? `${viewingRequest.oldValue ?? 0} units`
                      : formatCurrency(viewingRequest.oldValue)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">New Requested Value / Qty</span>
                  <div className="text-base font-bold text-emerald-700 font-mono mt-0.5">
                    {viewingRequest.requestType === 'STOCK_ADDITION'
                      ? `+${viewingRequest.quantity ?? 0} units`
                      : formatCurrency(viewingRequest.newValue)}
                  </div>
                </div>
              </div>
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
    </div>
  );
};
