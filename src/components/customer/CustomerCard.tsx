import React from 'react';
import type { User } from '../../models/domain';
import {
  CheckSquare,
  Square,
  Phone,
  MapPin,
  UserCheck,
  Calendar,
} from 'lucide-react';

export interface CustomerCardProps {
  isSelected: boolean;
  onToggleSelect: () => void;
  customerName: string;
  orderNumber?: string;
  badge?: React.ReactNode;
  phone?: string;
  address?: string;
  handledByMember?: User;
  dateString?: string;
  middleContent?: React.ReactNode;
  actionButtons?: React.ReactNode;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({
  isSelected,
  onToggleSelect,
  customerName,
  orderNumber,
  badge,
  phone,
  address,
  handledByMember,
  dateString,
  middleContent,
  actionButtons,
}) => {
  return (
    <div
      onClick={onToggleSelect}
      className={`
        rounded-xl border p-2
        transition-all cursor-pointer select-none
        bg-white
        ${
          isSelected
            ? 'border-2 border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-500/20'
            : 'border-slate-200 hover:border-slate-300 shadow-2xs'
        }
      `}
    >
      {/* TOP ROW: Checkbox + Name + Order # | Status Badge */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            className="shrink-0 flex items-center justify-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
          >
            {isSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-300 hover:text-slate-400" />
            )}
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <h3 className="font-bold text-[11px] sm:text-xs text-slate-900 truncate">
                {customerName}
              </h3>
              {orderNumber && (
                <span className="text-[9.5px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded shrink-0 font-semibold border border-slate-200">
                  #{orderNumber}
                </span>
              )}
            </div>
          </div>
        </div>

        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {/* CONTACT DETAILS & OPTIONAL MIDDLE CONTENT */}
      <div className="mt-1 space-y-1 pl-2.5 sm:pl-5 pr-0.5">
        {phone && (
          <div className="flex items-center gap-1.5 min-w-0">
            <Phone className="w-3 h-3 text-blue-500 shrink-0" />
            <span className="text-[10px] sm:text-[10.5px] font-mono font-semibold text-blue-600 truncate">
              {phone}
            </span>
          </div>
        )}

        {address && (
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-[10px] sm:text-[10.5px] text-slate-600 truncate">
              {address}
            </span>
          </div>
        )}

        {middleContent}
      </div>

      {/* BOTTOM ROW: Handled By | Date */}
      <div className="mt-1.5 pl-2.5 sm:pl-5 flex items-center justify-between gap-2 min-w-0 text-[9px] sm:text-[9.5px]">
        <div className="flex items-center gap-1 min-w-0">
          <UserCheck className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-slate-600 truncate">
            Handled by:{' '}
            <strong className="font-semibold text-slate-700">
              {handledByMember ? handledByMember.fullName : 'N/A'}
            </strong>
          </span>
        </div>

        {dateString && (
          <div className="flex items-center gap-1 shrink-0 font-medium text-slate-400">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{dateString}</span>
          </div>
        )}
      </div>

      {/* CARD ACTION BUTTONS SLOT */}
      {actionButtons && (
        <div
          className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {actionButtons}
        </div>
      )}
    </div>
  );
};
