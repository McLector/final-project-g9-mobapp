import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../../../src/lib/supabase';
import useAuth from '../../../../src/hooks/useAuth';
import useTheme from '../../../../src/hooks/useTheme';
import { Rental, CustomerStackParamList } from '../../../../src/types';
import { formatCurrency, formatDate } from '../../../../src/utils/format';
import StatusBadge from '../../../../src/components/StatusBadge/StatusBadge';
import EmptyState from '../../../../src/components/EmptyState/EmptyState';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';

type Props = { navigation: NativeStackNavigationProp<CustomerStackParamList> };

const RentalHistory = ({ navigation }: Props) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('rentals')
      .select('*, equipment(name, category, image_url)')
      .eq('customer_id', user?.id)
      .in('status', ['returned', 'cancelled', 'rejected'])
      .order('updated_at', { ascending: false });
    if (data) setRentals(data as Rental[]);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  if (loading) return <LoadingSpinner message="Loading history..." />;

  const completedCount = rentals.filter(r => r.status === 'returned').length;
  const cancelledCount = rentals.filter(r => r.status !== 'returned').length;
  const totalSpend = rentals.filter(r => r.status === 'returned').reduce((s, r) => s + r.total_cost, 0);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[{ flex: 1, backgroundColor: colors.background }]}>
      <View style={[{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Rental History</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>Completed &amp; cancelled rentals</Text>
        </View>
      </View>

      {/* Summary strip */}
      {rentals.length > 0 && (
        <View style={[{ flexDirection: 'row', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
          {[
            { label: 'Completed', value: completedCount, color: colors.success },
            { label: 'Cancelled', value: cancelledCount, color: colors.warning },
            { label: 'Total Spent', value: formatCurrency(totalSpend), color: colors.primary },
          ].map(s => (
            <View key={s.label} style={[{ flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', gap: 3, backgroundColor: colors.cardAlt }]}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={rentals}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, marginBottom: 10, overflow: 'hidden' }]}
            onPress={() => navigation.navigate('CustomerRentalDetail', { rentalId: item.id })}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', padding: 14, gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                  {item.equipment?.name ?? 'Equipment'}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {formatDate(item.start_date)} → {formatDate(item.end_date)}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  Qty: {item.quantity} · {item.duration_type}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <StatusBadge status={item.status} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: item.status === 'returned' ? colors.primary : colors.textMuted }}>
                  {formatCurrency(item.total_cost)}
                </Text>
                <MaterialIcons name="chevron-right" size={16} color={colors.textMuted} />
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="history"
            title="No history yet"
            subtitle="Completed and cancelled rentals will appear here"
          />
        }
      />
    </SafeAreaView>
  );
};

export default RentalHistory;
