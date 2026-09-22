export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  // Accepts standard 10-digit mobile numbers with optional country code (+91, 91, 0)
  const cleaned = phone.replace(/[\s\-()]/g, '');
  const phoneRegex = /^(\+?91|0)?[6-9]\d{9}$/;
  return phoneRegex.test(cleaned);
}

export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateFileSize(sizeInBytes: number, maxBytes: number): boolean {
  return typeof sizeInBytes === 'number' && sizeInBytes > 0 && sizeInBytes <= maxBytes;
}

export function validateMimeType(mimeType: string, allowedMimeTypes: string[]): boolean {
  if (!mimeType || !Array.isArray(allowedMimeTypes)) return false;
  const target = mimeType.toLowerCase().trim();
  return allowedMimeTypes.some((allowed) => {
    if (allowed.endsWith('/*')) {
      const prefix = allowed.slice(0, -2);
      return target.startsWith(prefix);
    }
    return target === allowed.toLowerCase().trim();
  });
}
