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
import { CheckCircle2, XCircle, Clock, ShieldAlert, Package, DollarSign, Eye, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export const AdminApprovalsPage: React.FC = () => {
  const { user } = useAuth();

  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
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

  // Format Approval ID as 26apr19-3 format
  const formatApprovalId = (req: ApprovalRequest, idx: number) => {
    try {
      const date = new Date(req.createdAt);
      const yy = format(date, 'yy'); // e.g. 26
      const dd = format(date, 'dd'); // e.g. 19
      const seqParts = req.id.split('_');
      const lastPart = seqParts[seqParts.length - 1];
      const seqNum = lastPart.length > 2 ? lastPart.slice(-1) : lastPart;
      return `${yy}apr${dd}-${seqNum || idx + 1}`;
    } catch {
      return req.id;
    }
  };

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
      if (viewingRequest && viewingRequest.id === approvingRequest.id) {
        setViewingRequest(null);
      }
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

      toast.success(`Rejected request.`);
      setRejectingRequest(null);
      setRejectionReason('');
      if (viewingRequest && viewingRequest.id === rejectingRequest.id) {
        setViewingRequest(null);
      }
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
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Requests Table strictly keeping Type, Requested, Target Product Names, Date, Actions */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
              <tr>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Requested</th>
                <th className="py-3 px-3">Target Product Names</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No approval requests found matching status filter "{statusFilter}".
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req, idx) => {
                  const formattedId = formatApprovalId(req, idx);
                  return (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      {/* Type Column */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            req.requestType === 'STOCK_ADDITION'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {req.requestType === 'STOCK_ADDITION' ? <Package className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                            {req.requestType.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 font-semibold">
                            ({formattedId})
                          </span>
                        </div>
                      </td>

                      {/* Requested Column */}
                      <td className="py-3 px-3 font-medium text-slate-900">
                        <div>{req.requestedByName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Team: {req.teamId}</div>
                      </td>

                      {/* Target Product Names Column */}
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {req.items && req.items.length > 0 ? (
                          <div>
                            <div className="text-blue-900 font-bold">{req.productName}</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              Products: {req.items.map((it) => `${it.productName} (+${it.quantity})`).join(', ')}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div>{req.productName}</div>
                            {req.quantity ? (
                              <div className="text-[10px] text-emerald-700 font-mono font-bold">+${req.quantity} units requested</div>
                            ) : req.newValue !== undefined ? (
                              <div className="text-[10px] text-purple-700 font-mono font-bold">New Price: LKR {req.newValue.toLocaleString()}</div>
                            ) : null}
                          </div>
                        )}
                      </td>

                      {/* Date Column */}
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {format(new Date(req.createdAt), 'MMM dd, yyyy HH:mm')}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Detailed Breakdown Modal Action */}
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
                            onClick={() => setViewingRequest(req)}
                            className="text-xs px-2.5 py-1"
                            title="View Complete Stock Approval Details"
                          >
                            View
                          </Button>

                          {req.status === 'PENDING' ? (
                            <>
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
                            </>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {req.status}
                            </span>
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
      </div>

      {/* Detailed Stock Approval View Modal */}
      {viewingRequest && (
        <Dialog
          isOpen={!!viewingRequest}
          onClose={() => setViewingRequest(null)}
          title={`Stock Approval Details — #${formatApprovalId(viewingRequest, requests.indexOf(viewingRequest))}`}
          description="Detailed breakdown of requested product stock additions, pricing proposals, and supervisor remarks"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {/* Header Status Bar */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-slate-900 text-sm">{viewingRequest.productName}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Requested by {viewingRequest.requestedByName} ({viewingRequest.teamId}) on {format(new Date(viewingRequest.createdAt), 'MMMM dd, yyyy HH:mm')}
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                viewingRequest.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : viewingRequest.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800 animate-pulse'
              }`}>
                {viewingRequest.status}
              </span>
            </div>

            {/* Target Products Breakdown Table */}
            <div className="space-y-2">
              <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Product Breakdown & Quantity Additions</div>

              {viewingRequest.items && viewingRequest.items.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-semibold text-slate-500">
                      <tr>
                        <th className="py-2 px-3">Product Name</th>
                        <th className="py-2 px-3">Current Stock</th>
                        <th className="py-2 px-3">Addition (+Qty)</th>
                        <th className="py-2 px-3">Projected Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingRequest.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900">{it.productName}</td>
                          <td className="py-2 px-3 font-mono text-slate-500">{it.oldStock ?? '-'}</td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-700">+{it.quantity}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">{it.newStock ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target Product:</span>
                    <span className="font-bold text-slate-900">{viewingRequest.productName}</span>
                  </div>
                  {viewingRequest.oldValue !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Previous Value / Stock:</span>
                      <span className="font-mono">{viewingRequest.oldValue}</span>
                    </div>
                  )}
                  {viewingRequest.newValue !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Proposed New Value / Stock:</span>
                      <span className="font-mono font-bold text-emerald-700">{viewingRequest.newValue}</span>
                    </div>
                  )}
                  {viewingRequest.quantity && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Requested Addition (+Qty):</span>
                      <span className="font-mono font-bold text-blue-700">+{viewingRequest.quantity} units</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Supervisor Remarks */}
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-1">
              <div className="font-bold text-blue-900 text-[11px]">Supervisor Reason & Remarks:</div>
              <div className="text-blue-800">{viewingRequest.reason}</div>
            </div>

            {/* Reviewer Information if reviewed */}
            {viewingRequest.reviewedByName && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 space-y-1">
                <div className="font-bold text-slate-900 text-[11px]">Reviewer Record:</div>
                <div>Reviewed by: <strong>{viewingRequest.reviewedByName}</strong></div>
                <div>Date: {viewingRequest.reviewedDate ? format(new Date(viewingRequest.reviewedDate), 'MMMM dd, yyyy HH:mm') : '-'}</div>
                {viewingRequest.rejectionReason && (
                  <div className="text-rose-700 font-medium">Rejection Reason: {viewingRequest.rejectionReason}</div>
                )}
              </div>
            )}

            {/* Action Buttons inside Modal */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setViewingRequest(null)}>
                Close
              </Button>

              {viewingRequest.status === 'PENDING' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-rose-300 text-rose-700 hover:bg-rose-50"
                    onClick={() => {
                      setRejectingRequest(viewingRequest);
                      setRejectionReason('');
                    }}
                  >
                    Reject Request
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setApprovingRequest(viewingRequest)}
                  >
                    Approve Request
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Dialog>
      )}

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
        description={`Provide a reason for rejecting request #${rejectingRequest ? formatApprovalId(rejectingRequest, requests.indexOf(rejectingRequest)) : ''}`}
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

