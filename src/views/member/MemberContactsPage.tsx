import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Contact } from '../../models/domain';
import { contactRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { SearchInput } from '../../components/shared/SearchInput';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingState } from '../../components/shared/LoadingState';
import { PostCallModal } from '../../components/calling/PostCallModal';
import { Clock, PhoneCall, RotateCcw, Star } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type TabCategory = 'NEW' | 'FOLLOW_UP' | 'ANSWERED' | 'NOT_ANSWERED' | 'PHONE_OFF' | 'INTERESTED' | 'NOT_INTERESTED' | 'ALL';

interface TabConfig {
  key: TabCategory;
  label: string;
}

const TABS: TabConfig[] = [
  { key: 'NEW', label: 'New' },
  { key: 'FOLLOW_UP', label: 'Follow-Up' },
  { key: 'ANSWERED', label: 'Answered' },
  { key: 'NOT_ANSWERED', label: 'Not Answered' },
  { key: 'PHONE_OFF', label: 'Phone Off' },
  { key: 'INTERESTED', label: 'Interested' },
  { key: 'NOT_INTERESTED', label: 'Not Interested' },
  { key: 'ALL', label: 'All' },
];

export const MemberContactsPage: React.FC = () => {
  const { user } = useAuth();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabCategory>('NEW'); // Default tab is NEW
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const loadContacts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await contactRepository.getByMemberId(user.id);
      setContacts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [user]);

  const handleToggleFollowUp = async (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    if (contact.status === 'NEW') return;

    const nextState = !contact.isFollowUp;
    try {
      await contactRepository.update(contact.id, { isFollowUp: nextState });
      toast.success(nextState ? 'Added to Follow-Up List' : 'Removed from Follow-Up List');
      await loadContacts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update follow-up state');
    }
  };

  // Compute counts per category
  const countMap: Record<TabCategory, number> = {
    NEW: contacts.filter((c) => c.status === 'NEW').length,
    FOLLOW_UP: contacts.filter((c) => c.status !== 'NEW' && c.isFollowUp).length,
    ANSWERED: contacts.filter((c) => c.status === 'ANSWERED').length,
    NOT_ANSWERED: contacts.filter((c) => c.status === 'NOT_ANSWERED').length,
    PHONE_OFF: contacts.filter((c) => c.status === 'PHONE_OFF').length,
    INTERESTED: contacts.filter((c) => c.status === 'INTERESTED').length,
    NOT_INTERESTED: contacts.filter((c) => c.status === 'NOT_INTERESTED').length,
    ALL: contacts.length,
  };

  // Filter contacts by active tab & search
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = c.phone.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'FOLLOW_UP') {
      return c.status !== 'NEW' && Boolean(c.isFollowUp);
    }
    if (activeTab === 'ALL') return true;
    return c.status === activeTab;
  });

  if (loading) return <LoadingState rows={8} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contacts"
        description="Browse assigned leads by status category, filter follow-ups, and launch calls"
      />

      {/* Status Filter Boxes */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const count = countMap[tab.key];
            const isActive = activeTab === tab.key;
            const isFollowUpTab = tab.key === 'FOLLOW_UP';

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-lg text-xs transition-all cursor-pointer flex-1 sm:flex-initial min-w-[135px] sm:min-w-0 ${
                  isActive
                    ? isFollowUpTab
                      ? 'bg-amber-100/90 text-amber-900 font-bold border border-amber-300 shadow-2xs'
                      : 'bg-blue-50 text-blue-600 font-semibold border border-blue-200 shadow-2xs'
                    : isFollowUpTab
                    ? 'bg-amber-50/70 hover:bg-amber-100/80 text-amber-800 border border-amber-200/80 font-medium'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent'
                }`}
              >
                <span className="whitespace-nowrap flex items-center gap-1.5">
                  {isFollowUpTab && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />}
                  <span>{tab.label}</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                    isActive
                      ? isFollowUpTab
                        ? 'bg-amber-500 text-white font-bold'
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

      {/* Search Input Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search ${
              activeTab === 'FOLLOW_UP'
                ? 'follow-up'
                : activeTab === 'ALL'
                ? 'all'
                : activeTab.toLowerCase().replace('_', ' ')
            } contacts by phone...`}
          />
        </div>
        {search && (
          <Button variant="secondary" size="sm" onClick={() => setSearch('')}>
            Clear
          </Button>
        )}
      </div>

      {/* Single-Row Contact Cards List */}
      {filteredContacts.length === 0 ? (
        <EmptyState
          title={`No ${
            activeTab === 'FOLLOW_UP'
              ? 'Follow-Up'
              : activeTab === 'ALL'
              ? ''
              : activeTab.toLowerCase().replace('_', ' ')
          } contacts found`}
          description={
            search
              ? `No contacts in this category match "${search}".`
              : activeTab === 'FOLLOW_UP'
              ? 'No contacts have been added to your Follow-Up list yet. Click the star mark on any called contact to add it to your Follow-Up list!'
              : `You currently have 0 contacts in the "${TABS.find((t) => t.key === activeTab)?.label}" category.`
          }
          action={
            activeTab !== 'NEW' ? (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => {
                  setActiveTab('NEW');
                  setSearch('');
                }}
              >
                Switch to New Contacts
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2.5">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className={`bg-white border rounded-xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3 ${
                contact.isFollowUp ? 'border-amber-200/90' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Left Info Column */}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Star Icon for Non-NEW contacts */}
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
                  <StatusBadge type="contact" status={contact.status} />
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                  <span>
                    <span className="text-slate-400 font-normal">Attempts:</span>{' '}
                    <span className="font-semibold text-slate-700">{contact.attemptCount}</span>
                  </span>
                  <span className="text-slate-300 hidden sm:inline">&bull;</span>
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

              {/* Right Action: Single-row Call Button */}
              <Button
                variant="primary"
                size="sm"
                leftIcon={<PhoneCall className="w-3.5 h-3.5" />}
                onClick={() => setSelectedContact(contact)}
                className="shrink-0"
              >
                Call
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Post Call Dialog */}
      {selectedContact && (
        <PostCallModal
          isOpen={!!selectedContact}
          onClose={() => setSelectedContact(null)}
          contact={selectedContact}
          onSuccess={loadContacts}
        />
      )}
    </div>
  );
};
