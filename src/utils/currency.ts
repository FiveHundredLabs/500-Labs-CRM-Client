/**
 * Formats a monetary amount to LKR currency representation.
 * Example: 100 -> "LKR 100.00"
 */
export const formatCurrency = (amount: number | string | undefined | null): string => {
  if (amount === undefined || amount === null || amount === '') return 'LKR 0.00';
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return 'LKR 0.00';
  return `LKR ${numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
