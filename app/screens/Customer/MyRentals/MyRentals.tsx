import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal,
  RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../../../src/lib/supabase';
import useAuth from '../../../../src/hooks/useAuth';
import useTheme from '../../../../src/hooks/useTheme';
import { useToast } from '../../../../src/hooks/useToast';
import { Rental, RentalStatus, CustomerStackParamList } from '../../../../src/types';
import { formatCurrency, formatDate } from '../../../../src/utils/format';
import StatusBadge from '../../../../src/components/StatusBadge/StatusBadge';
import EmptyState from '../../../../src/components/EmptyState/EmptyState';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';

type FilterType = RentalStatus | 'all';
type Nav = NativeStackNavigationProp<CustomerStackParamList>;

const FILTERS: FilterType[] = ['all', 'pending', 'approved', 'active', 'returned', 'rejected', 'cancelled'];

const FILTER_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  all: 'list',
  pending: 'pending',
  approved: 'thumb-up',
  active: 'play-circle-filled',
  returned: 'assignment-return',
  rejected: 'cancel',
  cancelled: 'block',
};

const STATUS_BAR: Record<string, string> = {
  pending: '#D97706', approved: '#0284C7', active: '#16A34A',
  returned: '#64748B', rejected: '#DC2626', cancelled: '#94A3B8',
};

const toDateString = (d: Date) => d.toISOString().split('T')[0];

const MyRentals = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const navigation = useNavigation<Nav>();

  const [rentals, setRentals] = useState<Rental[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Rental | null>(null);

  // Extension state
  const [extendVisible, setExtendVisible] = useState(false);
  const [extendDate, setExtendDate] = useState('');
  const [extendNote, setExtendNote] = useState('');
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

  const filtered = rentals.filter((r) => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const matchesSearch = !search.trim() ||
      (r.equipment?.name ?? '').toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleCancel = (rentalId: string) => {
    Alert.alert('Cancel Request', 'Cancel this rental request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('rentals').update({ status: 'cancelled' })
            .eq('id', rentalId).eq('customer_id', user?.id).eq('status', 'pending');
          if (error) showError(error.message);
          else { setSelected(null); load(); showSuccess('Rental cancelled'); }
        },
      },
    ]);
  };

  const openExtend = (rental: Rental) => {
    const nextDay = new Date(rental.end_date);
    nextDay.setDate(nextDay.getDate() + 1);
    setExtendDate(toDateString(nextDay));
    setExtendNote('');
    setExtendVisible(true);
  };

  const handleExtend = async () => {
    if (!selected || !extendDate) return;
    if (extendDate <= selected.end_date) {
      showError('New end date must be after the current end date.');
      return;
    }
    setExtendLoading(true);
    try {
      const { error } = await supabase.from('extension_requests').insert({
        rental_id: selected.id,
        customer_id: user?.id,
        requested_end_date: extendDate,
        customer_note: extendNote.trim() || null,
        status: 'pending',
      });
      if (error) throw new Error(error.message);
      showSuccess('Extension request submitted — awaiting admin approval');
      setExtendVisible(false);
      setSelected(null);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to submit extension request.');
    } finally {
      setExtendLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading rentals..." />;

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.title, { color: colors.text }]}>My Rentals</Text>
        <Text style={[s.subtitle, { color: colors.textMuted }]}>
          {filtered.length} rental{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[s.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <MaterialIcons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            placeholder="Search by equipment..."
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
          const count = f === 'all' ? rentals.length : rentals.filter((r) => r.status === f).length;
          const active = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[
                s.chip,
                active
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={() => setFilter(f)}
            >
              <MaterialIcons
                name={FILTER_ICONS[f]}
                size={12}
                color={active ? '#FFF' : colors.textMuted}
              />
              <Text style={[s.chipText, { color: active ? '#FFF' : colors.textSecondary }]}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                {count > 0 ? ` ${count}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Rental list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.card, { backgroundColor: colors.card, shadowColor: '#000' }]}
            onPress={() => setSelected(item)}
            activeOpacity={0.85}
          >
            <View style={[s.cardBar, { backgroundColor: STATUS_BAR[item.status] ?? colors.textMuted }]} />
            <View style={s.cardBody}>
              <View style={s.cardTop}>
                <View style={s.cardInfo}>
                  <Text style={[s.equipName, { color: colors.text }]} numberOfLines={1}>
                    {item.equipment?.name ?? 'Equipment'}
                  </Text>
                  <Text style={[s.cardDates, { color: colors.textMuted }]}>
                    {formatDate(item.start_date)} → {formatDate(item.end_date)}
                  </Text>
                  <Text style={[s.cardQty, { color: colors.textSecondary }]}>
                    {item.quantity} unit{item.quantity > 1 ? 's' : ''} · {item.duration_type}
                  </Text>
                </View>
                <View style={s.cardRight}>
                  <StatusBadge status={item.status} />
                  <Text style={[s.cardCost, { color: colors.primary }]}>{formatCurrency(item.total_cost)}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-long"
            title="No rentals found"
            subtitle={filter === 'all' ? "You haven't made any rental requests yet." : `No ${filter} rentals.`}
          />
        }
      />

      {/* Detail modal */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={[s.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />

            <View style={[s.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[s.sheetTitle, { color: colors.text }]}>Rental Details</Text>
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
                    { icon: 'event-available' as const, label: 'Start Date', value: formatDate(selected.start_date) },
                    { icon: 'event-busy' as const, label: 'End Date', value: formatDate(selected.end_date) },
                    { icon: 'inventory' as const, label: 'Quantity', value: `${selected.quantity} unit${selected.quantity > 1 ? 's' : ''}` },
                    { icon: 'schedule' as const, label: 'Billing', value: selected.duration_type },
                    { icon: 'payments' as const, label: 'Total Cost', value: formatCurrency(selected.total_cost) },
                    { icon: 'history' as const, label: 'Submitted', value: formatDate(selected.created_at) },
                  ].map((row, i, arr) => (
                    <View
                      key={row.label}
                      style={[s.infoRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                    >
                      <View style={s.infoLeft}>
                        <MaterialIcons name={row.icon} size={13} color={colors.textMuted} />
                        <Text style={[s.infoLabel, { color: colors.textMuted }]}>{row.label}</Text>
                      </View>
                      <Text style={[s.infoValue, { color: colors.text }]}>{row.value}</Text>
                    </View>
                  ))}
                </View>

                {/* Your notes */}
                {selected.notes ? (
                  <View style={[s.notesBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                    <Text style={[s.notesLabel, { color: colors.textMuted }]}>Your Notes</Text>
                    <Text style={[s.notesText, { color: colors.text }]}>{selected.notes}</Text>
                  </View>
                ) : null}

                {/* Admin notes */}
                {selected.admin_notes ? (
                  <View style={[s.notesBox, { backgroundColor: `${colors.info}10`, borderColor: `${colors.info}30` }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <MaterialIcons name="admin-panel-settings" size={13} color={colors.info} />
                      <Text style={[s.notesLabel, { color: colors.info }]}>Admin Notes</Text>
                    </View>
                    <Text style={[s.notesText, { color: colors.text }]}>{selected.admin_notes}</Text>
                  </View>
                ) : null}

                {/* Action buttons */}
                <View style={s.actionsCol}>
                  {/* Chat button — available for non-closed rentals */}
                  {!['rejected', 'cancelled'].includes(selected.status) && (
                    <TouchableOpacity
                      style={[s.actionOutline, { borderColor: colors.accent }]}
                      onPress={() => {
                        setSelected(null);
                        navigation.navigate('RentalChat', {
                          rentalId: selected.id,
                          rentalTitle: selected.equipment?.name ?? 'Rental',
                        });
                      }}
                    >
                      <MaterialIcons name="chat" size={16} color={colors.accent} />
                      <Text style={[s.actionOutlineText, { color: colors.accent }]}>Message Admin</Text>
                    </TouchableOpacity>
                  )}

                  {/* Extension request for approved/active */}
                  {['approved', 'active'].includes(selected.status) && (
                    <TouchableOpacity
                      style={[s.actionOutline, { borderColor: colors.info }]}
                      onPress={() => openExtend(selected)}
                    >
                      <MaterialIcons name="event" size={16} color={colors.info} />
                      <Text style={[s.actionOutlineText, { color: colors.info }]}>Request Extension</Text>
                    </TouchableOpacity>
                  )}

                  {/* Cancel for pending */}
                  {selected.status === 'pending' && (
                    <TouchableOpacity
                      style={[s.actionOutline, { borderColor: colors.danger }]}
                      onPress={() => handleCancel(selected.id)}
                    >
                      <MaterialIcons name="cancel" size={16} color={colors.danger} />
                      <Text style={[s.actionOutlineText, { color: colors.danger }]}>Cancel Request</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Extension modal */}
      <Modal visible={extendVisible} animationType="slide" transparent onRequestClose={() => setExtendVisible(false)}>
        <View style={[s.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />

            <View style={[s.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[s.sheetTitle, { color: colors.text }]}>Request Extension</Text>
              <TouchableOpacity
                style={[s.closeBtn, { backgroundColor: colors.cardAlt }]}
                onPress={() => setExtendVisible(false)}
              >
                <MaterialIcons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.sheetBody}>
              {selected && (
                <View style={[s.infoGrid, { borderColor: colors.border }]}>
                  <View style={[s.infoRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    <Text style={[s.infoLabel, { color: colors.textMuted }]}>Equipment</Text>
                    <Text style={[s.infoValue, { color: colors.text }]}>{selected.equipment?.name}</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={[s.infoLabel, { color: colors.textMuted }]}>Current End Date</Text>
                    <Text style={[s.infoValue, { color: colors.text }]}>{formatDate(selected.end_date)}</Text>
                  </View>
                </View>
              )}

              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>New End Date</Text>
                <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                  <MaterialIcons name="event" size={16} color={colors.textMuted} />
                  <TextInput
                    style={[s.inputField, { color: colors.text }]}
                    value={extendDate}
                    onChangeText={setExtendDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
              </View>

              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Note (optional)</Text>
                <View style={[s.textAreaWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                  <TextInput
                    style={[s.textArea, { color: colors.text }]}
                    value={extendNote}
                    onChangeText={setExtendNote}
                    placeholder="Reason for extension..."
                    placeholderTextColor={colors.placeholder}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.info }]}
                onPress={handleExtend}
                disabled={extendLoading}
              >
                {extendLoading
                  ? <ActivityIndicator color="#FFF" />
                  : (
                    <>
                      <MaterialIcons name="event" size={18} color="#FFF" />
                      <Text style={s.actionBtnText}>Submit Extension Request</Text>
                    </>
                  )}
              </TouchableOpacity>

              <Text style={[s.extendNote, { color: colors.textMuted }]}>
                Extension requests require admin approval. Your rental dates won't change until approved.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '500' },
  filterWrap: { borderBottomWidth: 1 },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 7, flexDirection: 'row' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipText: { fontSize: 11, fontWeight: '700' },
  list: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardBar: { width: 4 },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', padding: 14, gap: 10 },
  cardInfo: { flex: 1, gap: 3 },
  equipName: { fontSize: 14, fontWeight: '700' },
  cardDates: { fontSize: 12 },
  cardQty: { fontSize: 12 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  cardCost: { fontSize: 14, fontWeight: '800' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
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
  infoValue: { fontSize: 13, fontWeight: '700', maxWidth: '55%', textAlign: 'right' },
  notesBox: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 6 },
  notesLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  notesText: { fontSize: 14, lineHeight: 20 },
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
  actionOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1.5,
  },
  actionOutlineText: { fontSize: 14, fontWeight: '700' },
  fieldGroup: { gap: 7 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1.5,
    gap: 8,
  },
  inputField: { flex: 1, fontSize: 14, fontWeight: '500' },
  textAreaWrap: { borderRadius: 12, borderWidth: 1.5, padding: 12, minHeight: 80 },
  textArea: { fontSize: 14, lineHeight: 20 },
  extendNote: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});

export default MyRentals;
