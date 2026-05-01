export const formatCurrency = (amount: number): string => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateShort = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

export const getDaysDiff = (start: string, end: string): number => {
  const s = new Date(start);
  const e = new Date(end);
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
};

export const getRentalDurationType = (
  startDate: Date,
  endDate: Date
): 'daily' | 'weekly' | 'monthly' => {
  const days = Math.max(0, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  if (days >= 30) return 'monthly';
  if (days >= 7) return 'weekly';
  return 'daily';
};

export const getRentalDiscountRate = (durationType: 'daily' | 'weekly' | 'monthly'): number => {
  if (durationType === 'weekly') return 0.05;
  if (durationType === 'monthly') return 0.1;
  return 0;
};

export const calculateRentalCostBreakdown = (
  dailyRate: number,
  weeklyRate: number,
  monthlyRate: number,
  startDate: Date,
  endDate: Date,
  quantity: number
) => {
  const days = Math.max(0, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const durationType = getRentalDurationType(startDate, endDate);
  const units = Math.max(0, quantity);
  const dailySubtotal = dailyRate * days * units;
  const billingCycles = durationType === 'daily'
    ? days
    : durationType === 'weekly'
      ? Math.ceil(days / 7)
      : Math.ceil(days / 30);
  const cycleRate = durationType === 'daily'
    ? dailyRate
    : durationType === 'weekly'
      ? weeklyRate
      : monthlyRate;
  const packageSubtotal = cycleRate * billingCycles * units;
  const discountRate = getRentalDiscountRate(durationType);
  const discountAmount = cycleRate * units * discountRate;
  const total = packageSubtotal - discountAmount;

  return {
    days,
    durationType,
    billingCycles,
    cycleRate,
    dailySubtotal,
    packageSubtotal,
    discountRate,
    discountAmount,
    total,
  };
};

export const calculateRentalCost = (
  dailyRate: number,
  weeklyRate: number,
  monthlyRate: number,
  startDate: Date,
  endDate: Date,
  quantity: number
): number => {
  return calculateRentalCostBreakdown(
    dailyRate,
    weeklyRate,
    monthlyRate,
    startDate,
    endDate,
    quantity
  ).total;
};

export const toDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};
