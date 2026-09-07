import React, { useState, useEffect } from 'react';
import { expenseRepository } from '../../repositories';
import { ExpenseChangeRequest } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';
import { formatCurrency } from '../../utils/currency';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  MessageSquare,
  User,
  History,
  Trash2,
  Edit3
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const FinanceExpenseApprovalsPage: React.FC = () => {
  const { role } = useAuth();
  const [requests, setRequests] = useState<ExpenseChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  // Review Dialog State
  const [selectedRequest, setSelectedRequest] = useState<ExpenseChangeRequest | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    if (role !== 'ADMIN') {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await expenseRepository.getChangeRequests();
      setRequests(data || []);
    } catch {
      toast.error('Failed to load expense change requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role]);

  const filteredRequests = requests.filter((r) => r.status === activeTab);

  const openReview = (req: ExpenseChangeRequest, decision: 'APPROVED' | 'REJECTED') => {
    setSelectedRequest(req);
    setReviewDecision(decision);
    setRejectionReason('');
    setIsReviewModalOpen(true);
  };

  const handleConfirmReview = async () => {
    if (!selectedRequest) return;

    if (reviewDecision === 'REJECTED' && !rejectionReason.trim()) {
      toast.error('Please specify a reason for rejecting this change request.');
      return;
    }

    setIsSubmitting(true);
    try {
      await expenseRepository.reviewChangeRequest(
        selectedRequest.id,
        reviewDecision,
        reviewDecision === 'REJECTED' ? rejectionReason.trim() : undefined
      );

      toast.success(
        reviewDecision === 'APPROVED'
          ? 'Change request approved and modifications applied to the expense!'
          : 'Change request rejected.'
      );

      setIsReviewModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Review action failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingState rows={8} />;

  if (role !== 'ADMIN') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Expense Audit & Change Request Authorizations"
          description="Formal review queue for modifying or voiding operational expenses recorded over 24 hours ago."
        />
        <EmptyState
          title="Admin authorization required"
          description="Expense change requests can only be reviewed by an Admin account."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Audit & Change Request Authorizations"
        description="Formal review queue for modifying or voiding operational expenses recorded over 24 hours ago."
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'PENDING'
              ? 'border-[#01A8F3] text-[#0188C7] bg-[#E8F7FE]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Authorization</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 font-extrabold font-mono">
            {requests.filter((r) => r.status === 'PENDING').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('APPROVED')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'APPROVED'
              ? 'border-[#80BD2B] text-[#547E1B] bg-[#F2F9E9]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Approved History</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800 font-extrabold font-mono">
            {requests.filter((r) => r.status === 'APPROVED').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('REJECTED')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'REJECTED'
              ? 'border-red-600 text-red-600 bg-red-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <XCircle className="w-4 h-4" />
          <span>Rejected Logs</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800 font-extrabold font-mono">
            {requests.filter((r) => r.status === 'REJECTED').length}
          </span>
        </button>
      </div>

      {/* Content List */}
      {filteredRequests.length === 0 ? (
        <EmptyState
          title={`No ${activeTab.toLowerCase()} requests`}
          description={
            activeTab === 'PENDING'
              ? 'All expense records are compliant. No pending change requests awaiting admin review.'
              : `No requests found with status ${activeTab.toLowerCase()}.`
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isDelete = req.action === 'DELETE';
            const original = req.originalValues || {};
            const requested = req.requestedValues || {};

            return (
              <Card key={req.id} className="border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
                <CardContent className="p-5 space-y-4">
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl text-white font-bold ${
                          isDelete ? 'bg-red-600' : 'bg-[#01A8F3]'
                        }`}
                      >
                        {isDelete ? <Trash2 className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                            {isDelete ? 'Void / Delete Expense Authorization' : 'Expense Modification Request'}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              req.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : req.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>Requested by: <strong className="text-slate-700">{req.requestedByName}</strong></span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{format(new Date(req.requestedAt), 'MMM dd, yyyy HH:mm')}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons for pending */}
                    {req.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<XCircle className="w-4 h-4 text-red-600" />}
                          onClick={() => openReview(req, 'REJECTED')}
                          className="text-red-700 border-red-200 hover:bg-red-50 text-xs"
                        >
                          Reject
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<CheckCircle2 className="w-4 h-4 text-white" />}
                          onClick={() => openReview(req, 'APPROVED')}
                          className="bg-[#80BD2B] hover:bg-[#71A924] text-xs shadow-xs"
                        >
                          Authorize & Apply
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Justification Box */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex items-start gap-2.5">
                    <MessageSquare className="w-4 h-4 text-[#01A8F3] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900">Requester Justification:</strong>
                      <p className="mt-0.5 text-slate-600 leading-relaxed italic">"{req.reason}"</p>
                    </div>
                  </div>

                  {/* Side-by-Side Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Original Values */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-slate-400" />
                        <span>Current / Original Recorded Voucher</span>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-700">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Category:</span>
                          <span className="font-semibold">{original.categoryName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Voucher Amount:</span>
                          <span className="font-bold font-mono text-slate-900">{formatCurrency(original.amount)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Expense Date:</span>
                          <span className="font-mono">{original.expenseDate ? format(new Date(original.expenseDate), 'MMM dd, yyyy') : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Remarks:</span>
                          <span className="font-medium text-slate-800 text-right truncate max-w-[200px]">{original.remarks || 'None'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Requested Changes */}
                    <div className={`p-3.5 rounded-xl border ${isDelete ? 'border-red-200 bg-red-50/40' : 'border-[#B9E7FC] bg-[#E8F7FE]/40'} space-y-2`}>
                      <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700">
                        {isDelete ? (
                          <>
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            <span className="text-red-700 font-bold">Action: VOID AND DELETE VOUCHER</span>
                          </>
                        ) : (
                          <>
                            <Edit3 className="w-3.5 h-3.5 text-[#01A8F3]" />
                            <span className="text-[#0188C7] font-bold">Requested Modified Values</span>
                          </>
                        )}
                      </div>

                      {isDelete ? (
                        <div className="text-xs text-red-700 leading-relaxed py-2">
                          Upon admin authorization, this expense voucher will be soft-deleted and removed from the active expense ledger. A permanent audit log will be retained.
                        </div>
                      ) : (
                        <div className="space-y-1.5 text-xs text-slate-700">
                          <div className="flex justify-between py-1 border-b border-blue-100/70">
                            <span className="text-slate-500">Category:</span>
                            <span className={`font-semibold ${requested.categoryName !== original.categoryName ? 'text-[#0188C7] font-bold bg-[#E8F7FE] px-1 rounded' : ''}`}>
                              {requested.categoryName || original.categoryName}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-blue-100/70">
                            <span className="text-slate-500">Voucher Amount:</span>
                            <span className={`font-bold font-mono ${requested.amount !== original.amount ? 'text-[#547E1B] bg-[#F2F9E9] px-1 rounded' : 'text-slate-900'}`}>
                              {formatCurrency(requested.amount !== undefined ? requested.amount : original.amount)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-blue-100/70">
                            <span className="text-slate-500">Expense Date:</span>
                            <span className={`font-mono ${requested.expenseDate !== original.expenseDate ? 'text-[#0188C7] font-bold bg-[#E8F7FE] px-1 rounded' : ''}`}>
                              {requested.expenseDate ? format(new Date(requested.expenseDate), 'MMM dd, yyyy') : 'Unchanged'}
                            </span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-slate-500">Remarks:</span>
                            <span className="font-medium text-slate-800 text-right truncate max-w-[200px]">
                              {requested.remarks || original.remarks}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Review Footnote if already reviewed */}
                  {req.status !== 'PENDING' && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
                      <span>
                        Reviewed by: <strong className="text-slate-800">{req.reviewedByName || 'Admin'}</strong>
                      </span>
                      {req.reviewedAt && <span>Decision Date: {format(new Date(req.reviewedAt), 'MMM dd, yyyy HH:mm')}</span>}
                      {req.rejectionReason && (
                        <div className="w-full text-xs text-red-600 mt-1">
                          <strong>Rejection reason:</strong> {req.rejectionReason}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Confirmation Modal */}
      <Dialog
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={reviewDecision === 'APPROVED' ? 'Authorize Expense Change' : 'Reject Change Request'}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            {reviewDecision === 'APPROVED' ? (
              <span>
                Are you sure you want to <strong>authorize and apply</strong> this change to the expense voucher? This action will permanently update the financial records.
              </span>
            ) : (
              <span>
                Please provide a reason for rejecting this change request. The requester will be notified of the decision.
              </span>
            )}
          </p>

          {reviewDecision === 'REJECTED' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this request cannot be authorized..."
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsReviewModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmReview}
              disabled={isSubmitting}
              className={reviewDecision === 'APPROVED' ? 'bg-[#80BD2B] hover:bg-[#71A924]' : 'bg-red-600 hover:bg-red-700'}
            >
              {isSubmitting ? 'Processing...' : reviewDecision === 'APPROVED' ? 'Confirm & Authorize' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
