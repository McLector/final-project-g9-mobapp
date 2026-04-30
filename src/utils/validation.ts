import { MESSAGES, VALIDATION } from '../constants';

export const validateEmail = (value: string): string | null => {
  if (!value.trim()) return MESSAGES.REQUIRED;
  const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailReg.test(value)) return MESSAGES.EMAIL_INVALID;
  return null;
};

export const validatePassword = (value: string): string | null => {
  if (!value) return MESSAGES.REQUIRED;
  if (value.length < VALIDATION.PASSWORD_MIN) return MESSAGES.PASSWORD_MIN;
  return null;
};

export const validateConfirmPassword = (password: string, confirm: string): string | null => {
  if (!confirm) return MESSAGES.REQUIRED;
  if (password !== confirm) return MESSAGES.PASSWORDS_MISMATCH;
  return null;
};

export const validateFullName = (value: string): string | null => {
  if (!value.trim()) return MESSAGES.REQUIRED;
  if (value.trim().length < VALIDATION.FULL_NAME_MIN) return MESSAGES.FULL_NAME_SHORT;
  return null;
};

export const validatePhone = (value: string): string | null => {
  if (!value.trim()) return MESSAGES.REQUIRED;
  if (!VALIDATION.PHONE_REGEX.test(value)) return MESSAGES.PHONE_INVALID;
  return null;
};

export const validateRequired = (value: string): string | null => {
  if (!value?.trim()) return MESSAGES.REQUIRED;
  return null;
};

export const validateQuantity = (value: number, available: number): string | null => {
  if (!value || value < 1) return MESSAGES.QUANTITY_INVALID;
  if (value > available) return MESSAGES.QUANTITY_EXCEEDS;
  return null;
};

export const validateRentalDates = (start: Date, end: Date): string | null => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (start < now) return MESSAGES.DATE_PAST;
  if (end <= start) return MESSAGES.END_BEFORE_START;
  return null;
};

export const validatePositiveNumber = (value: number): string | null => {
  if (value === undefined || value === null) return MESSAGES.REQUIRED;
  if (isNaN(value) || value <= 0) return 'Must be a positive number.';
  return null;
};
