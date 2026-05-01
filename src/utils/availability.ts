import { supabase } from '../lib/supabase';
import { Equipment, Rental } from '../types';

export type AvailabilityResult = {
  available: number;
  booked: number;
  total: number;
};

type RentalAvailabilityRow = Pick<Rental, 'id' | 'quantity' | 'start_date' | 'end_date' | 'status'>;

export const rangesOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string
) => startA < endB && endA > startB;

export const getRangeAvailability = async (
  equipmentId: string,
  startDate: string,
  endDate: string,
  excludeRentalId?: string
): Promise<AvailabilityResult> => {
  const { data: rpcAvailable, error: rpcError } = await supabase.rpc('rental_range_available', {
    p_equipment_id: equipmentId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_exclude_rental_id: excludeRentalId ?? null,
  });

  const { data: equipment, error: equipmentError } = await supabase
    .from('equipment')
    .select('total_quantity')
    .eq('id', equipmentId)
    .single();

  if (equipmentError) throw new Error(equipmentError.message);
  const total = Number((equipment as Pick<Equipment, 'total_quantity'>).total_quantity ?? 0);

  if (!rpcError && typeof rpcAvailable === 'number') {
    return {
      total,
      available: rpcAvailable,
      booked: Math.max(0, total - rpcAvailable),
    };
  }

  const { data: rentals, error: rentalsError } = await supabase
    .from('rentals')
    .select('id, quantity, start_date, end_date, status')
    .eq('equipment_id', equipmentId)
    .in('status', ['approved', 'active'])
    .lt('start_date', endDate)
    .gt('end_date', startDate);

  if (rentalsError) throw new Error(rentalsError.message);

  const booked = ((rentals ?? []) as RentalAvailabilityRow[])
    .filter((rental) => rental.id !== excludeRentalId)
    .reduce((sum, rental) => sum + rental.quantity, 0);

  return {
    total,
    booked,
    available: Math.max(0, total - booked),
  };
};

export const assertRangeAvailability = async (
  equipmentId: string,
  startDate: string,
  endDate: string,
  quantity: number,
  excludeRentalId?: string
) => {
  const availability = await getRangeAvailability(equipmentId, startDate, endDate, excludeRentalId);
  if (quantity > availability.available) {
    throw new Error(
      `Only ${availability.available} unit${availability.available === 1 ? '' : 's'} available for the selected dates.`
    );
  }
  return availability;
};
