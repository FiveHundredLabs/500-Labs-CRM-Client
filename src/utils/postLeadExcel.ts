import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Customer, Order, User, Team } from '../models/domain';

export interface PostLeadExportItem {
  customer: Customer;
  order?: Order;
  responsibleUser?: User;
  team?: Team | Pick<Team, 'id' | 'name' | 'code' | 'address'>;
}

export interface InterestedCourierExportRow {
  Date: string;
  'NO (Start From 1) Write this number on the Parcel': number;
  Sender: string;
  Receiver: string;
  'Postal City': string;
  'Pay Back Value': number | '';
  'Weight in grams': number | '';
  Barcode: string;
}

export const INTERESTED_EXCEL_HEADERS: (keyof InterestedCourierExportRow)[] = [
  'Date',
  'NO (Start From 1) Write this number on the Parcel',
  'Sender',
  'Receiver',
  'Postal City',
  'Pay Back Value',
  'Weight in grams',
  'Barcode',
];

const formatExportDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'dd.MM.yyyy');
};

const buildSender = (team?: Team | Pick<Team, 'id' | 'name' | 'code' | 'address'>): string => {
  if (!team) return '';
  const name = (team.name || team.code || '').trim().toUpperCase();
  const rawAddress = 'address' in team && team.address ? team.address : '';
  const address = rawAddress
    ? rawAddress.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim()
    : '';

  if (name && address) {
    return `${name} - ${address}`;
  }
  return name || address || '';
};

const buildReceiver = (customer: Customer): string => {
  const name = (customer.fullName || '').trim();
  const phone = (customer.phone || '').trim();
  const secondaryPhone = (customer.secondaryMobile || '').trim();
  const address = (customer.address || '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const phonePart =
    secondaryPhone && secondaryPhone !== phone
      ? `${phone} / ${secondaryPhone}`
      : phone;
  const parts = [name, phonePart, address].filter(Boolean);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

const getPostalCity = (customer: Customer): string => {
  return (customer.city || '').trim();
};

const getPayBackValue = (order?: Order): number | '' => {
  if (!order) return '';

  const paymentMethod = (order as any).paymentMethod
    ? String((order as any).paymentMethod).toUpperCase()
    : 'COD';

  if (
    paymentMethod.includes('PREPAID') ||
    paymentMethod.includes('CARD') ||
    paymentMethod.includes('BANK')
  ) {
    return '';
  }

  const cod =
    order.codAmount !== undefined && order.codAmount !== null
      ? Number(order.codAmount)
      : order.totalAmount !== undefined && order.totalAmount !== null
        ? Number(order.totalAmount)
        : '';

  if (typeof cod === 'number' && !Number.isNaN(cod) && cod > 0) {
    return cod;
  }
  return '';
};

const getWeightInGrams = (order?: Order, customer?: Customer): number | '' => {
  const weight =
    (order as any)?.weightGrams ??
    (order as any)?.weight ??
    (customer as any)?.weight;

  if (typeof weight === 'number' && !Number.isNaN(weight) && weight > 0) {
    return weight;
  }
  return '';
};

export const buildInterestedExportRows = (
  items: PostLeadExportItem[]
): InterestedCourierExportRow[] => {
  return items.map((item, index) => {
    const cust = item.customer;
    const ord = item.order;
    const team = item.team;

    const rawDate = ord?.createdAt || cust.createdAt;

    return {
      Date: formatExportDate(rawDate),
      'NO (Start From 1) Write this number on the Parcel': index + 1,
      Sender: buildSender(team),
      Receiver: buildReceiver(cust),
      'Postal City': getPostalCity(cust),
      'Pay Back Value': getPayBackValue(ord),
      'Weight in grams': getWeightInGrams(ord, cust),
      Barcode: '',
    };
  });
};

export const downloadPostLeadExcel = async (
  items: PostLeadExportItem[],
  customFilename?: string
): Promise<void> => {
  if (items.length === 0) {
    throw new Error('No items selected for Post Lead export.');
  }

  const rows = buildInterestedExportRows(items);

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: INTERESTED_EXCEL_HEADERS,
  });

  // Set professional column widths
  worksheet['!cols'] = [
    { wch: 13 }, // Date
    { wch: 48 }, // NO (Start From 1) Write this number on the Parcel
    { wch: 45 }, // Sender
    { wch: 65 }, // Receiver
    { wch: 20 }, // Postal City
    { wch: 18 }, // Pay Back Value
    { wch: 18 }, // Weight in grams
    { wch: 25 }, // Barcode
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Interested Orders');

  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const filename = customFilename || `interested_orders_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, filename);
};
