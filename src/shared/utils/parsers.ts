interface BaseParseOptions {
  fieldLabel?: string;
  required?: boolean;
}

interface NumberParseOptions extends BaseParseOptions {
  min?: number;
  max?: number;
  integer?: boolean;
}

interface MoneyParseOptions extends BaseParseOptions {
  min?: number;
}

export interface ParseResult<T> {
  value?: T;
  error?: string;
}

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

const label = (fieldLabel?: string): string => fieldLabel || 'Value';

export function normalizeString(
  value: unknown,
  options: BaseParseOptions = {}
): ParseResult<string> {
  if (isBlank(value)) {
    if (options.required) {
      return { error: `${label(options.fieldLabel)} is required` };
    }
    return {};
  }

  if (typeof value !== 'string') {
    return { error: `${label(options.fieldLabel)} must be a string` };
  }

  const normalized = value.trim();
  if (!normalized && options.required) {
    return { error: `${label(options.fieldLabel)} is required` };
  }

  return normalized ? { value: normalized } : {};
}

export function toNumber(value: unknown, options: NumberParseOptions = {}): ParseResult<number> {
  if (isBlank(value)) {
    if (options.required) {
      return { error: `${label(options.fieldLabel)} is required` };
    }
    return {};
  }

  const numeric =
    typeof value === 'number'
      ? value
      : Number(
          typeof value === 'string'
            ? value
                .trim()
                .replace(/,/g, '')
                .replace(/[^\d.-]/g, '')
            : value
        );

  if (!Number.isFinite(numeric)) {
    return { error: `${label(options.fieldLabel)} must be a valid number` };
  }

  if (options.integer && !Number.isInteger(numeric)) {
    return { error: `${label(options.fieldLabel)} must be an integer` };
  }

  if (options.min !== undefined && numeric < options.min) {
    return { error: `${label(options.fieldLabel)} must be at least ${options.min}` };
  }

  if (options.max !== undefined && numeric > options.max) {
    return { error: `${label(options.fieldLabel)} must be at most ${options.max}` };
  }

  return { value: numeric };
}

export function toPositiveInteger(
  value: unknown,
  options: NumberParseOptions = {}
): ParseResult<number> {
  return toNumber(value, {
    ...options,
    integer: true,
    min: options.min ?? 1,
  });
}

export function toNonNegativeInteger(
  value: unknown,
  options: NumberParseOptions = {}
): ParseResult<number> {
  return toNumber(value, {
    ...options,
    integer: true,
    min: options.min ?? 0,
  });
}

export function toMoney(value: unknown, options: MoneyParseOptions = {}): ParseResult<number> {
  const result = toNumber(value, { ...options, min: options.min ?? 0 });
  if (result.error) {
    return result;
  }

  if (result.value === undefined) {
    return { value: 0 };
  }

  return { value: Math.round((result.value + Number.EPSILON) * 100) / 100 };
}

export function toDateUTC(value: unknown, options: BaseParseOptions = {}): ParseResult<Date> {
  if (isBlank(value)) {
    if (options.required) {
      return { error: `${label(options.fieldLabel)} is required` };
    }
    return {};
  }

  const parsed = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(parsed.getTime())) {
    return { error: `${label(options.fieldLabel)} must be a valid date` };
  }

  return { value: parsed };
}

export default {
  normalizeString,
  toNumber,
  toPositiveInteger,
  toNonNegativeInteger,
  toMoney,
  toDateUTC,
};

