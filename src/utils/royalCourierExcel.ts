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

  const XLSX = await import('xlsx');

  const CHUNK_SIZE = 100;
  let worksheet: any = null;
  const maxLens: Record<string, number> = {};

  const mapItemToRow = (item: RoyalCourierExportItem, index: number) => {
    const cust = item.customer;
    const ord = item.order;
    const rep = item.responsibleUser;
    const tm = item.team;

    const cod = ord?.codAmount ?? ord?.totalAmount ?? 0;
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
  };

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const chunkRows = chunk.map((item, cIdx) => {
      const row = mapItemToRow(item, i + cIdx);
      for (const [k, v] of Object.entries(row)) {
        const len = String(v ?? '').length;
        if (!maxLens[k] || len > maxLens[k]) {
          maxLens[k] = len;
        }
      }
      return row;
    });

    if (!worksheet) {
      worksheet = XLSX.utils.json_to_sheet(chunkRows);
    } else {
      XLSX.utils.sheet_add_json(worksheet, chunkRows, { skipHeader: true, origin: -1 });
    }
  }

  // Auto-size columns nicely
  const colKeys = Object.keys(maxLens);
  const colWidths = colKeys.map((key) => {
    const maxLen = Math.max(key.length, maxLens[key] || 0);
    return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
  });
  if (worksheet) {
    worksheet['!cols'] = colWidths;
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Royal Courier Dispatch');

  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const filename = customFilename || `Royal_Courier_Dispatch_${timestamp}.xlsx`;

  XLSX.writeFile(workbook, filename);
};
