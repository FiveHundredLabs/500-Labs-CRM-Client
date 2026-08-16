import React from 'react';
import type { ActivityLog } from '../../models/domain';
import {
  UserPlus,
  PhoneCall,
  UserCheck,
  Package,
  Truck,
  CheckCircle2,
  Mail,
  DollarSign,
  Clock,
  User,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';

export interface ActivityTimelineProps {
  activities: ActivityLog[];
  className?: string;
}

const ACTION_CONFIG: Record<string, { icon: React.FC<any>; color: string; bg: string }> = {
  CONTACT_IMPORTED: { icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50' },
  CONTACT_ALLOCATED: { icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50' },
  CALL_COMPLETED: { icon: PhoneCall, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  CUSTOMER_CREATED: { icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ORDER_CREATED: { icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ORDER_PREPARED: { icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ORDER_DISPATCHED: { icon: Truck, color: 'text-amber-600', bg: 'bg-amber-50' },
  DELIVERY_STATUS_CHANGED: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  EMAIL_NOTIFICATION_SENT: { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
  EXPENSE_CREATED: { icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
  PROFILE_UPDATED: { icon: User, color: 'text-sky-600', bg: 'bg-sky-50' },
  USER_CREATED: { icon: UserPlus, color: 'text-teal-600', bg: 'bg-teal-50' },
  SYSTEM_CONFIG_UPDATED: { icon: Settings, color: 'text-amber-600', bg: 'bg-amber-50' },
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities, className = '' }) => {
  if (activities.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400">
        No recorded activity history yet.
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {activities.map((act, index) => {
        const conf = ACTION_CONFIG[act.action] ?? {
          icon: Clock,
          color: 'text-slate-500',
          bg: 'bg-slate-100',
        };
        const Icon = conf.icon;

        return (
          <div key={act.id} className="relative flex gap-3 pb-3 last:pb-0">
            {/* Connector line */}
            {index !== activities.length - 1 && (
              <span
                className="absolute left-3.5 top-7 bottom-0 w-px bg-slate-200"
                aria-hidden="true"
              />
            )}

            {/* Dot / Icon */}
            <div
              className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full shrink-0 border border-slate-200 ${conf.bg} ${conf.color}`}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>

            {/* Content */}
            <div className="flex-1 bg-white border border-slate-200 rounded-lg p-3 text-xs shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-slate-900">{act.userName}</span>
                <span className="text-[11px] font-normal text-slate-400">
                  {format(new Date(act.createdAt), 'MMM dd • hh:mm a')}
                </span>
              </div>
              <p className="text-slate-600 leading-normal">{act.description}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-medium uppercase tracking-wider">
                  {act.userRole}
                </span>
                <span className="text-[11px] text-slate-400">· {act.entityType}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
