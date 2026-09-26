import type { LeadPrintItem } from '../components/printing/printTypes';
import { ParcelSlipData, ParcelSlipItem } from '../models/domain';
import { getAmountToCollect, getCodCharge, getProductSalesValue } from './orderAmounts';

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

  const contactCode =
    (customer as any)?.code ||
    (customer as any)?.contactCode ||
    (order as any)?.contactCode ||
    (customer as any)?.contact?.code ||
    null;

  const secondaryMobile =
    customer.secondaryMobile ||
    (customer as any)?.secondaryPhone ||
    (order as any)?.customer?.secondaryMobile ||
    (order as any)?.customer?.secondaryPhone ||
    (customer as any)?.contact?.secondaryMobile ||
    null;

  const isCashOnHand =
    order.isCashOnHand === true ||
    order.deliveryMethod === 'CASH_ON_HAND' ||
    (order as any).paymentMethod === 'CASH_ON_HAND' ||
    (order as any).paymentType === 'CASH_ON_HAND';

  const productSalesValue = getProductSalesValue(order);
  const codCharge = isCashOnHand ? 0 : getCodCharge(order);
  const amountToCollect = isCashOnHand ? 0 : getAmountToCollect(order);

  let items: ParcelSlipItem[] | undefined = undefined;

  if (order.items && order.items.length > 0) {
    items = order.items.map((orderItem) => {
      const unitPrice =
        orderItem.unitPrice !== undefined && orderItem.unitPrice !== null
          ? Number(orderItem.unitPrice)
          : undefined;
      const subtotal =
        orderItem.subtotal !== undefined && orderItem.subtotal !== null
          ? Number(orderItem.subtotal)
          : unitPrice !== undefined
            ? unitPrice * (orderItem.quantity || 1)
            : undefined;
      const price =
        subtotal ??
        (unitPrice !== undefined ? unitPrice * (orderItem.quantity || 1) : undefined);

      return {
        productName: orderItem.productName,
        quantity: orderItem.quantity,
        unitPrice,
        subtotal,
        price,
      };
    });
  } else if (
    (order.adultQty && order.adultQty > 0) ||
    (order.kidsQty && order.kidsQty > 0)
  ) {
    items = [];
    if (order.adultQty && order.adultQty > 0) {
      const adultPrice = Number(
        order.adultSubtotal ||
          Number(order.adultUnitPrice || 0) * order.adultQty,
      );
      items.push({
        productName: 'Adult Package',
        quantity: order.adultQty,
        unitPrice: Number(order.adultUnitPrice || 0),
        subtotal: adultPrice,
        price: adultPrice,
      });
    }
    if (order.kidsQty && order.kidsQty > 0) {
      const kidsPrice = Number(
        order.kidsSubtotal ||
          Number(order.kidsUnitPrice || 0) * order.kidsQty,
      );
      items.push({
        productName: 'Kids Package',
        quantity: order.kidsQty,
        unitPrice: Number(order.kidsUnitPrice || 0),
        subtotal: kidsPrice,
        price: kidsPrice,
      });
    }
  } else if (order.itemsDescription) {
    items = [
      {
        productName: order.itemsDescription,
        quantity: 1,
        unitPrice: productSalesValue,
        subtotal: productSalesValue,
        price: productSalesValue,
      },
    ];
  }

  return {
    publicSlipToken: order.publicSlipToken,
    orderNumber: order.orderNumber,
    orderDate: order.createdAt,
    itemsDescription: order.itemsDescription,
    paymentMethod: isCashOnHand
      ? 'CASH ON HAND'
      : (order as any).paymentMethod || (order as any).paymentType || 'COD',
    isCashOnHand,
    deliveryMethod: order.deliveryMethod,
    codCharge,
    deliveryCharge: codCharge,
    codAmount: amountToCollect,
    amountToCollect,
    productSalesValue,
    totalAmount: order.totalAmount,
    currency: order.currency,
    contactCode: contactCode || null,
    customer: {
      fullName: customer.fullName,
      phone: customer.phone,
      secondaryMobile: secondaryMobile || null,
      address: customer.address,
      contactCode: contactCode || null,
      code: (customer as any)?.code || null,
    },
    team: {
      name: team.name,
      code: team.code,
      logo: team.logo || null,
      address: team.address || null,
      contactPhone: team.contactPhone || null,
      contactEmail: team.contactEmail || null,
    },
    items,
  };
};

export const toParcelSlipDataList = (items: LeadPrintItem[]): ParcelSlipData[] => {
  if (items.length === 0) {
    throw new Error('Select at least one parcel slip to generate.');
  }

  return items.map(toParcelSlipData);
};
