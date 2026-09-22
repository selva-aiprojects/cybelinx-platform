export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyFormatOptions {
  locale?: string;
  fractionDigits?: number;
  symbol?: boolean;
}

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'INR',
  options: CurrencyFormatOptions = {}
): string {
  const {
    locale = currency === 'INR' ? 'en-IN' : 'en-US',
    fractionDigits = 2,
    symbol = true,
  } = options;

  if (isNaN(amount)) {
    return '0.00';
  }

  return new Intl.NumberFormat(locale, {
    style: symbol ? 'currency' : 'decimal',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}
