import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal,
  RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
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

type FilterType = RentalStatus | 'all';
type Props = { navigation: NativeStackNavigationProp<AdminStackParamList> };

const FILTERS: FilterType[] = ['all', 'pending', 'approved', 'active', 'returned', 'rejected', 'cancelled'];

const STATUS_BAR_COLOR: Record<string, string> = {
  pending: '#D97706', approved: '#0284C7', active: '#16A34A',
  returned: '#64748B', rejected: '#DC2626', cancelled: '#94A3B8',
};

const RentalRequests = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Rental | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('rentals')
      .select('*, equipment(*), customer:profiles(full_name, email, phone)')
      .order('created_at', { ascending: false });
    if (data) setRentals(data as Rental[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const pendingCount = rentals.filter((r) => r.status === 'pending').length;

  const filtered = rentals.filter((r) => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      (r.equipment?.name ?? '').toLowerCase().includes(q) ||
      ((r as unknown as { customer: { full_name: string } }).customer?.full_name ?? '').toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const updateStatus = async (rentalId: string, newStatus: RentalStatus) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('process_rental_status', {
        p_rental_id: rentalId,
        p_new_status: newStatus,
        p_admin_notes: adminNotes.trim() || null,
      });
      if (error) throw new Error(error.message);
      showSuccess(`Rental ${newStatus} successfully`);
      setSelected(null);
      setAdminNotes('');
      load();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const quickAction = (rental: Rental, newStatus: RentalStatus, label: string) => {
    Alert.alert(
      `${label} Rental`,
      `${label} rental for "${rental.equipment?.name ?? 'Equipment'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: label, style: newStatus === 'rejected' ? 'destructive' : 'default', onPress: () => updateStatus(rental.id, newStatus) },
      ],
    );
  };

  const openRental = (rental: Rental) => {
    setSelected(rental);
    setAdminNotes(rental.admin_notes ?? '');
  };

  const deleteRental = (rental: Rental) => {
    Alert.alert('Delete Rental', 'Delete this closed rental record permanently?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('rentals').delete().eq('id', rental.id).in('status', ['returned', 'rejected', 'cancelled']);
          if (error) showError(error.message);
          else { setSelected(null); load(); }
        },
      },
    ]);
  };

  if (loading) return <LoadingSpinner message="Loading requests..." />;

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={s.headerRow}>
          <View>
            <Text style={[s.title, { color: colors.text }]}>Rental Requests</Text>
            <Text style={[s.subtitle, { color: colors.textMuted }]}>
              {filtered.length} {filter} rental{filtered.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {pendingCount > 0 && (
            <View style={[s.pendingBadge, { backgroundColor: colors.danger }]}>
              <Text style={s.pendingBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>

        {/* Search */}
        <View style={[s.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <MaterialIcons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            placeholder="Search equipment or customer..."
            placeholderTextColor={colors.placeholder}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialIcons name="close" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterScroll}
        style={[s.filterWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      >
        {FILTERS.map((f) => {
          const count = f !== 'all' ? rentals.filter((r) => r.status === f).length : rentals.length;
          const active = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[s.chip, active ? { backgroundColor: colors.primary } : { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.chipText, { color: active ? '#FFF' : colors.textSecondary }]}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                {count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const customer = (item as unknown as { customer: { full_name: string; email: string } }).customer;
          const isOverdue = item.status === 'active' && new Date(item.end_date) < new Date();
          return (
            <TouchableOpacity
              style={[s.card, { backgroundColor: colors.card, shadowColor: '#000' }]}
              onPress={() => openRental(item)}
              activeOpacity={0.85}
            >
              <View style={[s.cardStatusBar, { backgroundColor: STATUS_BAR_COLOR[item.status] ?? colors.textMuted }]} />
              <View style={s.cardBody}>
                <View style={s.cardTop}>
                  <View style={s.cardInfo}>
                    <Text style={[s.equipName, { color: colors.text }]} numberOfLines={1}>
                      {item.equipment?.name ?? 'Equipment'}
                    </Text>
                    <Text style={[s.customerName, { color: colors.textMuted }]}>
                      {customer?.full_name ?? 'Customer'}
                    </Text>
                    <Text style={[s.dates, { color: colors.textSecondary }]}>
                      {formatDate(item.start_date)} → {formatDate(item.end_date)} · {getDaysDiff(item.start_date, item.end_date)}d
                    </Text>
                    {isOverdue && (
                      <View style={[s.overduePill, { backgroundColor: `${colors.danger}18` }]}>
                        <MaterialIcons name="warning" size={11} color={colors.danger} />
                        <Text style={[s.overdueText, { color: colors.danger }]}>OVERDUE</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.cardRight}>
                    <StatusBadge status={item.status} />
                    <Text style={[s.cost, { color: colors.primary }]}>{formatCurrency(item.total_cost)}</Text>
                  </View>
                </View>

                {/* Quick approve/reject for pending */}
                {item.status === 'pending' && (
                  <View style={[s.quickActions, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      style={[s.quickBtn, { backgroundColor: `${colors.success}15`, borderColor: colors.success }]}
                      onPress={() => quickAction(item, 'approved', 'Approve')}
                    >
                      <MaterialIcons name="check" size={14} color={colors.success} />
                      <Text style={[s.quickBtnText, { color: colors.success }]}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.quickBtn, { backgroundColor: `${colors.danger}15`, borderColor: colors.danger }]}
                      onPress={() => quickAction(item, 'rejected', 'Reject')}
                    >
                      <MaterialIcons name="close" size={14} color={colors.danger} />
                      <Text style={[s.quickBtnText, { color: colors.danger }]}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="assignment"
            title="No requests found"
            subtitle={`No ${filter} rental requests.`}
          />
        }
      />

      {/* Detail modal */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={[s.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            {/* Handle */}
            <View style={[s.handle, { backgroundColor: colors.border }]} />

            {/* Sheet header */}
            <View style={[s.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[s.sheetTitle, { color: colors.text }]}>Rental Detail</Text>
              <TouchableOpacity
                style={[s.closeBtn, { backgroundColor: colors.cardAlt }]}
                onPress={() => setSelected(null)}
              >
                <MaterialIcons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selected && (
              <ScrollView contentContainerStyle={s.sheetBody} showsVerticalScrollIndicator={false}>
                <Text style={[s.sheetEquip, { color: colors.text }]} numberOfLines={2}>
                  {selected.equipment?.name ?? 'Equipment'}
                </Text>
                <View style={s.statusRow}>
                  <StatusBadge status={selected.status} />
                  <Text style={[s.rentalId, { color: colors.textMuted }]}>
                    #{selected.id.slice(0, 8).toUpperCase()}
                  </Text>
                </View>

                {/* Info grid */}
                <View style={[s.infoGrid, { borderColor: colors.border }]}>
                  {[
                    { icon: 'person' as const, label: 'Customer', value: (selected as unknown as { customer: { full_name: string } }).customer?.full_name },
                    { icon: 'email' as const, label: 'Email', value: (selected as unknown as { customer: { email: string } }).customer?.email },
                    { icon: 'phone' as const, label: 'Phone', value: (selected as unknown as { customer: { phone: string } }).customer?.phone },
                    { icon: 'event' as const, label: 'Start Date', value: formatDate(selected.start_date) },
                    { icon: 'event-busy' as const, label: 'End Date', value: formatDate(selected.end_date) },
                    { icon: 'schedule' as const, label: 'Duration', value: `${getDaysDiff(selected.start_date, selected.end_date)} days (${selected.duration_type})` },
                    { icon: 'inventory' as const, label: 'Quantity', value: `${selected.quantity} unit(s)` },
                    { icon: 'payments' as const, label: 'Total Cost', value: formatCurrency(selected.total_cost) },
                    { icon: 'history' as const, label: 'Submitted', value: formatDate(selected.created_at) },
                  ].filter((r) => r.value).map((row, i, arr) => (
                    <View
                      key={row.label}
                      style={[s.infoRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                    >
                      <View style={s.infoLeft}>
                        <MaterialIcons name={row.icon} size={13} color={colors.textMuted} />
                        <Text style={[s.infoLabel, { color: colors.textMuted }]}>{row.label}</Text>
                      </View>
                      <Text style={[s.infoValue, { color: colors.text }]} numberOfLines={1}>{row.value}</Text>
                    </View>
                  ))}
                </View>

                {/* Customer notes */}
                {selected.notes ? (
                  <View style={[s.notesBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                    <Text style={[s.notesLabel, { color: colors.textMuted }]}>Customer Notes</Text>
                    <Text style={[s.notesText, { color: colors.text }]}>{selected.notes}</Text>
                  </View>
                ) : null}

                {/* Admin notes input */}
                <View style={s.fieldGroup}>
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Admin Notes</Text>
                  <View style={[s.textAreaWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <TextInput
                      style={[s.textArea, { color: colors.text }]}
                      value={adminNotes}
                      onChangeText={setAdminNotes}
                      placeholder="Add notes for the customer..."
                      placeholderTextColor={colors.placeholder}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                {/* Chat button */}
                <TouchableOpacity
                  style={[s.chatBtn, { backgroundColor: `${colors.accent}15`, borderColor: colors.accent }]}
                  onPress={() => {
                    setSelected(null);
                    navigation.navigate('RentalChat', {
                      rentalId: selected.id,
                      rentalTitle: selected.equipment?.name ?? 'Rental',
                    });
                  }}
                >
                  <MaterialIcons name="chat" size={16} color={colors.accent} />
                  <Text style={[s.chatBtnText, { color: colors.accent }]}>Open Chat</Text>
                </TouchableOpacity>

                {/* Status action buttons */}
                <View style={s.actionsCol}>
                  {selected.status === 'pending' && (
                    <>
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: colors.success }]}
                        onPress={() => updateStatus(selected.id, 'approved')}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <ActivityIndicator color="#FFF" /> : (
                          <>
                            <MaterialIcons name="check-circle" size={18} color="#FFF" />
                            <Text style={s.actionBtnText}>Approve Request</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: colors.danger }]}
                        onPress={() => updateStatus(selected.id, 'rejected')}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <ActivityIndicator color="#FFF" /> : (
                          <>
                            <MaterialIcons name="cancel" size={18} color="#FFF" />
                            <Text style={s.actionBtnText}>Reject Request</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                  {selected.status === 'approved' && (
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: colors.accent }]}
                      onPress={() => updateStatus(selected.id, 'active')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <ActivityIndicator color="#FFF" /> : (
                        <>
                          <MaterialIcons name="play-circle-filled" size={18} color="#FFF" />
                          <Text style={s.actionBtnText}>Mark as Active</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  {selected.status === 'active' && (
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: colors.success }]}
                      onPress={() => updateStatus(selected.id, 'returned')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <ActivityIndicator color="#FFF" /> : (
                        <>
                          <MaterialIcons name="assignment-return" size={18} color="#FFF" />
                          <Text style={s.actionBtnText}>Mark as Returned</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  {['returned', 'rejected', 'cancelled'].includes(selected.status) && (
                    <TouchableOpacity
                      style={[s.actionBtnOutline, { borderColor: colors.danger }]}
                      onPress={() => deleteRental(selected)}
                    >
                      <MaterialIcons name="delete" size={16} color={colors.danger} />
                      <Text style={[s.actionBtnOutlineText, { color: colors.danger }]}>Delete Record</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  pendingBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginTop: 4,
  },
  pendingBadgeText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1.5,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '500' },
  filterWrap: { borderBottomWidth: 1 },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  list: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  card: {
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardStatusBar: { width: 4 },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', padding: 14, gap: 10 },
  cardInfo: { flex: 1, gap: 3 },
  equipName: { fontSize: 14, fontWeight: '700' },
  customerName: { fontSize: 12 },
  dates: { fontSize: 12 },
  overduePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  overdueText: { fontSize: 10, fontWeight: '700' },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  cost: { fontSize: 14, fontWeight: '800' },
  quickActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    padding: 10,
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  quickBtnText: { fontSize: 12, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: { paddingHorizontal: 22, paddingBottom: 40, gap: 14 },
  sheetEquip: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginTop: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rentalId: { fontSize: 12, fontWeight: '600' },
  infoGrid: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  notesBox: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 6 },
  notesLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  notesText: { fontSize: 14, lineHeight: 20 },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  textAreaWrap: { borderRadius: 14, borderWidth: 1.5, padding: 12, minHeight: 80 },
  textArea: { fontSize: 14, lineHeight: 20 },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  chatBtnText: { fontSize: 14, fontWeight: '700' },
  actionsCol: { gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1.5,
  },
  actionBtnOutlineText: { fontSize: 14, fontWeight: '700' },
});

export default RentalRequests;
