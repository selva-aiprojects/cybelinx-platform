import { formatCurrency, formatFileSize, formatNumber } from '../src/formatting';

describe('Formatting Utilities', () => {
  describe('formatCurrency', () => {
    it('formats INR correctly with symbol', () => {
      const result = formatCurrency(125000, 'INR', { locale: 'en-IN' });
      expect(result).toMatch(/₹\s?1,25,000\.00/);
    });

    it('formats USD correctly with symbol', () => {
      const result = formatCurrency(4500.5, 'USD', { locale: 'en-US' });
      expect(result).toBe('$4,500.50');
    });

    it('returns 0.00 on NaN', () => {
      expect(formatCurrency(NaN)).toBe('0.00');
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes, KB, and MB accurately', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(5242880)).toBe('5 MB');
    });
  });

  describe('formatNumber', () => {
    it('formats standard numbers with separators', () => {
      expect(formatNumber(1000000, 'en-US')).toBe('1,000,000');
      expect(formatNumber(1000000, 'en-IN')).toBe('10,00,000');
    });
  });
});
