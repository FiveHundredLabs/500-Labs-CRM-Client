import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { CallLog, Contact, ContactStatus } from '../../models/domain';
import { callLogRepository, contactRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { SearchInput } from '../../components/shared/SearchInput';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingState } from '../../components/shared/LoadingState';
import { PostCallModal } from '../../components/calling/PostCallModal';
import {
  PhoneCall,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit3,
  User,
  MapPin,
  Mail,
  BookmarkCheck,
  FileText,
  Phone,
  Star,
} from 'lucide-react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

type LogFilterTab = 'ALL' | 'FOLLOW_UP' | 'ANSWERED' | 'NOT_ANSWERED' | 'PHONE_OFF' | 'INTERESTED' | 'NOT_INTERESTED' | 'SAVED_CONTACTS';

interface FilterConfig {
  key: LogFilterTab;
  label: string;
}

const FILTER_TABS: FilterConfig[] = [
  { key: 'ALL', label: 'All Calls' },
  { key: 'FOLLOW_UP', label: 'Follow-Up' },
  { key: 'ANSWERED', label: 'Answered' },
  { key: 'NOT_ANSWERED', label: 'Not Answered' },
  { key: 'PHONE_OFF', label: 'Phone Off' },
  { key: 'INTERESTED', label: 'Interested' },
  { key: 'NOT_INTERESTED', label: 'Not Interested' },
  { key: 'SAVED_CONTACTS', label: 'Saved Contacts' },
];

export const MemberFollowUpsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [contactsMap, setContactsMap] = useState<Record<string, Contact>>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<LogFilterTab>('ALL');
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  // Edit Remarks Modal State
  const [editingLog, setEditingLog] = useState<CallLog | null>(null);
  const [editRemarksText, setEditRemarksText] = useState('');
  const [isSavingRemarks, setIsSavingRemarks] = useState(false);

  // Call Modal State
  const [selectedCallContact, setSelectedCallContact] = useState<Contact | null>(null);

  // Read URL tab parameter (e.g., /member/follow-ups?tab=FOLLOW_UP)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'FOLLOW_UP') {
      setActiveTab('FOLLOW_UP');
    }
  }, [searchParams]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [logsData, contactsData] = await Promise.all([
        callLogRepository.getByMemberId(user.id),
        contactRepository.getByMemberId(user.id),
      ]);

      // Create contact map for fast lookup of phone numbers & follow-up states
      const map: Record<string, Contact> = {};
      contactsData.forEach((c) => {
        map[c.id] = c;
      });
      setContactsMap(map);

      // Sort logs descending by date
      logsData.sort((a, b) => new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime());
      setCallLogs(logsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const toggleExpand = (logId: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const handleToggleStarLog = async (log: CallLog, e: React.MouseEvent) => {
    e.stopPropagation();
    if (log.status === 'NEW') return;

    const contact = contactsMap[log.contactId];
    const isCurrentlyFollowUp = Boolean(log.isFollowUp || contact?.isFollowUp);
    const nextState = !isCurrentlyFollowUp;

    try {
      await callLogRepository.update(log.id, { isFollowUp: nextState });
      if (log.contactId) {
        await contactRepository.update(log.contactId, { isFollowUp: nextState });
      }
      toast.success(nextState ? 'Added to Follow-Up List' : 'Removed from Follow-Up List');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update follow-up state.');
    }
  };

  const handleOpenEditRemarks = (log: CallLog) => {
    setEditingLog(log);
    setEditRemarksText(log.remarks || '');
  };

  const handleSaveRemarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;

    setIsSavingRemarks(true);
    try {
      await callLogRepository.update(editingLog.id, {
        remarks: editRemarksText.trim(),
      });
      toast.success('Call remarks updated successfully!');
      setEditingLog(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update remarks.');
    } finally {
      setIsSavingRemarks(false);
    }
  };

  // Compute count for each filter tab
  const countMap: Record<LogFilterTab, number> = {
    ALL: callLogs.length,
    FOLLOW_UP: callLogs.filter((l) => Boolean(l.isFollowUp || contactsMap[l.contactId]?.isFollowUp)).length,
    ANSWERED: callLogs.filter((l) => l.status === 'ANSWERED').length,
    NOT_ANSWERED: callLogs.filter((l) => l.status === 'NOT_ANSWERED').length,
    PHONE_OFF: callLogs.filter((l) => l.status === 'PHONE_OFF').length,
    INTERESTED: callLogs.filter((l) => l.status === 'INTERESTED').length,
    NOT_INTERESTED: callLogs.filter((l) => l.status === 'NOT_INTERESTED').length,
    SAVED_CONTACTS: callLogs.filter((l) => Boolean(l.customerName && l.customerAddress)).length,
  };

  // Filter call logs by tab & search
  const filteredLogs = callLogs.filter((log) => {
    const contact = contactsMap[log.contactId];
    const phone = contact?.phone || log.contactId;

    const matchesSearch =
      phone.toLowerCase().includes(search.toLowerCase()) ||
      (log.customerName && log.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (log.remarks && log.remarks.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'SAVED_CONTACTS') {
      return Boolean(log.customerName && log.customerAddress);
    }
    if (activeTab === 'FOLLOW_UP') {
      return Boolean(log.isFollowUp || contact?.isFollowUp);
    }
    if (activeTab === 'ALL') return true;
    return log.status === activeTab;
  });

  // Saved contacts unique list
  const savedContactsList = callLogs.filter((l) => Boolean(l.customerName && l.customerAddress));

  if (loading) return <LoadingState rows={8} />;

  return (
    <div className="space-y-5 max-w-full overflow-hidden">
      <PageHeader
        title="Call Logs"
        description="View past call history, manage follow-up star lists, and update call remarks"
      />

      {/* Top Filter Bar (Statuses EXCEPT 'New' + Visually Highlighted Follow-Up & Saved Contacts Tabs) */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => {
            const count = countMap[tab.key];
            const isActive = activeTab === tab.key;
            const isSavedTab = tab.key === 'SAVED_CONTACTS';
            const isFollowUpTab = tab.key === 'FOLLOW_UP';

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-lg text-xs transition-all cursor-pointer flex-1 sm:flex-initial min-w-[130px] sm:min-w-0 ${
                  isActive
                    ? isFollowUpTab
                      ? 'bg-amber-100/90 text-amber-900 font-bold border border-amber-300 shadow-2xs'
                      : isSavedTab
                      ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-300 shadow-2xs'
                      : 'bg-blue-50 text-blue-600 font-semibold border border-blue-200 shadow-2xs'
                    : isFollowUpTab
                    ? 'bg-amber-50/70 hover:bg-amber-100/80 text-amber-800 border border-amber-200/80 font-medium'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent'
                }`}
              >
                <span className="whitespace-nowrap flex items-center gap-1.5">
                  {isFollowUpTab && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />}
                  {isSavedTab && <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />}
                  <span>{tab.label}</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                    isActive
                      ? isFollowUpTab
                        ? 'bg-amber-500 text-white font-bold'
                        : isSavedTab
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 text-white'
                      : isFollowUpTab
                      ? 'bg-amber-200 text-amber-900 font-bold'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search ${
              activeTab === 'SAVED_CONTACTS'
                ? 'saved contacts by name or phone'
                : activeTab === 'FOLLOW_UP'
                ? 'follow-up list by phone or notes'
                : 'call logs by phone or notes'
            }...`}
          />
        </div>
        {search && (
          <Button variant="secondary" size="sm" onClick={() => setSearch('')}>
            Clear
          </Button>
        )}
      </div>

      {/* SECTION 1: SAVED CONTACTS VIEW */}
      {activeTab === 'SAVED_CONTACTS' ? (
        filteredLogs.length === 0 ? (
          <EmptyState
            title="No saved contacts found"
            description="No customer contact details have been saved yet. Customer details can be saved during call outcome entry."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {savedContactsList.map((log) => {
              const contact = contactsMap[log.contactId];
              const phone = contact?.phone || log.contactId;

              return (
                <div
                  key={log.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm shrink-0 border border-emerald-200">
                        {log.customerName ? log.customerName[0].toUpperCase() : 'C'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{log.customerName}</h4>
                        <div className="font-mono text-xs font-semibold text-slate-600 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{phone}</span>
                        </div>
                      </div>
                    </div>
                    <StatusBadge type="contact" status={log.status} />
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="font-medium text-slate-800">{log.customerAddress || 'No address saved'}</span>
                    </div>

                    {log.customerEmail && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{log.customerEmail}</span>
                      </div>
                    )}
                  </div>

                  {log.remarks && (
                    <div className="text-xs text-slate-600 italic bg-amber-50/50 p-2 rounded border border-amber-100">
                      &quot;{log.remarks}&quot;
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-slate-400 font-mono text-[11px]">
                      Saved {format(new Date(log.calledAt), 'MMM dd, yyyy')}
                    </span>
                    {contact && (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<PhoneCall className="w-3.5 h-3.5" />}
                        onClick={() => setSelectedCallContact(contact)}
                      >
                        Call Again
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* SECTION 2: CALL LOGS DEFAULT COLLAPSED VIEW (Phone, Call Time, Status + Star & Expand Icon & Update Remarks) */
        filteredLogs.length === 0 ? (
          <EmptyState
            title={`No ${
              activeTab === 'FOLLOW_UP'
                ? 'Follow-Up'
                : activeTab === 'ALL'
                ? ''
                : activeTab.toLowerCase().replace('_', ' ')
            } call logs found`}
            description={
              search
                ? `No call logs match "${search}".`
                : activeTab === 'FOLLOW_UP'
                ? 'No numbers have been added to the Follow-Up list yet. Click the star icon next to any call log to add it!'
                : 'You currently have no call history in this status category.'
            }
          />
        ) : (
          <div className="space-y-2.5">
            {filteredLogs.map((log) => {
              const contact = contactsMap[log.contactId];
              const phone = contact?.phone || log.contactId;
              const isExpanded = expandedLogIds.has(log.id);
              const isStarred = Boolean(log.isFollowUp || contact?.isFollowUp);

              return (
                <div
                  key={log.id}
                  className={`bg-white border rounded-xl shadow-2xs transition-all overflow-hidden ${
                    isStarred ? 'border-amber-200/90' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Default Collapsed Row View: Only Phone Number, Call Time, Status + Actions */}
                  <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      {/* Expand / View Icon Button */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(log.id)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 flex items-center justify-center shrink-0 transition-colors cursor-pointer border border-slate-200/80"
                        title={isExpanded ? 'Collapse details' : 'Expand full call details'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {/* Star Icon Button for Follow-Up toggle */}
                      {log.status !== 'NEW' && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleStarLog(log, e)}
                          className="p-1 rounded-md hover:bg-amber-50 transition-colors cursor-pointer shrink-0"
                          title={isStarred ? 'Remove from Follow-Up List' : 'Add to Follow-Up List'}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              isStarred ? 'fill-amber-400 text-amber-500' : 'text-slate-300 hover:text-amber-400'
                            }`}
                          />
                        </button>
                      )}

                      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4 space-y-1 sm:space-y-0">
                        {/* Phone Number */}
                        <div className="font-bold text-sm sm:text-base text-slate-900 font-mono tracking-tight shrink-0 flex items-center gap-1.5">
                          <span>{phone}</span>
                        </div>

                        {/* Call Time */}
                        <div className="text-xs text-slate-500 flex items-center gap-1 shrink-0">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{format(new Date(log.calledAt), 'MMM dd, yyyy • hh:mm a')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right side: Status Badge + Update Remarks Button */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <StatusBadge type="contact" status={log.status} />

                      {/* Update Remarks Icon Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditRemarks(log)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 flex items-center justify-center shrink-0 transition-colors cursor-pointer border border-slate-200/80"
                        title="Update Remarks"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Full Call Details Section */}
                  {isExpanded && (
                    <div className="bg-slate-50/80 border-t border-slate-100 p-4 space-y-3 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 font-medium block">Call Duration</span>
                          <span className="font-mono font-bold text-slate-800 text-sm">
                            {Math.floor((log.callDurationSeconds || 0) / 60)}m {(log.callDurationSeconds || 0) % 60}s
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Specialist</span>
                          <span className="font-semibold text-slate-800">{user?.fullName || 'Tele-caller'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Follow-Up Status</span>
                          <span className="font-semibold text-amber-700 flex items-center gap-1 mt-0.5">
                            {isStarred ? (
                              <>
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                                <span>Starred in Follow-Up List</span>
                              </>
                            ) : (
                              <span className="text-slate-400 font-normal">Not Starred</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Customer Details if captured */}
                      {log.customerName && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-1 text-xs">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-blue-600" />
                            <span>{log.customerName}</span>
                          </div>
                          {log.customerAddress && (
                            <div className="text-slate-600 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{log.customerAddress}</span>
                            </div>
                          )}
                          {log.customerEmail && (
                            <div className="text-slate-500 flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{log.customerEmail}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Full Remarks Box */}
                      <div>
                        <div className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>Call Remarks / Notes</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-800 italic">
                          {log.remarks ? `"${log.remarks}"` : <span className="text-slate-400 font-normal">No remarks recorded yet.</span>}
                        </div>
                      </div>

                      {/* Expanded View Update Remarks Icon Button */}
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenEditRemarks(log)}
                          className="w-8 h-8 rounded-lg bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 flex items-center justify-center shrink-0 transition-colors cursor-pointer border border-slate-200"
                          title="Update Remarks"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* MODAL 1: Update Remarks Modal */}
      {editingLog && (
        <Dialog
          isOpen={!!editingLog}
          onClose={() => setEditingLog(null)}
          title="Update Call Remarks"
          description={`Call Log ID: ${editingLog.id}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveRemarks} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {contactsMap[editingLog.contactId]?.phone || editingLog.contactId}
                </span>
                <StatusBadge type="contact" status={editingLog.status} />
              </div>
              <div className="text-slate-500">
                Called: {format(new Date(editingLog.calledAt), 'MMM dd, yyyy • hh:mm a')}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Call Remarks &amp; Notes *
              </label>
              <textarea
                rows={4}
                value={editRemarksText}
                onChange={(e) => setEditRemarksText(e.target.value)}
                placeholder="Enter or update notes, customer requests, follow-up times..."
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setEditingLog(null)} disabled={isSavingRemarks}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSavingRemarks}>
                Save Remarks
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* MODAL 2: Post Call Modal for Saved Contacts Re-calling */}
      {selectedCallContact && (
        <PostCallModal
          isOpen={!!selectedCallContact}
          onClose={() => setSelectedCallContact(null)}
          contact={selectedCallContact}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
