import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, ScrollView,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../../../../src/lib/supabase';
import useTheme from '../../../../src/hooks/useTheme';
import { DeviceEventEmitter } from 'react-native';
import { useToast } from '../../../../src/hooks/useToast';
import { NOTIFICATIONS_CHANGED } from '../../../../src/components/NotificationBell/NotificationBell';
import { Rental, RentalStatus, AdminStackParamList } from '../../../../src/types';
import { formatCurrency, formatDate, getDaysDiff, toDateString } from '../../../../src/utils/format';
import { assertRangeAvailability } from '../../../../src/utils/availability';
import StatusBadge from '../../../../src/components/StatusBadge/StatusBadge';
import DatePicker from '../../../../src/components/DatePicker/DatePicker';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';
import RentalDetailStyle from './RentalDetailStyle';

type Props = {
  navigation: NativeStackNavigationProp<AdminStackParamList, 'RentalDetail'>;
  route: RouteProp<AdminStackParamList, 'RentalDetail'>;
};

type ReturnCondition = 'Excellent' | 'Good' | 'Fair' | 'Damaged' | 'Lost';
const RETURN_CONDITIONS: ReturnCondition[] = ['Excellent', 'Good', 'Fair', 'Damaged', 'Lost'];
const CONDITION_CONFIG: Record<ReturnCondition, { color: string; icon: keyof typeof MaterialIcons.glyphMap; description: string }> = {
  Excellent: { color: '#16A34A', icon: 'star', description: 'No wear, returned as received' },
  Good: { color: '#0284C7', icon: 'thumb-up', description: 'Minor wear, fully functional' },
  Fair: { color: '#D97706', icon: 'warning', description: 'Noticeable wear but functional' },
  Damaged: { color: '#DC2626', icon: 'build', description: 'Requires repair before next rental' },
  Lost: { color: '#7C3AED', icon: 'help', description: 'Equipment not returned' },
};

const RentalDetail = ({ navigation, route }: Props) => {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const { rentalId } = route.params;

  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  // Return modal
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [returnCondition, setReturnCondition] = useState<ReturnCondition>('Good');
  const [returnNotes, setReturnNotes] = useState('');

  // Date adjustment modal
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [adjustedStartDate, setAdjustedStartDate] = useState('');
  const [adjustedEndDate, setAdjustedEndDate] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('rentals')
      .select('*, equipment(*), customer:profiles(id, full_name, email, phone)')
      .eq('id', rentalId)
      .single();
    if (error) { showError('Failed to load rental'); navigation.goBack(); return; }
    if (data) {
      const r = data as Rental;
      setRental(r);
      setAdminNotes(r.admin_notes ?? '');
      setAdjustedStartDate(r.start_date);
      setAdjustedEndDate(r.end_date);
    }
    setLoading(false);
  }, [rentalId]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (newStatus: RentalStatus, extra: Record<string, any> = {}) => {
    if (!rental) return;
    setActionLoading(true);
    try {
      if (newStatus === 'approved' || newStatus === 'active') {
        await assertRangeAvailability(
          rental.equipment_id,
          rental.start_date,
          rental.end_date,
          rental.quantity,
          rental.id
        );
      }

      const dbStatus = newStatus === 'rejected' ? 'cancelled' : newStatus;
      const cleanNotes = adminNotes.trim();
      const dbNotes = newStatus === 'rejected'
        ? ['Rejected by admin.', cleanNotes].filter(Boolean).join(' ')
        : cleanNotes || null;

      const { error } = await supabase
        .from('rentals')
        .update({ status: dbStatus, admin_notes: dbNotes, ...extra })
        .eq('id', rental.id);
      if (error) throw new Error(error.message);
      showSuccess({ approved: 'Rental approved', rejected: 'Rental rejected', active: 'Marked as active', returned: 'Equipment returned', cancelled: 'Rental cancelled', pending: 'Updated' }[newStatus] ?? 'Updated');
      DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED);
      load();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Action failed');
    } finally { setActionLoading(false); }
  };

  const handleReturn = async () => {
    await updateStatus('returned', { return_condition: returnCondition, admin_notes: returnNotes.trim() || adminNotes.trim() || null });
    setReturnModalVisible(false);
  };

  const handleDateAdjustment = async () => {
    if (!rental) return;
    if (new Date(adjustedEndDate) <= new Date(adjustedStartDate)) {
      showError('End date must be after start date'); return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('rentals')
        .update({ start_date: adjustedStartDate, end_date: adjustedEndDate })
        .eq('id', rental.id);
      if (error) throw new Error(error.message);
      showSuccess('Dates updated successfully');
      setDateModalVisible(false);
      load();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to update dates');
    } finally { setActionLoading(false); }
  };

  const saveNotes = async () => {
    if (!rental) return;
    setActionLoading(true);
    try {
      await supabase.from('rentals').update({ admin_notes: adminNotes.trim() || null }).eq('id', rental.id);
      showSuccess('Notes saved');
    } catch { showError('Failed to save notes'); }
    finally { setActionLoading(false); }
  };

  const confirmAction = (status: RentalStatus, label: string) => {
    Alert.alert(`${label}?`, `This will change the rental status to "${status}".`, [
      { text: 'Cancel', style: 'cancel' },
      { text: label, onPress: () => updateStatus(status) },
    ]);
  };

  if (loading || !rental) return <LoadingSpinner message="Loading rental..." />;

  const customer = (rental as unknown as { customer: { id: string; full_name: string; email: string; phone: string } }).customer;
  const days = getDaysDiff(rental.start_date, rental.end_date);
  const statusFlow: Record<string, { next: RentalStatus; label: string; color: string; icon: keyof typeof MaterialIcons.glyphMap }[]> = {
    pending: [
      { next: 'approved', label: 'Approve', color: colors.success, icon: 'check-circle' },
      { next: 'rejected', label: 'Reject', color: colors.danger, icon: 'cancel' },
    ],
    approved: [
      { next: 'active', label: 'Mark Active', color: colors.accent, icon: 'play-circle-filled' },
      { next: 'rejected', label: 'Cancel', color: colors.danger, icon: 'cancel' },
    ],
    active: [],
  };
  const actions = statusFlow[rental.status] ?? [];
  const canAdjustDates = ['approved', 'active', 'pending'].includes(rental.status);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[RentalDetailStyle.safe, { backgroundColor: colors.background }]}>
      {/* Header with chat button */}
      <View style={[RentalDetailStyle.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={RentalDetailStyle.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={RentalDetailStyle.headerCenter}>
          <Text style={[RentalDetailStyle.headerTitle, { color: colors.text }]}>Rental Detail</Text>
          <Text style={[RentalDetailStyle.headerSub, { color: colors.textMuted }]}>
            #{rental.id.substring(0, 8).toUpperCase()}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <StatusBadge status={rental.status} />
          <TouchableOpacity
            style={[{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: colors.primaryLight }]}
            onPress={() => navigation.navigate('RentalChat', {
              rentalId: rental.id,
              rentalTitle: rental.equipment?.name ?? 'Equipment',
            })}
          >
            <MaterialIcons name="chat" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={RentalDetailStyle.scroll}>
        {/* Equipment banner */}
        <LinearGradient colors={['#0F172A', '#1E3A5F']} style={RentalDetailStyle.equipBanner}>
          <View style={[RentalDetailStyle.equipIcon, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="construction" size={24} color="#FFF" />
          </View>
          <View style={RentalDetailStyle.equipInfo}>
            <Text style={RentalDetailStyle.equipName}>{rental.equipment?.name ?? 'Equipment'}</Text>
            <Text style={RentalDetailStyle.equipCategory}>{rental.equipment?.category}</Text>
          </View>
          <Text style={RentalDetailStyle.equipCost}>{formatCurrency(rental.total_cost)}</Text>
        </LinearGradient>

        {/* Customer info - prominent */}
        <View style={[RentalDetailStyle.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingBottom: 8 }}>
            <View style={[{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: colors.accent }]}>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>
                {(customer?.full_name ?? 'U').substring(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[RentalDetailStyle.cardTitle, { color: colors.text, padding: 0, paddingBottom: 0 }]}>
                {customer?.full_name ?? 'Unknown Customer'}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{customer?.email}</Text>
            </View>
            {customer?.id && (
              <TouchableOpacity
                style={[{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }, { backgroundColor: colors.cardAlt }]}
                onPress={() => navigation.navigate('UserDetail', { userId: customer.id })}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>View Profile</Text>
              </TouchableOpacity>
            )}
          </View>
          {[
            { label: 'Phone', value: customer?.phone },
          ].map(row => row.value ? (
            <View key={row.label} style={[RentalDetailStyle.row, { borderBottomColor: colors.border }]}>
              <Text style={[RentalDetailStyle.rowLabel, { color: colors.textMuted }]}>{row.label}</Text>
              <Text style={[RentalDetailStyle.rowValue, { color: colors.text }]}>{row.value}</Text>
            </View>
          ) : null)}
        </View>

        {/* Rental period */}
        <View style={[RentalDetailStyle.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="event" size={16} color={colors.primary} />
              <Text style={[RentalDetailStyle.cardTitle, { color: colors.text, padding: 0 }]}>Rental Period</Text>
            </View>
            {canAdjustDates && (
              <TouchableOpacity
                style={[{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }, { backgroundColor: colors.infoLight }]}
                onPress={() => setDateModalVisible(true)}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.info }}>Adjust Dates</Text>
              </TouchableOpacity>
            )}
          </View>
          {[
            { label: 'Start Date', value: formatDate(rental.start_date) },
            { label: 'End Date', value: formatDate(rental.end_date) },
            { label: 'Duration', value: `${days} day${days !== 1 ? 's' : ''} (${rental.duration_type})` },
            { label: 'Quantity', value: `${rental.quantity} unit${rental.quantity !== 1 ? 's' : ''}` },
            { label: 'Total Cost', value: formatCurrency(rental.total_cost) },
            { label: 'Submitted', value: formatDate(rental.created_at) },
          ].map(row => (
            <View key={row.label} style={[RentalDetailStyle.row, { borderBottomColor: colors.border }]}>
              <Text style={[RentalDetailStyle.rowLabel, { color: colors.textMuted }]}>{row.label}</Text>
              <Text style={[RentalDetailStyle.rowValue, { color: row.label === 'Total Cost' ? colors.primary : colors.text, fontWeight: row.label === 'Total Cost' ? '700' : '500' }]}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Customer notes */}
        {rental.notes ? (
          <View style={[RentalDetailStyle.notesBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
            <Text style={[RentalDetailStyle.notesLabel, { color: colors.textMuted }]}>Customer Notes</Text>
            <Text style={[RentalDetailStyle.notesText, { color: colors.text }]}>{rental.notes}</Text>
          </View>
        ) : null}

        {/* Return condition */}
        {rental.status === 'returned' && rental.return_condition ? (
          <View style={[RentalDetailStyle.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={RentalDetailStyle.cardHeader}>
              <MaterialIcons name="assignment-return" size={16} color={colors.success} />
              <Text style={[RentalDetailStyle.cardTitle, { color: colors.text }]}>Return Report</Text>
            </View>
            <View style={[RentalDetailStyle.conditionPill, { backgroundColor: `${CONDITION_CONFIG[rental.return_condition as ReturnCondition]?.color ?? colors.success}20`, borderColor: CONDITION_CONFIG[rental.return_condition as ReturnCondition]?.color ?? colors.success }]}>
              <MaterialIcons name={CONDITION_CONFIG[rental.return_condition as ReturnCondition]?.icon ?? 'check'} size={16} color={CONDITION_CONFIG[rental.return_condition as ReturnCondition]?.color ?? colors.success} />
              <Text style={[RentalDetailStyle.conditionText, { color: CONDITION_CONFIG[rental.return_condition as ReturnCondition]?.color ?? colors.success }]}>
                {rental.return_condition}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Admin notes */}
        <View style={[RentalDetailStyle.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={RentalDetailStyle.cardHeader}>
            <MaterialIcons name="edit-note" size={16} color={colors.primary} />
            <Text style={[RentalDetailStyle.cardTitle, { color: colors.text }]}>Internal Notes</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted, marginLeft: 4 }}>(not visible to customer)</Text>
          </View>
          <View style={[RentalDetailStyle.notesInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <TextInput
              style={[RentalDetailStyle.notesInputText, { color: colors.text }]}
              value={adminNotes}
              onChangeText={setAdminNotes}
              placeholder="Add internal notes..."
              placeholderTextColor={colors.placeholder}
              multiline numberOfLines={3} textAlignVertical="top"
            />
          </View>
          <TouchableOpacity
            style={[RentalDetailStyle.saveNotesBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
            onPress={saveNotes} disabled={actionLoading}
          >
            {actionLoading ? <ActivityIndicator size="small" color={colors.primary} /> : (
              <><MaterialIcons name="save" size={15} color={colors.primary} />
              <Text style={[RentalDetailStyle.saveNotesBtnText, { color: colors.primary }]}>Save Notes</Text></>
            )}
          </TouchableOpacity>
        </View>

        {/* Status actions */}
        {actions.length > 0 && (
          <View style={RentalDetailStyle.actionsSection}>
            <Text style={[RentalDetailStyle.actionsTitle, { color: colors.textMuted }]}>ACTIONS</Text>
            <View style={RentalDetailStyle.actionsCol}>
              {actions.map(action => (
                <TouchableOpacity
                  key={action.next}
                  style={[RentalDetailStyle.actionBtn, { backgroundColor: action.color }]}
                  onPress={() => confirmAction(action.next, action.label)}
                  disabled={actionLoading}
                  activeOpacity={0.85}
                >
                  {actionLoading ? <ActivityIndicator color="#FFF" /> : (
                    <><MaterialIcons name={action.icon} size={20} color="#FFF" />
                    <Text style={RentalDetailStyle.actionBtnText}>{action.label}</Text></>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Return flow */}
        {rental.status === 'active' && (
          <View style={RentalDetailStyle.actionsSection}>
            <Text style={[RentalDetailStyle.actionsTitle, { color: colors.textMuted }]}>EQUIPMENT RETURN</Text>
            <TouchableOpacity
              style={[RentalDetailStyle.actionBtn, { backgroundColor: colors.success }]}
              onPress={() => setReturnModalVisible(true)}
              disabled={actionLoading} activeOpacity={0.85}
            >
              <MaterialIcons name="assignment-return" size={20} color="#FFF" />
              <Text style={RentalDetailStyle.actionBtnText}>Process Return</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Date Adjustment Modal */}
      <Modal visible={dateModalVisible} animationType="slide" transparent onRequestClose={() => setDateModalVisible(false)}>
        <View style={[RentalDetailStyle.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[RentalDetailStyle.modalCard, { backgroundColor: colors.surface }]}>
            <View style={[RentalDetailStyle.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[RentalDetailStyle.modalTitle, { color: colors.text }]}>Adjust Rental Dates</Text>
              <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={RentalDetailStyle.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[{ fontSize: 13, color: colors.textMuted, marginBottom: 4 }]}>
                Admin date adjustment bypasses normal approval flow.
              </Text>
              <DatePicker
                label="Start Date"
                value={adjustedStartDate}
                onChange={setAdjustedStartDate}
              />
              <DatePicker
                label="End Date"
                value={adjustedEndDate}
                onChange={setAdjustedEndDate}
                minDate={(() => { const d = new Date(adjustedStartDate); d.setDate(d.getDate() + 1); return toDateString(d); })()}
              />
              <TouchableOpacity
                style={[RentalDetailStyle.confirmReturnBtn, { backgroundColor: colors.info }]}
                onPress={handleDateAdjustment}
                disabled={actionLoading} activeOpacity={0.85}
              >
                {actionLoading ? <ActivityIndicator color="#FFF" /> : (
                  <><MaterialIcons name="event" size={20} color="#FFF" />
                  <Text style={RentalDetailStyle.confirmReturnText}>Save Date Changes</Text></>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Return condition modal */}
      <Modal visible={returnModalVisible} animationType="slide" transparent onRequestClose={() => setReturnModalVisible(false)}>
        <View style={[RentalDetailStyle.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[RentalDetailStyle.modalCard, { backgroundColor: colors.surface }]}>
            <View style={[RentalDetailStyle.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[RentalDetailStyle.modalTitle, { color: colors.text }]}>Return Report</Text>
              <TouchableOpacity onPress={() => setReturnModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={RentalDetailStyle.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[RentalDetailStyle.modalEquip, { color: colors.text }]}>{rental.equipment?.name}</Text>
              <Text style={[RentalDetailStyle.modalSub, { color: colors.textMuted }]}>Select condition of returned equipment</Text>
              <View style={RentalDetailStyle.conditionGrid}>
                {RETURN_CONDITIONS.map(cond => {
                  const cfg = CONDITION_CONFIG[cond];
                  const selected = returnCondition === cond;
                  return (
                    <TouchableOpacity
                      key={cond}
                      style={[RentalDetailStyle.conditionCard, { backgroundColor: selected ? `${cfg.color}15` : colors.cardAlt, borderColor: selected ? cfg.color : colors.border, borderWidth: selected ? 2 : 1 }]}
                      onPress={() => setReturnCondition(cond)} activeOpacity={0.8}
                    >
                      <View style={[RentalDetailStyle.conditionIcon, { backgroundColor: `${cfg.color}20` }]}>
                        <MaterialIcons name={cfg.icon} size={20} color={cfg.color} />
                      </View>
                      <Text style={[RentalDetailStyle.conditionName, { color: selected ? cfg.color : colors.text }]}>{cond}</Text>
                      <Text style={[RentalDetailStyle.conditionDesc, { color: colors.textMuted }]} numberOfLines={2}>{cfg.description}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={[RentalDetailStyle.notesInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <TextInput style={[RentalDetailStyle.notesInputText, { color: colors.text }]} value={returnNotes} onChangeText={setReturnNotes} placeholder="Notes on condition..." placeholderTextColor={colors.placeholder} multiline numberOfLines={3} textAlignVertical="top" />
              </View>
              <TouchableOpacity style={[RentalDetailStyle.confirmReturnBtn, { backgroundColor: colors.success }]} onPress={handleReturn} disabled={actionLoading} activeOpacity={0.85}>
                {actionLoading ? <ActivityIndicator color="#FFF" /> : (
                  <><MaterialIcons name="check-circle" size={20} color="#FFF" />
                  <Text style={RentalDetailStyle.confirmReturnText}>Confirm Return</Text></>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default RentalDetail;
