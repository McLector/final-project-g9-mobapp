import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import useAuth from '../../hooks/useAuth';
import useTheme from '../../hooks/useTheme';
import { formatDate } from '../../utils/format';
import AvailabilityCalendarStyle from './AvailabilityCalendarStyle';

interface Props {
  equipmentId: string;
  totalQuantity: number;
}

interface ActiveRental {
  id: string; start_date: string; end_date: string;
  quantity: number; status: 'approved' | 'active'; customer_id: string;
}
interface PendingRental {
  id: string; start_date: string; end_date: string;
  quantity: number; customer_id: string; created_at: string;
  status: 'pending';
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const toYMD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const AvailabilityCalendar = ({ equipmentId, totalQuantity }: Props) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [activeRentals, setActiveRentals] = useState<ActiveRental[]>([]);
  const [pendingRentals, setPendingRentals] = useState<PendingRental[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rentals')
      .select('id, start_date, end_date, quantity, status, customer_id, created_at')
      .eq('equipment_id', equipmentId)
      .in('status', ['approved', 'active', 'pending'])
      .order('start_date');

    if (data) {
      const all = data as (ActiveRental | PendingRental)[];
      setActiveRentals(all.filter(r => r.status === 'active' || r.status === 'approved') as ActiveRental[]);
      setPendingRentals(all.filter(r => r.status === 'pending') as PendingRental[]);
    }
    setLoading(false);
  }, [equipmentId]);

  useEffect(() => { load(); }, [load]);

  const dayMap = useMemo(() => {
    const map: Record<string, { booked: number; pending: number }> = {};
    const addRange = (start: string, end: string, qty: number, type: 'booked' | 'pending') => {
      const s = new Date(start); const e = new Date(end); const cur = new Date(s);
      while (cur < e) {
        const key = toYMD(cur);
        if (!map[key]) map[key] = { booked: 0, pending: 0 };
        map[key][type] += qty;
        cur.setDate(cur.getDate() + 1);
      }
    };
    activeRentals.forEach(r => addRange(r.start_date, r.end_date, r.quantity, 'booked'));
    pendingRentals.forEach(r => addRange(r.start_date, r.end_date, r.quantity, 'pending'));
    return map;
  }, [activeRentals, pendingRentals]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<number | null> = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const getStatus = useCallback((day: number) => {
    const ymd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const today = toYMD(new Date());
    if (ymd < today) return { type: 'past' as const, available: 0 };
    const info = dayMap[ymd] ?? { booked: 0, pending: 0 };
    const available = Math.max(0, totalQuantity - info.booked);
    if (available === 0) return { type: 'full' as const, available: 0 };
    if (info.booked > 0 || info.pending > 0) return { type: 'partial' as const, available };
    return { type: 'available' as const, available: totalQuantity };
  }, [viewYear, viewMonth, dayMap, totalQuantity]);

  const today = toYMD(now);
  const canGoPrev = !(viewYear === now.getFullYear() && viewMonth <= now.getMonth());
  const goToPrev = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const goToNext = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const myPending = pendingRentals.filter(r => r.customer_id === user?.id);
  const myQueuePos = myPending.length > 0 ? pendingRentals.findIndex(r => r.id === myPending[0].id) + 1 : 0;
  const upcomingEndings = activeRentals.filter(r => {
    const diff = (new Date(r.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 14;
  });

  return (
    <View style={[AvailabilityCalendarStyle.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={AvailabilityCalendarStyle.titleRow}>
        <MaterialIcons name="event-available" size={18} color={colors.primary} />
        <Text style={[AvailabilityCalendarStyle.title, { color: colors.text }]}>Availability</Text>
        <View style={[AvailabilityCalendarStyle.stockBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[AvailabilityCalendarStyle.stockText, { color: colors.primary }]}>{totalQuantity} unit{totalQuantity !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {loading ? (
        <View style={AvailabilityCalendarStyle.loadingBox}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <>
          {/* Alerts */}
          {upcomingEndings.length > 0 && (
            <View style={[AvailabilityCalendarStyle.alertBox, { backgroundColor: colors.infoLight }]}>
              <MaterialIcons name="schedule" size={13} color={colors.info} />
              <Text style={[AvailabilityCalendarStyle.alertText, { color: colors.info }]}>
                {upcomingEndings.length} rental{upcomingEndings.length !== 1 ? 's' : ''} ending soon
                {' — '}units freeing up: {upcomingEndings.map(r => formatDate(r.end_date)).join(', ')}
              </Text>
            </View>
          )}
          {myQueuePos > 0 && (
            <View style={[AvailabilityCalendarStyle.alertBox, { backgroundColor: colors.warningLight }]}>
              <MaterialIcons name="queue" size={13} color={colors.warning} />
              <Text style={[AvailabilityCalendarStyle.alertText, { color: colors.warning }]}>
                Your request is #{myQueuePos} in the pending queue
              </Text>
            </View>
          )}

          {/* Month nav */}
          <View style={AvailabilityCalendarStyle.header}>
            <TouchableOpacity style={[AvailabilityCalendarStyle.navBtn, { backgroundColor: canGoPrev ? colors.cardAlt : colors.borderLight }]} onPress={canGoPrev ? goToPrev : undefined} disabled={!canGoPrev}>
              <MaterialIcons name="chevron-left" size={20} color={canGoPrev ? colors.text : colors.textMuted} />
            </TouchableOpacity>
            <Text style={[AvailabilityCalendarStyle.monthLabel, { color: colors.text }]}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity style={[AvailabilityCalendarStyle.navBtn, { backgroundColor: colors.cardAlt }]} onPress={goToNext}>
              <MaterialIcons name="chevron-right" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Day labels */}
          <View style={AvailabilityCalendarStyle.dayRow}>
            {DAYS.map(d => <Text key={d} style={[AvailabilityCalendarStyle.dayLabel, { color: colors.textMuted }]}>{d}</Text>)}
          </View>

          {/* Grid */}
          <View style={AvailabilityCalendarStyle.grid}>
            {calendarDays.map((day, i) => {
              if (!day) return <View key={`e-${i}`} style={AvailabilityCalendarStyle.cell} />;
              const status = getStatus(day);
              const ymd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = ymd === today;
              const bgColor = { available: 'transparent', partial: `${colors.warning}22`, full: `${colors.danger}18`, past: 'transparent' }[status.type];
              const textColor = { available: isToday ? colors.primary : colors.text, partial: colors.warning, full: colors.danger, past: colors.borderLight }[status.type];
              return (
                <View key={`d-${day}`} style={[AvailabilityCalendarStyle.cell, { backgroundColor: bgColor }, isToday && { borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary }, (status.type === 'full' || status.type === 'partial') && { borderRadius: 6 }]}>
                  <Text style={[AvailabilityCalendarStyle.cellText, { color: textColor }, status.type === 'full' && { textDecorationLine: 'line-through' }, isToday && { fontWeight: '800' }]}>{day}</Text>
                  {status.type === 'partial' && (
                    <Text style={[AvailabilityCalendarStyle.cellSub, { color: colors.warning }]}>{status.available}</Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Active bookings summary */}
          {(activeRentals.length > 0 || pendingRentals.length > 0) && (
            <View style={[AvailabilityCalendarStyle.summaryBox, { borderTopColor: colors.border }]}>
              <Text style={[AvailabilityCalendarStyle.summaryTitle, { color: colors.text }]}>Current Bookings</Text>
              {activeRentals.slice(0, 3).map((r, idx) => {
                const daysLeft = Math.ceil((new Date(r.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const endingSoon = daysLeft >= 0 && daysLeft <= 7;
                return (
                  <View key={r.id} style={[AvailabilityCalendarStyle.bookingRow, { backgroundColor: endingSoon ? colors.infoLight : colors.cardAlt }]}>
                    <View style={[AvailabilityCalendarStyle.bookingDot, { backgroundColor: r.status === 'active' ? colors.success : colors.accent }]} />
                    <View style={AvailabilityCalendarStyle.bookingInfo}>
                      <Text style={[AvailabilityCalendarStyle.bookingLabel, { color: colors.text }]}>
                        Slot {idx + 1} · {r.quantity} unit{r.quantity !== 1 ? 's' : ''} · {r.status}
                      </Text>
                      <Text style={[AvailabilityCalendarStyle.bookingDates, { color: colors.textMuted }]}>
                        {formatDate(r.start_date)} → {formatDate(r.end_date)}{endingSoon ? ` · Ends in ${daysLeft}d` : ''}
                      </Text>
                    </View>
                    {endingSoon && (
                      <View style={[AvailabilityCalendarStyle.endingSoonBadge, { backgroundColor: colors.info }]}>
                        <Text style={AvailabilityCalendarStyle.endingSoonText}>Soon</Text>
                      </View>
                    )}
                  </View>
                );
              })}
              {pendingRentals.length > 0 && (
                <View style={[AvailabilityCalendarStyle.bookingRow, { backgroundColor: colors.warningLight }]}>
                  <View style={[AvailabilityCalendarStyle.bookingDot, { backgroundColor: colors.warning }]} />
                  <Text style={[AvailabilityCalendarStyle.bookingLabel, { color: colors.text }]}>
                    {pendingRentals.length} pending request{pendingRentals.length !== 1 ? 's' : ''} in queue
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Legend */}
          <View style={[AvailabilityCalendarStyle.legend, { borderTopColor: colors.border }]}>
            {[{ color: colors.success, label: 'Available' }, { color: colors.warning, label: 'Partially booked' }, { color: colors.danger, label: 'Fully booked' }].map(item => (
              <View key={item.label} style={AvailabilityCalendarStyle.legendItem}>
                <View style={[AvailabilityCalendarStyle.legendDot, { backgroundColor: item.color }]} />
                <Text style={[AvailabilityCalendarStyle.legendText, { color: colors.textMuted }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

export default AvailabilityCalendar;
