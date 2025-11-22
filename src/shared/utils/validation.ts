/**
 * Custom validation utilities (no Zod as per user preference)
 */

export class ValidationError extends Error {
  public errors: Record<string, string>;
  public meta?: Record<string, any>;

  constructor(errors: Record<string, string>, meta?: Record<string, any>) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
    this.meta = meta;
  }

  toResponse(): { fieldErrors: Record<string, string>; meta?: Record<string, any> } {
    return {
      fieldErrors: this.errors,
      meta: this.meta,
    };
  }
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  phone?: boolean;
  custom?: (value: any) => boolean;
  message?: string;
}

export type ValidationSchema = Record<string, ValidationRule>;

/**
 * Validate data against schema
 */
export function validate(data: Record<string, any>, schema: ValidationSchema): void {
  const errors: Record<string, string> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = rules.message || `${field} is required`;
      continue;
    }

    // Skip other validations if value is empty and not required
    if (!rules.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // String length validation
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors[field] = rules.message || `${field} must be at least ${rules.minLength} characters`;
        continue;
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors[field] = rules.message || `${field} must be at most ${rules.maxLength} characters`;
        continue;
      }
    }

    // Number range validation
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors[field] = rules.message || `${field} must be at least ${rules.min}`;
        continue;
      }

      if (rules.max !== undefined && value > rules.max) {
        errors[field] = rules.message || `${field} must be at most ${rules.max}`;
        continue;
      }
    }

    // Pattern validation
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      errors[field] = rules.message || `${field} format is invalid`;
      continue;
    }

    // Email validation
    if (rules.email && typeof value === 'string') {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        errors[field] = rules.message || 'Invalid email format';
        continue;
      }
    }

    // Phone validation (Bangladesh format)
    if (rules.phone && typeof value === 'string') {
      const phonePattern = /^(?:\+88)?01[3-9]\d{8}$/;
      if (!phonePattern.test(value.replace(/\s/g, ''))) {
        errors[field] = rules.message || 'Invalid phone number format';
        continue;
      }
    }

    // Custom validation
    if (rules.custom && !rules.custom(value)) {
      errors[field] = rules.message || `${field} validation failed`;
      continue;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }
}

/**
 * Sanitize string input
 */
export function sanitizeString(value: string): string {
  return value.trim().replace(/[<>]/g, '');
}

/**
 * Validate MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * Validate phone (Bangladesh)
 */
export function isValidPhone(phone: string): boolean {
  const phonePattern = /^(?:\+88)?01[3-9]\d{8}$/;
  return phonePattern.test(phone.replace(/\s/g, ''));
}

/**
 * Validate barcode
 */
export function isValidBarcode(barcode: string): boolean {
  // Support EAN-13, UPC-A, or custom formats
  return /^[0-9]{8,13}$/.test(barcode);
}

export default {
  validate,
  ValidationError,
  sanitizeString,
  isValidObjectId,
  isValidEmail,
  isValidPhone,
  isValidBarcode,
};

