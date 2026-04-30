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

export const calculateRentalCost = (
  dailyRate: number,
  weeklyRate: number,
  monthlyRate: number,
  startDate: Date,
  endDate: Date,
  durationType: 'daily' | 'weekly' | 'monthly',
  quantity: number
): number => {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  let baseRate = 0;

  if (durationType === 'daily') baseRate = dailyRate * days;
  else if (durationType === 'weekly') baseRate = weeklyRate * Math.ceil(days / 7);
  else baseRate = monthlyRate * Math.ceil(days / 30);

  return baseRate * quantity;
};

export const toDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};
