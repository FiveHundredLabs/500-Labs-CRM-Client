import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { ApprovalRequest, ApprovalStatus } from '../../models/domain';
import { approvalRequestRepository } from '../../repositories';
import { ActivityLogService } from '../../services/activityLogService';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { LoadingState } from '../../components/shared/LoadingState';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Clock, ShieldAlert, Package, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export const AdminApprovalsPage: React.FC = () => {
  const { user } = useAuth();

  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'ALL'>('PENDING');

  // Approval Confirm Dialog State
  const [approvingRequest, setApprovingRequest] = useState<ApprovalRequest | null>(null);

  // Rejection Dialog State
  const [rejectingRequest, setRejectingRequest] = useState<ApprovalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await approvalRequestRepository.getAll();
      setRequests(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
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

      toast.success(`Approved ${approvingRequest.requestType.replace(/_/g, ' ')} request! Product data updated.`);
      setApprovingRequest(null);
      loadRequests();
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

      toast.success(`Rejected request ${rejectingRequest.id}.`);
      setRejectingRequest(null);
      setRejectionReason('');
      loadRequests();
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
        description="Review, approve, or reject supervisor stock additions and product price change requests"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Pending Approvals"
          value={pendingCount}
          subtitle="Requests awaiting review"
          icon={<Clock className="w-4 h-4 text-amber-600" />}
          accentColor="amber"
        />
        <StatCard
          title="Approved Requests"
          value={approvedCount}
          subtitle="Stock & price updates active"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          accentColor="green"
        />
        <StatCard
          title="Rejected Requests"
          value={rejectedCount}
          subtitle="Declined requests"
          icon={<XCircle className="w-4 h-4 text-rose-600" />}
          accentColor="red"
        />
        <StatCard
          title="Total Submitted"
          value={requests.length}
          subtitle="Audit log total"
          icon={<Package className="w-4 h-4 text-blue-600" />}
          accentColor="blue"
        />
      </div>

      {/* Approvals Table Container */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Approval Requests Queue</h3>
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
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
              <tr>
                <th className="py-3 px-3">Request ID</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Requested By</th>
                <th className="py-3 px-3">Target Product</th>
                <th className="py-3 px-3">Old Value</th>
                <th className="py-3 px-3">New Value / Qty</th>
                <th className="py-3 px-3">Reason</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                    No approval requests found matching status filter "{statusFilter}".
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-slate-800">{req.id}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        req.requestType === 'STOCK_ADDITION'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {req.requestType === 'STOCK_ADDITION' ? <Package className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                        {req.requestType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900">
                      <div>{req.requestedByName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Team: {req.teamId}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{req.productName}</div>
                      {req.items && req.items.length > 0 && (
                        <div className="text-[10px] text-blue-800 bg-blue-50/80 p-1.5 rounded-lg border border-blue-200 mt-1 space-y-0.5 min-w-[160px]">
                          <div className="font-bold border-b border-blue-200 pb-0.5">1 Approval for {req.items.length} Products:</div>
                          {req.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between font-mono">
                              <span className="truncate max-w-[100px]">{it.productName}:</span>
                              <span className="font-bold text-emerald-700">+{it.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {req.requestType === 'STOCK_ADDITION' ? (req.oldValue !== undefined ? `${req.oldValue} units` : 'Multi-Item') : `LKR ${req.oldValue?.toLocaleString()}`}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                      {req.requestType === 'STOCK_ADDITION' ? `+${req.quantity} Total` : `LKR ${req.newValue?.toLocaleString()}`}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-[150px] truncate" title={req.reason}>
                      {req.reason}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                      {format(new Date(req.createdAt), 'MMM dd, HH:mm')}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            onClick={() => setApprovingRequest(req)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-xs px-2.5 py-1"
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<XCircle className="w-3.5 h-3.5 text-rose-600" />}
                            onClick={() => {
                              setRejectingRequest(req);
                              setRejectionReason('');
                            }}
                            className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs px-2.5 py-1"
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">
                          Reviewed by {req.reviewedByName || 'Admin'} on {req.reviewedDate ? format(new Date(req.reviewedDate), 'MMM dd') : '-'}
                          {req.rejectionReason && <div className="text-rose-600 truncate max-w-[120px]">{req.rejectionReason}</div>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog for Approving Request */}
      <ConfirmDialog
        isOpen={!!approvingRequest}
        onClose={() => setApprovingRequest(null)}
        onConfirm={handleConfirmApprove}
        title="Approve Request & Update Product Data"
        message={
          approvingRequest?.items && approvingRequest.items.length > 0
            ? `Are you sure you want to approve this 1-click bulk stock request for ${approvingRequest.items.length} products? Stock quantities for all requested products will be updated in the database.`
            : `Are you sure you want to approve this ${approvingRequest?.requestType.replace(/_/g, ' ')} for product "${approvingRequest?.productName}"? The changes will be applied directly to the database.`
        }
        confirmText="Approve & Apply"
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
            <div className="font-bold">{rejectingRequest?.productName} ({rejectingRequest?.requestType.replace(/_/g, ' ')})</div>
            <div>Requested by {rejectingRequest?.requestedByName} on {rejectingRequest?.createdAt ? format(new Date(rejectingRequest.createdAt), 'MMM dd, yyyy') : ''}</div>
          </div>

          <Input
            label="Rejection Reason *"
            placeholder="e.g. Quantity exceeds budget limit, or price change unapproved"
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
