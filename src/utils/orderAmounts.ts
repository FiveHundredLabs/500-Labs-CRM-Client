import type { Order } from '../models/domain';

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const getProductSalesValue = (order: Pick<Order, 'totalPackageValue' | 'items' | 'adultSubtotal' | 'kidsSubtotal' | 'totalAmount'>): number => {
  const totalPackageValue = toNumber(order.totalPackageValue);
  if (totalPackageValue > 0) return totalPackageValue;

  const itemSubtotal = (order.items || []).reduce((sum, item) => {
    const storedSubtotal = toNumber(item.subtotal);
    if (storedSubtotal > 0) return sum + storedSubtotal;
    return sum + toNumber(item.unitPrice) * toNumber(item.quantity);
  }, 0);
  if (itemSubtotal > 0) return itemSubtotal;

  const legacySubtotal = toNumber(order.adultSubtotal) + toNumber(order.kidsSubtotal);
  if (legacySubtotal > 0) return legacySubtotal;

  return toNumber(order.totalAmount);
};

export const getAmountToCollect = (order: Pick<Order, 'amountToCollect' | 'codAmount' | 'totalAmount'>): number => {
  const amountToCollect = toNumber(order.amountToCollect);
  if (amountToCollect > 0) return amountToCollect;

  const codAmount = toNumber(order.codAmount);
  if (codAmount > 0) return codAmount;

  return toNumber(order.totalAmount);
};

export const getCodCharge = (order: Pick<Order, 'codCharge' | 'amountToCollect' | 'codAmount' | 'totalAmount' | 'totalPackageValue' | 'items' | 'adultSubtotal' | 'kidsSubtotal'>): number => {
  if (order.codCharge !== null && order.codCharge !== undefined) return toNumber(order.codCharge);
  return Math.max(0, getAmountToCollect(order) - getProductSalesValue(order));
};
