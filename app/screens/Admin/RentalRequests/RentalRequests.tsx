import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, FlatList, RefreshControl,
  ScrollView, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../../../src/lib/supabase';
import useTheme from '../../../../src/hooks/useTheme';
import { useToast } from '../../../../src/hooks/useToast';
import { Rental, RentalStatus, AdminStackParamList } from '../../../../src/types';
import { formatCurrency, formatDate, getDaysDiff } from '../../../../src/utils/format';
import StatusBadge from '../../../../src/components/StatusBadge/StatusBadge';
import EmptyState from '../../../../src/components/EmptyState/EmptyState';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';
import RentalRequestsStyle from './RentalRequestsStyle';

type Props = { navigation: NativeStackNavigationProp<AdminStackParamList> };

// Only these 3 statuses belong in Requests page
const ALLOWED_STATUSES: RentalStatus[] = ['pending', 'approved', 'rejected'];
type FilterType = 'all' | 'pending' | 'approved' | 'rejected';
const FILTERS: FilterType[] = ['all', 'pending', 'approved', 'rejected'];

const RentalRequests = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('rentals')
      .select('*, equipment(*), customer:profiles(full_name, email, phone)')
      .in('status', ALLOWED_STATUSES)
      .order('created_at', { ascending: false });
    if (data) setRentals(data as Rental[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const filtered = rentals.filter((r) => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      (r.equipment?.name ?? '').toLowerCase().includes(q) ||
      ((r as unknown as { customer: { full_name: string } }).customer?.full_name ?? '').toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  // Count per status for badges
  const counts: Record<string, number> = {};
  ALLOWED_STATUSES.forEach(s => { counts[s] = rentals.filter(r => r.status === s).length; });

  const updateStatus = async (rentalId: string, newStatus: RentalStatus) => {
    const { error } = await supabase
      .from('rentals')
      .update({ status: newStatus })
      .eq('id', rentalId);
    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Rental ${newStatus}`);
      load();
    }
  };

  const quickAction = (rental: Rental, newStatus: RentalStatus, label: string) => {
    Alert.alert(`${label} Rental`, `${label} rental for "${rental.equipment?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: label, onPress: () => updateStatus(rental.id, newStatus) },
    ]);
  };

  if (loading) return <LoadingSpinner message="Loading requests..." />;

  return (
    <SafeAreaView edges={['top']} style={[RentalRequestsStyle.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[RentalRequestsStyle.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={RentalRequestsStyle.headerRow}>
          <Text style={[RentalRequestsStyle.title, { color: colors.text }]}>Rental Requests</Text>
          {counts['pending'] > 0 && (
            <View style={[RentalRequestsStyle.badge, { backgroundColor: colors.danger }]}>
              <Text style={RentalRequestsStyle.badgeText}>{counts['pending']}</Text>
            </View>
          )}
        </View>
        <Text style={[RentalRequestsStyle.subtitle, { color: colors.textMuted }]}>
          {filtered.length} {filter === 'all' ? 'total' : filter}
        </Text>
      </View>

      {/* Search */}
      <View style={[RentalRequestsStyle.searchRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[RentalRequestsStyle.searchWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <MaterialIcons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[RentalRequestsStyle.searchInput, { color: colors.text }]}
            placeholder="Search by equipment or customer..."
            placeholderTextColor={colors.placeholder}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialIcons name="close" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter tabs — show counts for all statuses */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={RentalRequestsStyle.filterScroll}
        style={[RentalRequestsStyle.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      >
        {FILTERS.map((f) => {
          const count = f === 'all' ? rentals.length : (counts[f] ?? 0);
          const isActive = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[
                RentalRequestsStyle.filterChip,
                isActive
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.cardAlt, borderColor: colors.border },
              ]}
              onPress={() => setFilter(f)}
            >
              <Text style={[RentalRequestsStyle.filterText, { color: isActive ? '#FFF' : colors.textSecondary }]}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                {count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={RentalRequestsStyle.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const customer = (item as unknown as { customer: { full_name: string } }).customer;
          return (
            <TouchableOpacity
              style={[
                RentalRequestsStyle.card,
                {
                  backgroundColor: colors.card,
                  borderColor: item.status === 'pending' ? colors.warning : colors.border,
                  shadowColor: colors.shadow,
                },
              ]}
              onPress={() => navigation.navigate('RentalDetail', { rentalId: item.id })}
              activeOpacity={0.85}
            >
              <View style={RentalRequestsStyle.cardTop}>
                <View style={RentalRequestsStyle.cardInfo}>
                  <Text style={[RentalRequestsStyle.equipName, { color: colors.text }]} numberOfLines={1}>
                    {item.equipment?.name ?? 'Equipment'}
                  </Text>
                  <Text style={[RentalRequestsStyle.customerName, { color: colors.textMuted }]}>
                    {customer?.full_name ?? 'Customer'}
                  </Text>
                  <Text style={[RentalRequestsStyle.dates, { color: colors.textSecondary }]}>
                    {formatDate(item.start_date)} → {formatDate(item.end_date)}
                    {' · '}{getDaysDiff(item.start_date, item.end_date)}d
                  </Text>
                </View>
                <View style={RentalRequestsStyle.cardRight}>
                  <StatusBadge status={item.status} />
                  <Text style={[RentalRequestsStyle.cost, { color: colors.primary }]}>
                    {formatCurrency(item.total_cost)}
                  </Text>
                  <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
                </View>
              </View>

              {/* Quick actions for pending only */}
              {item.status === 'pending' && (
                <View style={[RentalRequestsStyle.quickActions, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={[RentalRequestsStyle.quickBtn, { backgroundColor: colors.successLight }]}
                    onPress={() => quickAction(item, 'approved', 'Approve')}
                  >
                    <MaterialIcons name="check" size={16} color={colors.success} />
                    <Text style={[RentalRequestsStyle.quickBtnText, { color: colors.success }]}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[RentalRequestsStyle.quickBtn, { backgroundColor: colors.dangerLight }]}
                    onPress={() => quickAction(item, 'rejected', 'Reject')}
                  >
                    <MaterialIcons name="close" size={16} color={colors.danger} />
                    <Text style={[RentalRequestsStyle.quickBtnText, { color: colors.danger }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[RentalRequestsStyle.quickBtn, { backgroundColor: colors.infoLight }]}
                    onPress={() => navigation.navigate('RentalDetail', { rentalId: item.id })}
                  >
                    <MaterialIcons name="open-in-new" size={16} color={colors.info} />
                    <Text style={[RentalRequestsStyle.quickBtnText, { color: colors.info }]}>Details</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="assignment"
            title="No requests found"
            subtitle={`No ${filter === 'all' ? '' : filter + ' '}rental requests.`}
          />
        }
      />
    </SafeAreaView>
  );
};

export default RentalRequests;
