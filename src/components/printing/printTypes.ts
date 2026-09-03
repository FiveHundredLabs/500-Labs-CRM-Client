import type { Customer, Order, Team, User } from '../../models/domain';

export interface LeadPrintItem {
  customer: Customer;
  responsibleUser?: User;
  order?: Order;
  team?: Team;
}
