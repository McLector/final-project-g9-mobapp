import { EquipmentCategory, EquipmentCondition } from '../types';

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  'Excavation',
  'Lifting',
  'Compaction',
  'Concrete',
  'Drilling',
  'Transport',
  'Power',
  'Safety',
];

export const EQUIPMENT_CONDITIONS: EquipmentCondition[] = [
  'Excellent',
  'Good',
  'Fair',
  'Needs Maintenance',
];

export const CATEGORY_ICONS: Record<EquipmentCategory, string> = {
  Excavation: 'construction',
  Lifting: 'elevator',
  Compaction: 'compress',
  Concrete: 'layers',
  Drilling: 'build',
  Transport: 'local-shipping',
  Power: 'bolt',
  Safety: 'security',
};

export const RENTAL_STATUSES = [
  'pending',
  'approved',
  'active',
  'returned',
  'rejected',
  'cancelled',
] as const;

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  active: 'Active',
  returned: 'Returned',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const VALIDATION = {
  FULL_NAME_MIN: 2,
  FULL_NAME_MAX: 100,
  PHONE_REGEX: /^(\+63|0)[0-9]{3}-?[0-9]{3}-?[0-9]{4}$/,
  PASSWORD_MIN: 6,
  QUANTITY_MIN: 1,
};

export const MESSAGES = {
  REQUIRED: 'This field is required.',
  EMAIL_INVALID: 'Enter a valid email address.',
  PASSWORD_MIN: `Password must be at least ${VALIDATION.PASSWORD_MIN} characters.`,
  PASSWORDS_MISMATCH: 'Passwords do not match.',
  PHONE_INVALID: 'Use format: 09XX-XXX-XXXX or +63XX-XXX-XXXX',
  FULL_NAME_SHORT: `Name must be at least ${VALIDATION.FULL_NAME_MIN} characters.`,
  QUANTITY_INVALID: 'Quantity must be at least 1.',
  DATE_INVALID: 'Invalid date range.',
  DATE_PAST: 'Start date cannot be in the past.',
  END_BEFORE_START: 'End date must be after start date.',
  QUANTITY_EXCEEDS: 'Quantity exceeds available units.',
};

export const PLACEHOLDER_IMAGES: Record<EquipmentCategory, string> = {
  Excavation: 'https://images.unsplash.com/photo-1580894908361-967195033215?w=400&q=80',
  Lifting: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80',
  Compaction: 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=400&q=80',
  Concrete: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  Drilling: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400&q=80',
  Transport: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400&q=80',
  Power: 'https://images.unsplash.com/photo-1621905251189-08b45249ff78?w=400&q=80',
  Safety: 'https://images.unsplash.com/photo-1618090584176-7132b9911657?w=400&q=80',
};
