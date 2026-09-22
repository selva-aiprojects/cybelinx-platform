/**
 * Validates Permanent Account Number (PAN) format
 * Structure: 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F)
 */
export function validatePAN(pan: string): boolean {
  if (!pan || typeof pan !== 'string') return false;
  const cleaned = pan.trim().toUpperCase();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(cleaned);
}

/**
 * Validates Goods and Services Tax Identification Number (GSTIN)
 * Structure: 2-digit state code + 10-digit PAN + 1-digit entity code + 'Z' + 1 checksum char
 */
export function validateGSTIN(gstin: string): boolean {
  if (!gstin || typeof gstin !== 'string') return false;
  const cleaned = gstin.trim().toUpperCase();
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(cleaned);
}

/**
 * Validates Ayushman Bharat Health Account (ABHA) number
 * Standard format: 14 digits, optionally separated by hyphens (XX-XXXX-XXXX-XXXX)
 */
export function validateABHA(abha: string): boolean {
  if (!abha || typeof abha !== 'string') return false;
  const cleaned = abha.replace(/[\s-]/g, '');
  return /^[0-9]{14}$/.test(cleaned);
}

/**
 * Validates 12-digit Aadhaar number format
 */
export function validateAadhaar(aadhaar: string): boolean {
  if (!aadhaar || typeof aadhaar !== 'string') return false;
  const cleaned = aadhaar.replace(/[\s-]/g, '');
  if (!/^[2-9]{1}[0-9]{11}$/.test(cleaned)) {
    return false;
  }
  return true;
}
