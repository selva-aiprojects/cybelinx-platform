import {
  validatePAN,
  validateGSTIN,
  validateABHA,
  validateAadhaar,
  validateEmail,
  validatePhone,
} from '../src/validation';

describe('Validation Utilities', () => {
  describe('National IDs', () => {
    it('validates PAN correctly', () => {
      expect(validatePAN('ABCDE1234F')).toBe(true);
      expect(validatePAN('abcde1234f')).toBe(true);
      expect(validatePAN('ABCD12345F')).toBe(false);
      expect(validatePAN('')).toBe(false);
    });

    it('validates GSTIN correctly', () => {
      expect(validateGSTIN('27ABCDE1234F1Z5')).toBe(true);
      expect(validateGSTIN('99ABCDE1234F1ZA')).toBe(true);
      expect(validateGSTIN('INVALIDGSTIN')).toBe(false);
    });

    it('validates ABHA format correctly', () => {
      expect(validateABHA('12-3456-7890-1234')).toBe(true);
      expect(validateABHA('12345678901234')).toBe(true);
      expect(validateABHA('12345')).toBe(false);
    });

    it('validates 12-digit Aadhaar pattern', () => {
      expect(validateAadhaar('2345 6789 0123')).toBe(true);
      expect(validateAadhaar('234567890123')).toBe(true);
      expect(validateAadhaar('123456789012')).toBe(false); // First digit cannot be 0 or 1
      expect(validateAadhaar('abcdefghijk')).toBe(false);
    });
  });

  describe('Common Validators', () => {
    it('validates email addresses', () => {
      expect(validateEmail('user@cybelinx.com')).toBe(true);
      expect(validateEmail('dr.priya+clinic@hospital.org')).toBe(true);
      expect(validateEmail('not-an-email')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    it('validates mobile phone numbers', () => {
      expect(validatePhone('9876543210')).toBe(true);
      expect(validatePhone('+91 9876543210')).toBe(true);
      expect(validatePhone('09876543210')).toBe(true);
      expect(validatePhone('12345')).toBe(false);
    });
  });
});
