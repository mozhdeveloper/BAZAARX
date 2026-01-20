/**
 * Validation Utilities
 * Helper functions for validating user inputs
 */

/**
 * Validate email address
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Philippine phone number
 */
export const validatePhoneNumber = (phone: string): boolean => {
  // Accepts formats: 09123456789, +639123456789, 9123456789
  const phoneRegex = /^(\+63|0)?9\d{9}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

/**
 * Format Philippine phone number
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+63')) {
    return cleaned;
  } else if (cleaned.startsWith('0')) {
    return '+63' + cleaned.slice(1);
  } else if (cleaned.startsWith('9')) {
    return '+63' + cleaned;
  }
  return phone;
};

/**
 * Validate password strength
 */
export const validatePassword = (
  password: string
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate postal code (Philippine ZIP code)
 */
export const validatePostalCode = (postalCode: string): boolean => {
  // Philippine postal codes are 4 digits
  return /^\d{4}$/.test(postalCode);
};

/**
 * Validate URL
 */
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate price (positive number with max 2 decimals)
 */
export const validatePrice = (price: number): boolean => {
  return price > 0 && /^\d+(\.\d{1,2})?$/.test(price.toString());
};

/**
 * Validate stock quantity (non-negative integer)
 */
export const validateStock = (stock: number): boolean => {
  return Number.isInteger(stock) && stock >= 0;
};

/**
 * Validate rating (1-5)
 */
export const validateRating = (rating: number): boolean => {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
};

/**
 * Sanitize HTML to prevent XSS
 */
export const sanitizeHtml = (html: string): string => {
  const temp = document.createElement('div');
  temp.textContent = html;
  return temp.innerHTML;
};

/**
 * Validate required fields
 */
export const validateRequired = (value: any): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

/**
 * Validate minimum length
 */
export const validateMinLength = (value: string, minLength: number): boolean => {
  return value.trim().length >= minLength;
};

/**
 * Validate maximum length
 */
export const validateMaxLength = (value: string, maxLength: number): boolean => {
  return value.trim().length <= maxLength;
};

/**
 * Validate number range
 */
export const validateRange = (
  value: number,
  min: number,
  max: number
): boolean => {
  return value >= min && value <= max;
};

/**
 * Validate voucher code format
 */
export const validateVoucherCode = (code: string): boolean => {
  // Alphanumeric, 4-20 characters
  return /^[A-Z0-9]{4,20}$/i.test(code);
};

/**
 * Validate business registration number (Philippines)
 */
export const validateBusinessRegistration = (regNumber: string): boolean => {
  // Basic validation - can be enhanced based on actual format
  return /^[A-Z0-9-]{5,20}$/i.test(regNumber);
};

/**
 * Validate TIN (Tax Identification Number) - Philippines
 */
export const validateTIN = (tin: string): boolean => {
  // Philippine TIN format: XXX-XXX-XXX-XXX
  const cleaned = tin.replace(/-/g, '');
  return /^\d{9,12}$/.test(cleaned);
};

/**
 * Validate product SKU
 */
export const validateSKU = (sku: string): boolean => {
  // Alphanumeric with hyphens, 3-30 characters
  return /^[A-Z0-9-]{3,30}$/i.test(sku);
};

/**
 * Validate order number format
 */
export const validateOrderNumber = (orderNumber: string): boolean => {
  // Format: BZR-YYYY-XXXXXX
  return /^BZR-\d{4}-\d{6}$/.test(orderNumber);
};
