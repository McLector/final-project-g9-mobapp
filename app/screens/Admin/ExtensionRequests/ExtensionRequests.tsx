import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, ActivityIndicator, FlatList, RefreshControl,
  Text, TextInput, TouchableOpacity, View, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../../../src/lib/supabase';
import useTheme from '../../../../src/hooks/useTheme';
import { useToast } from '../../../../src/hooks/useToast';
import { AdminStackParamList } from '../../../../src/types';
import { formatDate } from '../../../../src/utils/format';
import { assertRangeAvailability } from '../../../../src/utils/availability';
import EmptyState from '../../../../src/components/EmptyState/EmptyState';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';

type Props = { navigation: NativeStackNavigationProp<AdminStackParamList> };

interface ExtRequest {
  id: string;
  rental_id: string;
  requested_end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  customer_note: string | null;
  admin_note: string | null;
  created_at: string;
  rental: {
    equipment_id: string;
    quantity: number;
    start_date: string;
    end_date: string;
    equipment: { name: string };
  };
  customer: { full_name: string; email: string };
}

const ExtensionRequests = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const [requests, setRequests] = useState<ExtRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<ExtRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('extension_requests')
      .select(`
        *,
        rental:rentals(equipment_id, quantity, start_date, end_date, equipment:equipment(name)),
        customer:profiles(full_name, email)
      `)
      .order('created_at', { ascending: false });
    if (data) setRequests(data as unknown as ExtRequest[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const handleAction = async (status: 'approved' | 'rejected', request = selected) => {
    if (!request) return;
    setActionLoading(true);
    try {
      if (status === 'approved') {
        await assertRangeAvailability(
          request.rental.equipment_id,
          request.rental.start_date,
          request.requested_end_date,
          request.rental.quantity,
          request.rental_id
        );
      }

      const { error: extError } = await supabase
        .from('extension_requests')
        .update({ status, admin_note: adminNote.trim() || null })
        .eq('id', request.id);
      if (extError) throw new Error(extError.message);

      // If approved, update the rental end_date
      if (status === 'approved') {
        const { error: rentalError } = await supabase
          .from('rentals')
          .update({ end_date: request.requested_end_date })
          .eq('id', request.rental_id);
        if (rentalError) throw new Error(rentalError.message);
      }

      showSuccess(status === 'approved' ? 'Extension approved and rental updated' : 'Extension rejected');
      setSelected(null);
      setAdminNote('');
      load();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading extension requests..." />;

  return (
    <SafeAreaView edges={['top']} style={[{ flex: 1, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt }}
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, flex: 1 }}>Extension Requests</Text>
          {pendingCount > 0 && (
            <View style={{ backgroundColor: colors.danger, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>{pendingCount}</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
          {filtered.length} {filter} request{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexDirection: 'row' }}
        style={{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}
      >
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, marginRight: 4 },
              filter === f ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
            onPress={() => setFilter(f)}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: filter === f ? '#FFF' : colors.textSecondary }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}{f === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[{ borderRadius: 14, borderWidth: 1.5, backgroundColor: colors.card, marginBottom: 10, overflow: 'hidden' },
              { borderColor: item.status === 'pending' ? colors.warning : colors.border }]}
            onPress={() => { setSelected(item); setAdminNote(item.admin_note ?? ''); }}
            activeOpacity={0.85}
          >
            <View style={{ padding: 14, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                    {item.rental?.equipment?.name ?? 'Equipment'}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>{item.customer?.full_name ?? 'Customer'}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Current end: {formatDate(item.rental?.end_date ?? '')}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                    Requested: {formatDate(item.requested_end_date)}
                  </Text>
                </View>
                <View style={[{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
                  { backgroundColor: item.status === 'pending' ? colors.warningLight : item.status === 'approved' ? colors.successLight : colors.dangerLight }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: item.status === 'pending' ? colors.warning : item.status === 'approved' ? colors.success : colors.danger }}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
            {item.status === 'pending' && (
              <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border }}>
                <TouchableOpacity
                  style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10 }, { backgroundColor: colors.successLight }]}
                  onPress={() => { setSelected(item); handleAction('approved', item); }}
                >
                  <MaterialIcons name="check" size={16} color={colors.success} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.success }}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10 }, { backgroundColor: colors.dangerLight }]}
                  onPress={() => { setSelected(item); handleAction('rejected', item); }}
                >
                  <MaterialIcons name="close" size={16} color={colors.danger} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.danger }}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState icon="event" title="No requests found" subtitle={`No ${filter} extension requests`} />}
      />

      {/* Detail modal */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>Extension Details</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {selected && (
              <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{selected.rental?.equipment?.name}</Text>
                {[
                  { label: 'Customer', value: selected.customer?.full_name },
                  { label: 'Email', value: selected.customer?.email },
                  { label: 'Current End', value: formatDate(selected.rental?.end_date ?? '') },
                  { label: 'Requested End', value: formatDate(selected.requested_end_date) },
                  { label: 'Submitted', value: formatDate(selected.created_at) },
                ].map(row => (
                  <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>{row.label}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>{row.value}</Text>
                  </View>
                ))}
                {selected.customer_note && (
                  <View style={{ backgroundColor: colors.cardAlt, borderRadius: 10, padding: 12 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase' }}>Customer Note</Text>
                    <Text style={{ fontSize: 14, color: colors.text }}>{selected.customer_note}</Text>
                  </View>
                )}
                {selected.status === 'pending' && (
                  <>
                    <View style={{ gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>Admin Note (optional)</Text>
                      <View style={{ borderWidth: 1.5, borderRadius: 12, padding: 12, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }}>
                        <TextInput
                          style={{ fontSize: 14, color: colors.text, minHeight: 60 }}
                          value={adminNote}
                          onChangeText={setAdminNote}
                          placeholder="Add note for customer..."
                          placeholderTextColor={colors.placeholder}
                          multiline
                          textAlignVertical="top"
                        />
                      </View>
                    </View>
                    <TouchableOpacity
                      style={{ backgroundColor: colors.success, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      onPress={() => handleAction('approved')} disabled={actionLoading}
                    >
                      {actionLoading ? <ActivityIndicator color="#FFF" /> : (
                        <><MaterialIcons name="check-circle" size={18} color="#FFF" /><Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Approve Extension</Text></>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ backgroundColor: colors.dangerLight, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.danger }}
                      onPress={() => handleAction('rejected')} disabled={actionLoading}
                    >
                      <MaterialIcons name="cancel" size={18} color={colors.danger} />
                      <Text style={{ color: colors.danger, fontSize: 15, fontWeight: '700' }}>Reject Extension</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ExtensionRequests;
