import { ContactStatus, OrderStatus, EmailNotificationStatus } from '../models/domain';
import {
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Truck,
  CheckCheck,
  RotateCcw,
  FileText,
  MailCheck,
  MailX,
  AlertCircle
} from 'lucide-react';

export interface StatusMeta {
  label: string;
  badgeClass: string;
  icon?: any;
}

export const CONTACT_STATUS_CONFIG: Record<ContactStatus, StatusMeta> = {
  NEW: {
    label: 'New',
    badgeClass: 'badge-blue',
    icon: Clock,
  },
  ANSWERED: {
    label: 'Answered',
    badgeClass: 'badge-green',
    icon: PhoneCall,
  },
  NOT_ANSWERED: {
    label: 'Not Answered',
    badgeClass: 'badge-amber',
    icon: PhoneMissed,
  },
  PHONE_OFF: {
    label: 'Phone Off',
    badgeClass: 'badge-gray',
    icon: PhoneOff,
  },
  INTERESTED: {
    label: 'Interested',
    badgeClass: 'badge-green',
    icon: CheckCircle2,
  },
  NOT_INTERESTED: {
    label: 'Not Interested',
    badgeClass: 'badge-red',
    icon: XCircle,
  },
  DISPATCHED: {
    label: 'Dispatched',
    badgeClass: 'badge-amber',
    icon: Truck,
  },
  DELIVERED: {
    label: 'Delivered',
    badgeClass: 'badge-green',
    icon: CheckCheck,
  },
};

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusMeta> = {
  DRAFT: {
    label: 'Draft',
    badgeClass: 'badge-gray',
    icon: FileText,
  },
  PREPARED: {
    label: 'Prepared',
    badgeClass: 'badge-indigo',
    icon: Package,
  },
  DISPATCHED: {
    label: 'Dispatched',
    badgeClass: 'badge-amber',
    icon: Truck,
  },
  DELIVERED: {
    label: 'Delivered',
    badgeClass: 'badge-green',
    icon: CheckCheck,
  },
  REJECTED: {
    label: 'Rejected',
    badgeClass: 'badge-red',
    icon: XCircle,
  },
  RETURNED: {
    label: 'Returned',
    badgeClass: 'badge-purple',
    icon: RotateCcw,
  },
};

export const USER_STATUS_CONFIG = {
  ACTIVE: {
    label: 'Active',
    badgeClass: 'badge-green',
  },
  DISABLED: {
    label: 'Disabled',
    badgeClass: 'badge-gray',
  },
};

export const EMAIL_STATUS_CONFIG: Record<EmailNotificationStatus, StatusMeta> = {
  SENT: {
    label: 'Email Sent',
    badgeClass: 'badge-green',
    icon: MailCheck,
  },
  SKIPPED: {
    label: 'Email Skipped',
    badgeClass: 'badge-amber',
    icon: MailX,
  },
  FAILED: {
    label: 'Email Failed',
    badgeClass: 'badge-red',
    icon: AlertCircle,
  },
};
