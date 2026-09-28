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
import { useContactsQuery } from '../../hooks/queries/useContactsQuery';
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
  const [search, setSearch] = useState(() => searchParams.get('q') || '');

  // Debounced URL search param synchronization (doesn't trigger network calls or reload page)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (activeTab !== 'NEW') {
        params.set('tab', activeTab);
      } else {
        params.delete('tab');
      }
      if (search.trim()) {
        params.set('q', search.trim());
      } else {
        params.delete('q');
      }
      if (params.toString() !== searchParams.toString()) {
        setSearchParams(params, { replace: true });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [activeTab, search, searchParams, setSearchParams]);

  // Load all contacts assigned to this team member once
  const contactsQuery = useContactsQuery(
    { memberId: user?.id },
    Boolean(user?.id)
  );

  const contacts = contactsQuery.data ?? [];
  const loading = contactsQuery.isLoading && contacts.length === 0;
  const isRefreshing = contactsQuery.isFetching;

  // Compute status counts per category across all assigned contacts
  const countMap: Record<TabCategory, number> = useMemo(() => {
    return {
      ALL: contacts.length,
      NEW: contacts.filter((c) => c.status === 'NEW').length,
      FOLLOW_UP: contacts.filter((c) => c.status !== 'NEW' && c.isFollowUp).length,
      ANSWERED: contacts.filter((c) => c.status === 'ANSWERED').length,
      NOT_ANSWERED: contacts.filter((c) => c.status === 'NOT_ANSWERED').length,
      PHONE_OFF: contacts.filter((c) => c.status === 'PHONE_OFF').length,
      INTERESTED: contacts.filter((c) => c.status === 'INTERESTED').length,
      NOT_INTERESTED: contacts.filter((c) => c.status === 'NOT_INTERESTED').length,
      DISPATCHED: contacts.filter((c) => c.status === 'DISPATCHED').length,
      REJECTED: contacts.filter((c) => c.status === 'REJECTED').length,
      DELIVERED: contacts.filter((c) => c.status === 'DELIVERED').length,
      CANCELLED: contacts.filter((c) => c.status === 'CANCELLED').length,
      SAVED_CONTACTS: contacts.filter((c) => c.isSelfAdded || Boolean(c.addedBy)).length || contacts.length,
    };
  }, [contacts]);

  // Filter contacts by active tab & search
  // When a search term is entered, show matching contacts across ALL stages, not just the active tab
  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      const matchesSearch =
        !q ||
        c.phone.toLowerCase().includes(q) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.secondaryMobile && c.secondaryMobile.toLowerCase().includes(q)) ||
        (c.importBatchId && c.importBatchId.toLowerCase().includes(q)) ||
        (c.allocationSource && c.allocationSource.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // When search term is entered, show matching contacts across all stages
      if (q) {
        return true;
      }

      if (activeTab === 'ALL') {
        return true;
      }
      if (activeTab === 'FOLLOW_UP') {
        return c.status !== 'NEW' && Boolean(c.isFollowUp);
      }
      if (activeTab === 'SAVED_CONTACTS') {
        const hasSelfAdded = contacts.some((x) => x.isSelfAdded || Boolean(x.addedBy));
        return hasSelfAdded ? Boolean(c.isSelfAdded || c.addedBy) : true;
      }
      return c.status === activeTab;
    });
  }, [contacts, search, activeTab]);

  const handleTabChange = (newTab: TabCategory) => {
    setActiveTab(newTab);
    if (search) {
      setSearch('');
    }
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
      await contactsQuery.refetch();
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
      className={`bg-white border rounded-xl p-3 sm:p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 ${
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
      <div className="flex items-center justify-end gap-2 shrink-0 pt-1.5 sm:pt-0 border-t border-slate-100 sm:border-0">
        {contact.status === 'INTERESTED' && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Edit3 className="w-3.5 h-3.5 text-emerald-600" />}
            onClick={() => handleEditLead(contact)}
            isLoading={loadingOrderId === contact.id}
            className="border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-semibold h-7 sm:h-8 text-xs px-2.5"
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

      {/* Filter Tabs Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-3 shadow-2xs">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {TABS.map((tab) => {
            const count = countMap[tab.key];
            const isActive = activeTab === tab.key;
            const isFollowUpTab = tab.key === 'FOLLOW_UP';
            const isDelivered = tab.key === 'DELIVERED';
            const isRejected = tab.key === 'REJECTED';
            const isNew = tab.key === 'NEW';

            let activeBadgeStyle = 'bg-[#01A8F3] text-white';
            let activeContainerStyle = 'bg-[#E8F7FE] text-[#0188C7] font-bold border border-[#B9E7FC] shadow-2xs';

            if (isFollowUpTab) {
              activeBadgeStyle = 'bg-amber-500 text-white font-bold';
              activeContainerStyle = 'bg-amber-100/90 text-amber-900 font-bold border border-amber-300 shadow-2xs';
            } else if (isDelivered) {
              activeBadgeStyle = 'bg-[#80BD2B] text-white font-bold';
              activeContainerStyle = 'bg-[#F2F9E9] text-[#547E1B] font-bold border border-[#D4ECC6] shadow-2xs';
            } else if (isRejected) {
              activeBadgeStyle = 'bg-rose-600 text-white font-bold';
              activeContainerStyle = 'bg-rose-50 text-rose-800 font-bold border border-rose-300 shadow-2xs';
            } else if (isNew) {
              activeBadgeStyle = 'bg-[#01A8F3] text-white font-bold';
              activeContainerStyle = 'bg-[#E8F7FE] text-[#0188C7] font-bold border border-[#B9E7FC] shadow-2xs';
            }

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer min-w-0 sm:min-w-0 ${
                  isActive
                    ? activeContainerStyle
                    : isFollowUpTab
                    ? 'bg-amber-50/70 hover:bg-amber-100/80 text-amber-800 border border-amber-200/80 font-medium'
                    : isRejected
                    ? 'bg-rose-50/50 hover:bg-rose-100/70 text-rose-700 border border-rose-200/60 font-medium'
                    : isDelivered
                    ? 'bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-700 border border-emerald-200/60 font-medium'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                <span className="whitespace-nowrap flex items-center gap-1.5">
                  {isFollowUpTab && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />}
                  <span>{tab.label}</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                    isActive ? activeBadgeStyle : isFollowUpTab ? 'bg-amber-200 text-amber-900' : isRejected ? 'bg-rose-100 text-rose-800' : isDelivered ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
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

      {/* Search Result Summary Banner */}
      {search.trim() && (
        <div className="flex items-center justify-between text-xs px-3 py-2 text-slate-600 bg-sky-50/60 border border-sky-100 rounded-lg">
          <span>
            Showing all numbers matching <strong className="text-slate-900 font-bold">&quot;{search}&quot;</strong> ({filteredContacts.length} found across all stages)
          </span>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-[#0188C7] hover:underline font-semibold cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Contact Cards List */}
      {filteredContacts.length === 0 ? (
        <EmptyState
          title={search ? 'No matching contacts found' : `No ${
            activeTab === 'SAVED_CONTACTS'
              ? 'Saved'
              : activeTab.toLowerCase().replace('_', ' ')
          } contacts found`}
          description={
            search
              ? `No contacts matching "${search}" were found across all stages.`
              : activeTab === 'FOLLOW_UP'
              ? 'No contacts have been starred for follow-up yet.'
              : `You currently have 0 contacts in the "${TABS.find((t) => t.key === activeTab)?.label}" category.`
          }
          action={
            search ? (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => setSearch('')}
              >
                Clear Search
              </Button>
            ) : activeTab !== 'NEW' ? (
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
