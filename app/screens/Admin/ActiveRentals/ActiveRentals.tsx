import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList, RefreshControl, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../../../src/lib/supabase';
import useTheme from '../../../../src/hooks/useTheme';
import { Rental, AdminStackParamList } from '../../../../src/types';
import { formatCurrency, formatDate } from '../../../../src/utils/format';
import StatusBadge from '../../../../src/components/StatusBadge/StatusBadge';
import EmptyState from '../../../../src/components/EmptyState/EmptyState';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';

type Props = { navigation: NativeStackNavigationProp<AdminStackParamList> };

// Approved rentals are reserved/ongoing work and should be visible here too.
const ALLOWED = ['approved', 'active', 'returned', 'cancelled'] as const;
type FilterType = 'all' | 'approved' | 'active' | 'returned' | 'cancelled';

const ActiveRentals = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [filter, setFilter] = useState<FilterType>('active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('rentals')
      .select('*, equipment(name, category, image_url), customer:profiles(full_name)')
      .in('status', ALLOWED)
      .order('start_date', { ascending: false });
    if (data) setRentals(data as Rental[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const filtered = filter === 'all' ? rentals : rentals.filter(r => r.status === filter);
  const counts: Record<string, number> = {};
  ALLOWED.forEach(s => { counts[s] = rentals.filter(r => r.status === s).length; });
  const ongoingCount = (counts.approved ?? 0) + (counts.active ?? 0);

  const getDaysLeft = (endDate: string): number => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) return <LoadingSpinner message="Loading rentals..." />;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: colors.surface,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt }}
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, flex: 1 }}>
            Ongoing Rentals
          </Text>
          {ongoingCount > 0 && (
            <View style={{ backgroundColor: colors.success, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>{ongoingCount} ongoing</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
          {filtered.length} {filter === 'all' ? 'total' : filter} rental{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filter chips */}
      <View style={{
        flexDirection: 'row', gap: 8,
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: colors.surface,
      }}>
        {(['all', ...ALLOWED] as FilterType[]).map(f => {
          const cnt = f === 'all' ? rentals.length : (counts[f] ?? 0);
          const active = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[{
                paddingHorizontal: 14, paddingVertical: 8,
                borderRadius: 20, borderWidth: 1.5, flex: 1, alignItems: 'center',
              }, active
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
              onPress={() => setFilter(f)}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#FFF' : colors.textSecondary }}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                {cnt > 0 ? ` (${cnt})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const customer = (item as unknown as { customer: { full_name: string } }).customer;
          const daysLeft = getDaysLeft(item.end_date);
          const isActive = item.status === 'active';
          const isApproved = item.status === 'approved';
          const urgentColor = daysLeft <= 3 ? colors.danger : daysLeft <= 7 ? colors.warning : colors.success;

          return (
            <TouchableOpacity
              style={{
                borderRadius: 14, borderWidth: 1,
                borderColor: isActive && daysLeft <= 3 ? colors.danger : colors.border,
                backgroundColor: colors.card, marginBottom: 10, overflow: 'hidden',
              }}
              onPress={() => navigation.navigate('RentalDetail', { rentalId: item.id })}
              activeOpacity={0.85}
            >
              <View style={{ padding: 14, gap: 8 }}>
                {/* Top row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      {item.equipment?.name ?? 'Equipment'}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>
                      {customer?.full_name ?? 'Customer'} · Qty: {item.quantity}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {formatDate(item.start_date)} → {formatDate(item.end_date)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 5 }}>
                    <StatusBadge status={item.status} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>
                      {formatCurrency(item.total_cost)}
                    </Text>
                  </View>
                </View>

                {/* Days left pill for approved/active rentals */}
                {(isActive || isApproved) && (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    alignSelf: 'flex-start',
                    paddingHorizontal: 10, paddingVertical: 5,
                    borderRadius: 20,
                    backgroundColor: `${urgentColor}18`,
                    borderWidth: 1, borderColor: `${urgentColor}40`,
                  }}>
                    <MaterialIcons
                      name={daysLeft <= 0 ? 'error' : 'schedule'}
                      size={13}
                      color={urgentColor}
                    />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: urgentColor }}>
                      {isApproved
                        ? 'Approved - ready to activate'
                        : daysLeft <= 0
                        ? 'Overdue — return expected'
                        : daysLeft === 1
                        ? 'Due tomorrow'
                        : `${daysLeft} days left`}
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ paddingHorizontal: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialIcons name="chevron-right" size={14} color={colors.textMuted} />
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Tap to view details</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="play-circle-filled"
            title="No rentals found"
            subtitle={`No ${filter === 'all' ? '' : filter + ' '}rentals.`}
          />
        }
      />
    </SafeAreaView>
  );
};

export default ActiveRentals;
