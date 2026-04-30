import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../../src/lib/supabase';
import useAuth from '../../../../src/hooks/useAuth';
import useTheme from '../../../../src/hooks/useTheme';
import { useToast } from '../../../../src/hooks/useToast';
import { Rental, RentalStatus, CustomerStackParamList } from '../../../../src/types';
import { formatCurrency, formatDate, toDateString } from '../../../../src/utils/format';
import RentalCard from '../../../../src/components/RentalCard/RentalCard';
import StatusBadge from '../../../../src/components/StatusBadge/StatusBadge';
import EmptyState from '../../../../src/components/EmptyState/EmptyState';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';
import { SkeletonList } from '../../../../src/components/Skeleton/Skeleton';
import DatePicker from '../../../../src/components/DatePicker/DatePicker';
import MyRentalsStyle from './MyRentalsStyle';

const FILTERS: Array<RentalStatus | 'all'> = ['all', 'pending', 'approved', 'active', 'returned', 'rejected', 'cancelled'];

type Props = { navigation: NativeStackNavigationProp<CustomerStackParamList> };

const MyRentals = ({ navigation }: Props) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();

  const [rentals, setRentals] = useState<Rental[]>([]);
  const [filter, setFilter] = useState<RentalStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'cost_asc' | 'cost_desc'>('newest');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Rental | null>(null);

  // Extend rental state
  const [extendModalVisible, setExtendModalVisible] = useState(false);
  const [newEndDate, setNewEndDate] = useState('');
  const [extendLoading, setExtendLoading] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('rentals')
      .select('*, equipment(*)')
      .eq('customer_id', user?.id)
      .order('created_at', { ascending: false });
    if (data) setRentals(data as Rental[]);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const filtered = (() => {
    let result = rentals.filter((r) => {
      const matchesFilter = filter === 'all' || r.status === filter;
      const matchesSearch = !search.trim() ||
        (r.equipment?.name ?? '').toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
    if (sortBy === 'oldest') result = [...result].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (sortBy === 'cost_asc') result = [...result].sort((a, b) => a.total_cost - b.total_cost);
    if (sortBy === 'cost_desc') result = [...result].sort((a, b) => b.total_cost - a.total_cost);
    return result;
  })();

  const openExtend = (rental: Rental) => {
    const currentEnd = new Date(rental.end_date);
    currentEnd.setDate(currentEnd.getDate() + 1);
    setNewEndDate(toDateString(currentEnd));
    setExtendModalVisible(true);
  };

  const handleExtend = async () => {
    if (!selected || !newEndDate) return;
    const currentEnd = new Date(selected.end_date);
    const proposedEnd = new Date(newEndDate);
    if (proposedEnd <= currentEnd) {
      showError('New end date must be after current end date.');
      return;
    }
    setExtendLoading(true);
    try {
      const { error } = await supabase
        .from('rentals')
        .update({ end_date: newEndDate })
        .eq('id', selected.id)
        .eq('customer_id', user?.id);
      if (error) throw new Error(error.message);
      showSuccess('Rental extended successfully');
      setExtendModalVisible(false);
      setSelected(null);
      load();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to extend rental.');
    } finally {
      setExtendLoading(false);
    }
  };

  const handleCancel = async (rentalId: string) => {
    Alert.alert('Cancel Rental', 'Are you sure you want to cancel this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('rentals')
            .update({ status: 'cancelled' })
            .eq('id', rentalId)
            .eq('customer_id', user?.id);
          if (error) {
            showError(error.message);
          } else {
            showSuccess('Rental cancelled');
            setSelected(null);
            load();
          }
        },
      },
    ]);
  };

  const minExtendDate = () => {
    if (!selected) return '';
    const d = new Date(selected.end_date);
    d.setDate(d.getDate() + 1);
    return toDateString(d);
  };

  return (
    <SafeAreaView edges={['top']} style={[MyRentalsStyle.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[MyRentalsStyle.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[MyRentalsStyle.title, { color: colors.text }]}>My Rentals</Text>
        <Text style={[MyRentalsStyle.subtitle, { color: colors.textMuted }]}>
          {filtered.length} {filter === 'all' ? 'total' : filter} rental{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search */}
      <View style={[MyRentalsStyle.searchRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[MyRentalsStyle.searchWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <MaterialIcons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[MyRentalsStyle.searchInput, { color: colors.text }]}
            placeholder="Search equipment name..."
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

      {/* Sort */}
      <View style={[MyRentalsStyle.sortBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[MyRentalsStyle.sortLabel, { color: colors.textMuted }]}>Sort:</Text>
        {([
          { key: 'newest', label: 'Newest' },
          { key: 'oldest', label: 'Oldest' },
          { key: 'cost_asc', label: 'Cost ↑' },
          { key: 'cost_desc', label: 'Cost ↓' },
        ] as const).map(s => (
          <TouchableOpacity
            key={s.key}
            style={[MyRentalsStyle.sortChip,
              sortBy === s.key
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
            onPress={() => setSortBy(s.key)}
          >
            <Text style={[MyRentalsStyle.sortText, { color: sortBy === s.key ? '#FFF' : colors.textSecondary }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={MyRentalsStyle.filterScroll}
        style={[MyRentalsStyle.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              MyRentalsStyle.filterChip,
              filter === f
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.cardAlt, borderColor: colors.border },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[MyRentalsStyle.filterText, { color: filter === f ? '#FFF' : colors.textSecondary }]}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={{ padding: 16 }}>
          <SkeletonList count={4} type="rental" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={MyRentalsStyle.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <RentalCard item={item} onPress={() => setSelected(item)} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-long"
              title="No rentals found"
              subtitle={filter === 'all' ? "You haven't made any rental requests yet." : `No ${filter} rentals.`}
            />
          }
        />
      )}

      {/* Detail modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={[MyRentalsStyle.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[MyRentalsStyle.modalCard, { backgroundColor: colors.surface }]}>
            <View style={[MyRentalsStyle.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[MyRentalsStyle.modalTitle, { color: colors.text }]}>Rental Details</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selected && (
              <ScrollView contentContainerStyle={MyRentalsStyle.modalBody}>
                <Text style={[MyRentalsStyle.equipName, { color: colors.text }]}>
                  {selected.equipment?.name ?? 'Equipment'}
                </Text>
                <StatusBadge status={selected.status} />

                {[
                  { label: 'Rental ID', value: selected.id.substring(0, 8).toUpperCase() },
                  { label: 'Start Date', value: formatDate(selected.start_date) },
                  { label: 'End Date', value: formatDate(selected.end_date) },
                  { label: 'Quantity', value: `${selected.quantity} unit${selected.quantity > 1 ? 's' : ''}` },
                  { label: 'Billing Type', value: selected.duration_type },
                  { label: 'Total Cost', value: formatCurrency(selected.total_cost) },
                  { label: 'Submitted', value: formatDate(selected.created_at) },
                ].map((row) => (
                  <View key={row.label} style={[MyRentalsStyle.detailRow, { borderBottomColor: colors.border }]}>
                    <Text style={[MyRentalsStyle.detailLabel, { color: colors.textMuted }]}>{row.label}</Text>
                    <Text style={[MyRentalsStyle.detailValue, { color: colors.text }]}>{row.value}</Text>
                  </View>
                ))}

                {selected.notes ? (
                  <View style={[MyRentalsStyle.notesBox, { backgroundColor: colors.cardAlt }]}>
                    <Text style={[MyRentalsStyle.notesLabel, { color: colors.textMuted }]}>Your Notes</Text>
                    <Text style={[MyRentalsStyle.notesText, { color: colors.text }]}>{selected.notes}</Text>
                  </View>
                ) : null}



                {/* Actions */}
                {selected.status === 'pending' && (
                  <TouchableOpacity
                    style={[MyRentalsStyle.actionBtn, { backgroundColor: colors.dangerLight }]}
                    onPress={() => handleCancel(selected.id)}
                  >
                    <MaterialIcons name="cancel" size={18} color={colors.danger} />
                    <Text style={[MyRentalsStyle.actionBtnText, { color: colors.danger }]}>Cancel Request</Text>
                  </TouchableOpacity>
                )}

                {(selected.status === 'approved' || selected.status === 'active') && (
                  <TouchableOpacity
                    style={[MyRentalsStyle.actionBtn, { backgroundColor: colors.infoLight }]}
                    onPress={() => openExtend(selected)}
                  >
                    <MaterialIcons name="event" size={18} color={colors.info} />
                    <Text style={[MyRentalsStyle.actionBtnText, { color: colors.info }]}>Extend Rental</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Extend rental modal */}
      <Modal
        visible={extendModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setExtendModalVisible(false)}
      >
        <View style={[MyRentalsStyle.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[MyRentalsStyle.modalCard, { backgroundColor: colors.surface }]}>
            <View style={[MyRentalsStyle.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[MyRentalsStyle.modalTitle, { color: colors.text }]}>Extend Rental</Text>
              <TouchableOpacity onPress={() => setExtendModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={MyRentalsStyle.extendBody}>
              <Text style={[MyRentalsStyle.extendEquip, { color: colors.text }]}>
                {selected?.equipment?.name}
              </Text>
              <Text style={[MyRentalsStyle.extendCurrent, { color: colors.textMuted }]}>
                Current end date: {selected ? formatDate(selected.end_date) : ''}
              </Text>
              <DatePicker
                label="New End Date"
                value={newEndDate}
                onChange={setNewEndDate}
                minDate={minExtendDate()}
              />
              <TouchableOpacity
                style={[MyRentalsStyle.extendBtn, { backgroundColor: colors.info }]}
                onPress={handleExtend}
                disabled={extendLoading}
                activeOpacity={0.85}
              >
                {extendLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialIcons name="event" size={18} color="#FFF" />
                    <Text style={MyRentalsStyle.extendBtnText}>Confirm Extension</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default MyRentals;
