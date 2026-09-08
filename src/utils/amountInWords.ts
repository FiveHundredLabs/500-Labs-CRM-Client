/**
 * Deterministic conversion of numeric currency amounts into formal English words
 * formatted for Sri Lankan Rupees and Cents.
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertBelowThousand(num: number): string {
  let str = '';
  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num >= 20) {
    str += TENS[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ONES[num % 10] : '');
  } else if (num > 0) {
    str += ONES[num];
  }
  return str.trim();
}

/**
 * Converts a numeric amount to formal words in Sri Lankan Rupees context.
 * e.g., 25000.50 -> "Sri Lankan Rupees Twenty Five Thousand and Cents Fifty Only"
 */
export function convertAmountToWords(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Sri Lankan Rupees Zero Only';
  }

  const rounded = Math.round(amount * 100) / 100;
  const isNegative = rounded < 0;
  const absAmount = Math.abs(rounded);

  const rupees = Math.floor(absAmount);
  const cents = Math.round((absAmount - rupees) * 100);

  if (rupees === 0 && cents === 0) {
    return 'Sri Lankan Rupees Zero Only';
  }

  let words = '';

  if (rupees > 0) {
    const crores = Math.floor(rupees / 10000000);
    const lakhs = Math.floor((rupees % 10000000) / 100000);
    const thousands = Math.floor((rupees % 100000) / 1000);
    const remainder = rupees % 1000;

    let parts: string[] = [];

    if (crores > 0) {
      parts.push(convertBelowThousand(crores) + ' Crore');
    }
    if (lakhs > 0) {
      parts.push(convertBelowThousand(lakhs) + ' Lakh');
    }
    if (thousands > 0) {
      parts.push(convertBelowThousand(thousands) + ' Thousand');
    }
    if (remainder > 0) {
      parts.push(convertBelowThousand(remainder));
    }

    words = parts.join(' ').trim();
  }

  let result = 'Sri Lankan Rupees ' + (words || 'Zero');

  if (cents > 0) {
    result += ' and Cents ' + convertBelowThousand(cents);
  }

  result += ' Only';

  if (isNegative) {
    result = 'Negative ' + result;
  }

  return result.replace(/\s+/g, ' ');
}
