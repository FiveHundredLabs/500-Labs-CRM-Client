import React from 'react';
import { ContactStatus, OrderStatus } from '../../models/domain';
import { CONTACT_STATUS_CONFIG, ORDER_STATUS_CONFIG, USER_STATUS_CONFIG } from '../../config/status';

export interface StatusBadgeProps {
  type: 'contact' | 'order' | 'user';
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, status, className = '' }) => {
  let meta = {
    label: status,
    badgeClass: 'badge-gray',
    icon: null as any,
  };

  if (type === 'contact') {
    const config = CONTACT_STATUS_CONFIG[status as ContactStatus];
    if (config) {
      meta = { label: config.label, badgeClass: config.badgeClass, icon: config.icon };
    }
  } else if (type === 'order') {
    const config = ORDER_STATUS_CONFIG[status as OrderStatus];
    if (config) {
      meta = { label: config.label, badgeClass: config.badgeClass, icon: config.icon };
    }
  } else if (type === 'user') {
    const uConfig =
      status === 'ACTIVE' || status === 'true'
        ? USER_STATUS_CONFIG.ACTIVE
        : USER_STATUS_CONFIG.DISABLED;
    meta = { label: uConfig.label, badgeClass: uConfig.badgeClass, icon: null };
  }

  const IconComp = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full transition-colors ${meta.badgeClass} ${className}`}
    >
      {IconComp && <IconComp className="w-3 h-3" />}
      <span>{meta.label}</span>
    </span>
  );
};
