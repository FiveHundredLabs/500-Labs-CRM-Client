import type { LeadPrintItem } from '../components/printing/printTypes';
import { ParcelSlipData } from '../models/domain';

const getOrderLabel = (item: LeadPrintItem, index: number): string =>
  item.order?.orderNumber || item.order?.id || item.customer?.fullName || `item ${index + 1}`;

export const toParcelSlipData = (item: LeadPrintItem, index = 0): ParcelSlipData => {
  const orderLabel = getOrderLabel(item, index);
  const order = item.order;
  const customer = item.customer || order?.customer;
  const team = item.team || order?.team || customer?.team;

  if (!order) {
    throw new Error(`Order details are missing for ${orderLabel}.`);
  }

  if (!order.publicSlipToken) {
    throw new Error(`Public parcel token is missing for order ${orderLabel}.`);
  }

  if (!customer?.fullName || !customer.address || !customer.phone) {
    throw new Error(`Customer parcel details are incomplete for order ${orderLabel}.`);
  }

  if (!team?.name) {
    throw new Error(`Team parcel sender details are missing for order ${orderLabel}.`);
  }

  return {
    publicSlipToken: order.publicSlipToken,
    orderNumber: order.orderNumber,
    orderDate: order.createdAt,
    itemsDescription: order.itemsDescription,
    paymentMethod: (order as any).paymentMethod || (order as any).paymentType || 'COD',
    codAmount: order.codAmount ?? null,
    totalAmount: order.totalAmount,
    currency: order.currency,
    customer: {
      fullName: customer.fullName,
      phone: customer.phone,
      address: customer.address,
    },
    team: {
      name: team.name,
      code: team.code,
      logo: team.logo || null,
      address: team.address || null,
      contactPhone: team.contactPhone || null,
      contactEmail: team.contactEmail || null,
    },
    items: order.items?.map((orderItem) => ({
      productName: orderItem.productName,
      quantity: orderItem.quantity,
    })),
  };
};

export const toParcelSlipDataList = (items: LeadPrintItem[]): ParcelSlipData[] => {
  if (items.length === 0) {
    throw new Error('Select at least one parcel slip to generate.');
  }

  return items.map(toParcelSlipData);
};
