import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useAuth } from '../../hooks/useAuth';
import { Contact, Order } from '../../models/domain';
import { contactRepository } from '../../repositories';
import { LeadService } from '../../services/leadService';
import { PageHeader } from '../../components/shared/PageHeader';
import { SearchInput } from '../../components/shared/SearchInput';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingState } from '../../components/shared/LoadingState';
import { PostCallModal } from '../../components/calling/PostCallModal';
import { AddPersonalNumberModal } from '../../components/calling/AddPersonalNumberModal';
import { InboundCallbackDialog } from '../../components/calling/InboundCallbackDialog';
import { Clock, PhoneCall, RotateCcw, Star, MapPin, PlusCircle, Hash, PhoneIncoming, Edit3, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { CACHE_TIERS, queryKeys } from '../../lib/queryClient';
import { useContactCountsQuery, usePaginatedContactsQuery } from '../../hooks/queries/useContactsQuery';
import toast from 'react-hot-toast';

type TabCategory =
  | 'ALL'
  | 'NEW'
  | 'FOLLOW_UP'
  | 'ANSWERED'
  | 'NOT_ANSWERED'
  | 'PHONE_OFF'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'DISPATCHED'
  | 'REJECTED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'SAVED_CONTACTS';

interface TabConfig {
  key: TabCategory;
  label: string;
}

const TABS: TabConfig[] = [
  { key: 'ALL', label: 'All' },
  { key: 'NEW', label: 'New' },
  { key: 'FOLLOW_UP', label: 'Follow Up' },
  { key: 'ANSWERED', label: 'Answered' },
  { key: 'NOT_ANSWERED', label: 'Not Answered' },
  { key: 'PHONE_OFF', label: 'Phone Off' },
  { key: 'INTERESTED', label: 'Interested' },
  { key: 'NOT_INTERESTED', label: 'Not Interested' },
  { key: 'DISPATCHED', label: 'Dispatch' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'SAVED_CONTACTS', label: 'Saved Contacts' },
];

export const MemberContactsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabCategory>(() => {
    const tabParam = searchParams.get('tab') as TabCategory | null;
    return tabParam && TABS.some((t) => t.key === tabParam) ? tabParam : 'NEW';
  });
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const pageParam = searchParams.get('page');
    return pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
  });
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('q') || '');

  // Debounce search input by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync URL search params
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'NEW') params.set('tab', activeTab);
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [activeTab, debouncedSearch, currentPage, searchParams, setSearchParams]);

  // 1. TanStack Query for tab status counters
  const countsQuery = useContactCountsQuery(
    { memberId: user?.id, search: debouncedSearch || undefined },
    Boolean(user?.id)
  );

  // 2. TanStack Query for paginated contacts in active tab
  const paginatedQuery = usePaginatedContactsQuery(
    {
      memberId: user?.id,
      tab: activeTab,
      search: debouncedSearch || undefined,
      page: currentPage,
      limit: 50,
    },
    Boolean(user?.id)
  );

  const contacts = paginatedQuery.data?.items ?? [];
  const pageInfo = paginatedQuery.data?.pageInfo;
  const loading = countsQuery.isLoading || paginatedQuery.isLoading;
  const isRefreshing = countsQuery.isFetching || paginatedQuery.isFetching;

  const countMap: Record<TabCategory, number> = useMemo(() => {
    const raw = countsQuery.data || {};
    return {
      ALL: raw.ALL ?? 0,
      NEW: raw.NEW ?? 0,
      FOLLOW_UP: raw.FOLLOW_UP ?? 0,
      ANSWERED: raw.ANSWERED ?? 0,
      NOT_ANSWERED: raw.NOT_ANSWERED ?? 0,
      PHONE_OFF: raw.PHONE_OFF ?? 0,
      INTERESTED: raw.INTERESTED ?? 0,
      NOT_INTERESTED: raw.NOT_INTERESTED ?? 0,
      DISPATCHED: raw.DISPATCHED ?? 0,
      REJECTED: raw.REJECTED ?? 0,
      DELIVERED: raw.DELIVERED ?? 0,
      CANCELLED: raw.CANCELLED ?? 0,
      SAVED_CONTACTS: raw.SAVED_CONTACTS ?? 0,
    };
  }, [countsQuery.data]);

  const filteredContacts = contacts;

  const handleTabChange = (newTab: TabCategory) => {
    setActiveTab(newTab);
    setCurrentPage(1);
  };

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<'OUTBOUND' | 'INBOUND'>('OUTBOUND');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isInboundModalOpen, setIsInboundModalOpen] = useState(false);
  const [isReactivationMode, setIsReactivationMode] = useState(false);
  const [selectedRejectedOrder, setSelectedRejectedOrder] = useState<Order | null>(null);

  const handleRefresh = async () => {
    try {
      await Promise.all([countsQuery.refetch(), paginatedQuery.refetch()]);
      toast.success('Contacts refreshed!');
    } catch {
      toast.error('Failed to refresh contacts.');
    }
  };

  useEffect(() => {
    const handleExternalUpdate = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    };
    window.addEventListener('crm:contact-updated', handleExternalUpdate);
    return () => window.removeEventListener('crm:contact-updated', handleExternalUpdate);
  }, [queryClient]);

  const handleToggleFollowUp = async (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    if (contact.status === 'NEW') return;

    const nextState = !contact.isFollowUp;
    try {
      await contactRepository.update(contact.id, { isFollowUp: nextState });
      toast.success(nextState ? 'Added to Follow-Up List' : 'Removed from Follow-Up List');
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update follow-up state');
    }
  };

  const handleEditLead = async (contact: Contact) => {
    if (!user) return;
    setLoadingOrderId(contact.id);
    try {
      const order = await LeadService.getEditableInterestedOrder(contact.id, user.id, contact.phone);
      if (!order) {
        toast.error('No active editable interested order found for this contact. Lead may have already been dispatched, delivered, or rejected.');
        return;
      }
      setSelectedOrder(order);
      setIsEditMode(true);
      setIsReactivationMode(false);
      setSelectedRejectedOrder(null);
      setSelectedDirection('OUTBOUND');
      setSelectedContact(contact);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load lead details');
    } finally {
      setLoadingOrderId(null);
    }
  };

  const handleReactivateRejectedLead = async (contact: Contact) => {
    if (!user) return;
    setLoadingOrderId(`reject-${contact.id}`);
    try {
      const order = await LeadService.getRejectedOrderForReactivation(contact.id, user.id, contact.phone);
      if (!order) {
        setIsReactivationMode(false);
        setSelectedRejectedOrder(null);
        setSelectedDirection('OUTBOUND');
        setSelectedContact(contact);
        return;
      }
      setSelectedRejectedOrder(order);
      setIsReactivationMode(true);
      setIsEditMode(false);
      setSelectedOrder(null);
      setSelectedDirection('OUTBOUND');
      setSelectedContact(contact);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load rejected lead details');
    } finally {
      setLoadingOrderId(null);
    }
  };

  // Virtualization for large lists (> 25 items) to bound DOM size
  const listContainerRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = filteredContacts.length > 25;

  const virtualizer = useWindowVirtualizer({
    count: shouldVirtualize ? filteredContacts.length : 0,
    estimateSize: () => 82,
    overscan: 6,
    scrollMargin: listContainerRef.current?.offsetTop ?? 0,
  });

  const renderContactCard = (contact: Contact) => (
    <div
      key={contact.id}
      className={`bg-white border rounded-xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3 ${
        contact.isFollowUp ? 'border-amber-200/90 bg-amber-50/20' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Left Info Column */}
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          {contact.status !== 'NEW' && (
            <button
              type="button"
              onClick={(e) => handleToggleFollowUp(contact, e)}
              className="p-1 rounded-md hover:bg-amber-50 text-slate-400 transition-colors cursor-pointer shrink-0"
              title={contact.isFollowUp ? 'Remove from Follow-Up List' : 'Add to Follow-Up List'}
            >
              <Star
                className={`w-4 h-4 ${
                  contact.isFollowUp ? 'fill-amber-400 text-amber-500' : 'text-slate-300 hover:text-amber-400'
                }`}
              />
            </button>
          )}

          <span className="font-bold text-sm sm:text-base text-slate-900 font-mono tracking-tight">
            {contact.phone}
          </span>

          {contact.code && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 bg-[#E8F7FE] text-[#0188C7] border border-[#B9E7FC] rounded-md">
              <Hash className="w-3 h-3 text-[#01A8F3]" />
              <span>{contact.code}</span>
            </span>
          )}

          <StatusBadge type="contact" status={contact.status} />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
          {contact.city && (
            <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>{contact.city}</span>
            </span>
          )}
          {contact.secondaryMobile && (
            <span>
              <span className="text-slate-400">Alt:</span> <span className="font-mono text-slate-700">{contact.secondaryMobile}</span>
            </span>
          )}
          <span>
            <span className="text-slate-400 font-normal">Attempts:</span>{' '}
            <span className="font-semibold text-slate-700">{contact.attemptCount}</span>
          </span>
          <span>
            {contact.lastCalledAt ? (
              <span className="inline-flex items-center gap-1 font-normal text-slate-600">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{format(new Date(contact.lastCalledAt), 'MMM dd • hh:mm a')}</span>
              </span>
            ) : (
              <span className="text-slate-400 italic">Not called yet</span>
            )}
          </span>
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {contact.status === 'INTERESTED' && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Edit3 className="w-3.5 h-3.5 text-emerald-600" />}
            onClick={() => handleEditLead(contact)}
            isLoading={loadingOrderId === contact.id}
            className="border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-semibold"
          >
            Edit Lead
          </Button>
        )}
        <Button
          variant="primary"
          size="sm"
          leftIcon={<PhoneCall className="w-3.5 h-3.5" />}
          onClick={() => {
            if (contact.status === 'REJECTED') {
              handleReactivateRejectedLead(contact);
            } else {
              setSelectedDirection('OUTBOUND');
              setIsEditMode(false);
              setIsReactivationMode(false);
              setSelectedRejectedOrder(null);
              setSelectedOrder(null);
              setSelectedContact(contact);
            }
          }}
          isLoading={loadingOrderId === `reject-${contact.id}`}
          className="shrink-0"
        >
          Call
        </Button>
      </div>
    </div>
  );

  if (loading) return <LoadingState rows={8} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contacts & Leads"
        description="Browse assigned leads by status category, filter follow-ups, and launch calling queue"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Refresh contacts and leads"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#01A8F3] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<PhoneIncoming className="w-3.5 h-3.5 text-blue-600" />}
              onClick={() => setIsInboundModalOpen(true)}
              className="border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700 font-semibold"
            >
              Inbound Call
            </Button>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Contact
            </Button>
          </div>
        }
      />

      {/* Modern Filter Category Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-1 overflow-x-auto pb-px scrollbar-none">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = countMap[tab.key];
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#01A8F3] text-[#0188C7] bg-[#E8F7FE]/30'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                    isActive
                      ? 'bg-[#E8F7FE] text-[#0188C7]'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search phone, code, city, alt mobile across all stages..."
          />
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
          title="Refresh contact list"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#01A8F3] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Contact Cards List */}
      {filteredContacts.length === 0 ? (
        <EmptyState
          title={`No ${
            activeTab === 'SAVED_CONTACTS'
              ? 'Saved'
              : activeTab.toLowerCase().replace('_', ' ')
          } contacts found`}
          description={
            search
              ? `No contacts in this category match "${search}".`
              : activeTab === 'FOLLOW_UP'
              ? 'No contacts have been starred for follow-up yet.'
              : `You currently have 0 contacts in the "${TABS.find((t) => t.key === activeTab)?.label}" category.`
          }
          action={
            activeTab !== 'NEW' ? (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => {
                  handleTabChange('NEW');
                  setSearch('');
                }}
              >
                Switch to New Contacts
              </Button>
            ) : undefined
          }
        />
      ) : shouldVirtualize ? (
        <div ref={listContainerRef} className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const contact = filteredContacts[virtualItem.index];
            return (
              <div
                key={contact.id}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                className="absolute top-0 left-0 w-full pb-2.5"
                style={{
                  transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)`,
                }}
              >
                {renderContactCard(contact)}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredContacts.map(renderContactCard)}
        </div>
      )}

      {/* Pagination Controls */}
      {pageInfo && pageInfo.totalPages !== undefined && pageInfo.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 pb-1 border-t border-slate-200">
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-semibold text-slate-800">{(currentPage - 1) * pageInfo.limit + 1}</span> to{' '}
            <span className="font-semibold text-slate-800">{Math.min(currentPage * pageInfo.limit, pageInfo.total ?? 0)}</span> of{' '}
            <span className="font-semibold text-slate-800">{pageInfo.total}</span> contacts
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1 || !pageInfo.hasPreviousPage}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="text-xs font-semibold cursor-pointer"
            >
              Previous
            </Button>
            <span className="text-xs font-mono font-bold text-slate-700 px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200">
              Page {currentPage} of {pageInfo.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= (pageInfo.totalPages ?? 1) || !pageInfo.hasNextPage}
              onClick={() => setCurrentPage((p) => Math.min(pageInfo.totalPages ?? 1, p + 1))}
              className="text-xs font-semibold cursor-pointer"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Post Call Dialog */}
      {selectedContact && (
        <PostCallModal
          isOpen={!!selectedContact}
          onClose={() => {
            setSelectedContact(null);
            setSelectedOrder(null);
            setSelectedRejectedOrder(null);
            setIsEditMode(false);
            setIsReactivationMode(false);
          }}
          contact={selectedContact}
          onSuccess={handleRefresh}
          initialDirection={selectedDirection}
          editMode={isEditMode}
          existingOrder={selectedOrder}
          reactivationMode={isReactivationMode}
          rejectedOrder={selectedRejectedOrder}
        />
      )}

      {/* Inbound Callback Dialog */}
      <InboundCallbackDialog
        isOpen={isInboundModalOpen}
        onClose={() => setIsInboundModalOpen(false)}
        onSelectContactForCallback={(contact) => {
          setSelectedDirection('INBOUND');
          setSelectedContact(contact);
        }}
      />

      {/* Add Personal Number Modal */}
      <AddPersonalNumberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleRefresh}
        onOpenExistingCallback={(contact) => {
          setSelectedDirection('INBOUND');
          setSelectedContact(contact);
        }}
      />
    </div>
  );
};
