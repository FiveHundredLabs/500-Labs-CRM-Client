import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Customer, Order, User, Team } from '../models/domain';

export interface RoyalCourierExportItem {
  customer: Customer;
  order?: Order;
  responsibleUser?: User;
  team?: Team | Pick<Team, 'id' | 'name' | 'code'>;
}

export const downloadRoyalCourierExcel = async (
  items: RoyalCourierExportItem[],
  customFilename?: string
): Promise<void> => {
  if (items.length === 0) {
    throw new Error('No items selected for Royal Courier export.');
  }

  // Map rows according to standard Courier Dispatch Manifest structure
  const rows = items.map((item, index) => {
    const cust = item.customer;
    const ord = item.order;
    const rep = item.responsibleUser;
    const tm = item.team;

    const cod = ord?.totalAmount ?? ord?.codAmount ?? 0;
    const dateFormatted = ord?.createdAt
      ? format(new Date(ord.createdAt), 'yyyy-MM-dd HH:mm')
      : format(new Date(cust.createdAt), 'yyyy-MM-dd HH:mm');

    const note = ord?.deliveryNote || cust.deliveryNote || ord?.remarks || '';

    return {
      '#': index + 1,
      'Order No': ord?.orderNumber || `LEAD-${cust.id.slice(0, 8).toUpperCase()}`,
      'Customer Full Name': cust.fullName,
      'Primary Contact Phone': cust.phone,
      'Secondary Mobile': cust.secondaryMobile || 'N/A',
      'City / Town': cust.city || 'N/A',
      'Full Delivery Address': cust.address,
      'Item / Package Description': ord?.itemsDescription || 'Package Order',
      'COD Amount (LKR)': cod,
      'Delivery Note / Special Instructions': note,
      'Assigned Sales Rep': rep?.fullName || 'N/A',
      'Team / Project': tm?.name || tm?.code || 'N/A',
      'Order Date': dateFormatted,
    };
  });

  // Create worksheet & workbook
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns nicely
  const colKeys = Object.keys(rows[0] || {});
  const colWidths = colKeys.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String((r as any)[key] || '').length)
    );
    return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Royal Courier Dispatch');

  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const filename = customFilename || `Royal_Courier_Dispatch_${timestamp}.xlsx`;

  XLSX.writeFile(workbook, filename);
};
