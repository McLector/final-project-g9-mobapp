import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../../../../src/lib/supabase';
import useAuth from '../../../../src/hooks/useAuth';
import useTheme from '../../../../src/hooks/useTheme';
import { useToast } from '../../../../src/hooks/useToast';
import { Equipment, CustomerStackParamList, RentalDuration } from '../../../../src/types';
import { validateQuantity } from '../../../../src/utils/validation';
import { calculateRentalCostBreakdown, formatCurrency, toDateString } from '../../../../src/utils/format';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';
import DatePicker from '../../../../src/components/DatePicker/DatePicker';

type Props = {
  navigation: NativeStackNavigationProp<CustomerStackParamList, 'RentalForm'>;
  route: RouteProp<CustomerStackParamList, 'RentalForm'>;
};

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: 'payments' as const, sub: 'Pay upon equipment delivery' },
  { id: 'gcash', label: 'GCash', icon: 'phone-android' as const, sub: 'Via GCash mobile wallet' },
  { id: 'bank', label: 'Bank Transfer', icon: 'account-balance' as const, sub: 'BDO / BPI / UnionBank' },
];

const DURATION_LABELS: Record<RentalDuration, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const computeDurationType = (start: string, end: string): RentalDuration => {
  const days = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
  if (days >= 30) return 'monthly';
  if (days >= 7) return 'weekly';
  return 'daily';
};

const localFormatDate = (s: string) => {
  try {
    return new Date(s).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return s; }
};

const RentalForm = ({ navigation, route }: Props) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { showError } = useToast();
  const { equipmentId } = route.params;

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('cod');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = toDateString(tomorrow);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const [startDate, setStartDate] = useState(tomorrowStr);
  const [endDate, setEndDate] = useState(toDateString(dayAfter));
  const [durationType, setDurationType] = useState<RentalDuration>('daily');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data } = await supabase.from('equipment').select('*').eq('id', equipmentId).single();
    if (data) setEquipment(data as Equipment);
    setLoading(false);
  }, [equipmentId]);

  useEffect(() => { load(); }, [load]);

  const daysDiff = Math.max(1, Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
  ));

  const maxQty = equipment?.available_quantity ?? 0;

  const minEndDate = (() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 1);
    return toDateString(d);
  })();

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    if (endDate <= date) {
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      const nextStr = toDateString(next);
      setEndDate(nextStr);
      setDurationType(computeDurationType(date, nextStr));
    } else {
      setDurationType(computeDurationType(date, endDate));
    }
    setErrors(p => ({ ...p, startDate: '' }));
  };

  const handleEndDateChange = (date: string) => {
    setEndDate(date);
    setDurationType(computeDurationType(startDate, date));
    setErrors(p => ({ ...p, endDate: '' }));
  };

  const rateForDuration: Record<RentalDuration, number> = equipment
    ? { daily: equipment.daily_rate, weekly: equipment.weekly_rate, monthly: equipment.monthly_rate }
    : { daily: 0, weekly: 0, monthly: 0 };

  const costBreakdown = equipment
    ? calculateRentalCostBreakdown(
        equipment.daily_rate, equipment.weekly_rate, equipment.monthly_rate,
        new Date(startDate), new Date(endDate), parseInt(quantity) || 0
      )
    : null;
  const totalCost = costBreakdown?.total ?? 0;

  const validate = () => {
    if (!equipment) return false;
    const qty = parseInt(quantity);
    const e: Record<string, string> = {};
    const qErr = validateQuantity(qty, maxQty);
    if (qErr) e.quantity = qErr;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(startDate) <= today) e.startDate = 'Start date must be in the future.';
    if (new Date(endDate) <= new Date(startDate)) e.endDate = 'End date must be after start date.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleProceedToCheckout = () => {
    if (validate()) setCheckoutVisible(true);
  };

  const handleSubmit = async () => {
    if (!equipment || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('rentals').insert({
        customer_id: user.id,
        equipment_id: equipment.id,
        quantity: parseInt(quantity),
        start_date: startDate,
        end_date: endDate,
        duration_type: durationType,
        total_cost: totalCost,
        status: 'pending',
        notes: notes.trim() || null,
      });
      if (error) throw new Error(error.message);
      Alert.alert('Request Submitted!',
        'Your rental request is pending admin approval.',
        [{ text: 'OK', onPress: () => navigation.navigate('CustomerTabs') }]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit.';
      showError(msg.includes('Insufficient') ? 'Equipment just became unavailable. Please try again.' : msg);
    } finally {
      setSubmitting(false);
      setCheckoutVisible(false);
    }
  };

  if (loading || !equipment) return <LoadingSpinner message="Loading..." />;

  const durations: RentalDuration[] = ['daily', 'weekly', 'monthly'];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[s.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        {/* Header */}
        <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Rental Request</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Equipment summary */}
          <View style={[s.equipCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[s.equipIconBox, { backgroundColor: colors.primaryLight }]}>
              <MaterialIcons name="construction" size={22} color={colors.primary} />
            </View>
            <View style={s.equipInfo}>
              <Text style={[s.equipName, { color: colors.text }]} numberOfLines={1}>{equipment.name}</Text>
              <Text style={[s.equipMeta, { color: colors.textMuted }]}>
                {equipment.category} · {maxQty} available
              </Text>
            </View>
            <View style={[s.billingBadge, { backgroundColor: `${colors.primary}18` }]}>
              <Text style={[s.billingBadgeText, { color: colors.primary }]}>{DURATION_LABELS[durationType]}</Text>
            </View>
          </View>

          {/* Billing Type */}
          <View style={s.fieldGroup}>
            <Text style={[s.label, { color: colors.text }]}>Billing Type</Text>
            <View style={s.durationRow}>
              {durations.map((d) => (
                <TouchableOpacity key={d}
                  style={[s.durationChip, {
                    backgroundColor: durationType === d ? colors.primary : colors.cardAlt,
                    borderColor: durationType === d ? colors.primary : colors.border,
                  }]}
                  onPress={() => setDurationType(d)}
                >
                  <Text style={[s.durationText, { color: durationType === d ? '#FFF' : colors.textSecondary }]}>
                    {DURATION_LABELS[d]}
                  </Text>
                  <Text style={[s.durationRate, { color: durationType === d ? 'rgba(255,255,255,0.8)' : colors.textMuted }]}>
                    {formatCurrency(rateForDuration[d])}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Rental Period */}
          <View style={s.fieldGroup}>
            <Text style={[s.label, { color: colors.text }]}>Rental Period</Text>
            <View style={s.datesCol}>
              <DatePicker label="Start Date" value={startDate} onChange={handleStartDateChange} minDate={tomorrowStr} error={errors.startDate} />
              <View style={[s.dateDivider, { backgroundColor: colors.border }]}>
                <MaterialIcons name="arrow-downward" size={14} color={colors.textMuted} />
              </View>
              <DatePicker label="End Date" value={endDate} onChange={handleEndDateChange} minDate={minEndDate} error={errors.endDate} />
            </View>
            <View style={[s.durationInfo, { backgroundColor: `${colors.accent}12` }]}>
              <MaterialIcons name="schedule" size={13} color={colors.accent} />
              <Text style={[s.durationInfoText, { color: colors.accent }]}>
                {daysDiff} day{daysDiff !== 1 ? 's' : ''} · {DURATION_LABELS[durationType]} billing
              </Text>
            </View>
          </View>

          {/* Quantity */}
          <View style={s.fieldGroup}>
            <Text style={[s.label, { color: colors.text }]}>Quantity</Text>
            <View style={s.qtyRow}>
              <TouchableOpacity
                style={[s.qtyBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                onPress={() => setQuantity(String(Math.max(1, parseInt(quantity || '1') - 1)))}
              >
                <MaterialIcons name="remove" size={20} color={colors.text} />
              </TouchableOpacity>
              <View style={[s.qtyDisplay, { backgroundColor: colors.inputBg, borderColor: errors.quantity ? colors.danger : colors.inputBorder }]}>
                <TextInput
                  style={[s.qtyInput, { color: colors.text }]}
                  value={quantity}
                  onChangeText={(v) => { setQuantity(v); setErrors(p => ({ ...p, quantity: '' })); }}
                  keyboardType="number-pad"
                  textAlign="center"
                />
              </View>
              <TouchableOpacity
                style={[s.qtyBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                onPress={() => setQuantity(String(Math.min(maxQty, parseInt(quantity || '0') + 1)))}
              >
                <MaterialIcons name="add" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={[s.qtyMax, { color: colors.textMuted }]}>max {maxQty}</Text>
            </View>
            {errors.quantity ? <Text style={[s.error, { color: colors.danger }]}>{errors.quantity}</Text> : null}
          </View>

          {/* Notes */}
          <View style={s.fieldGroup}>
            <Text style={[s.label, { color: colors.text }]}>Notes <Text style={{ fontWeight: '400' }}>(Optional)</Text></Text>
            <View style={[s.notesWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <TextInput
                style={[s.notes, { color: colors.text }]}
                value={notes} onChangeText={setNotes}
                placeholder="Delivery instructions, special requirements..."
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Cost Breakdown */}
          <View style={[s.costCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.costTitle, { color: colors.text }]}>Cost Breakdown</Text>
            {[
              { label: `Rate (${DURATION_LABELS[durationType]})`, value: formatCurrency(rateForDuration[durationType]) },
              { label: 'Duration', value: `${daysDiff} day${daysDiff !== 1 ? 's' : ''}` },
              { label: 'Quantity', value: `×${quantity || 0} unit${parseInt(quantity) !== 1 ? 's' : ''}` },
            ].map((row) => (
              <View key={row.label} style={s.costRow}>
                <Text style={[s.costLabel, { color: colors.textMuted }]}>{row.label}</Text>
                <Text style={[s.costValue, { color: colors.textSecondary }]}>{row.value}</Text>
              </View>
            ))}
            <View style={[s.costTotalRow, { borderTopColor: colors.border }]}>
              <Text style={[s.costTotalLabel, { color: colors.text }]}>Estimated Total</Text>
              <Text style={[s.costTotalValue, { color: colors.primary }]}>{formatCurrency(totalCost)}</Text>
            </View>
            <Text style={[s.costNote, { color: colors.textMuted }]}>
              * Final amount confirmed upon admin approval
            </Text>
          </View>

          {/* Proceed button */}
          <TouchableOpacity
            style={[s.checkoutBtn, { backgroundColor: colors.primary }]}
            onPress={handleProceedToCheckout}
            activeOpacity={0.85}
          >
            <MaterialIcons name="shopping-cart-checkout" size={18} color="#FFFFFF" />
            <Text style={s.checkoutBtnText}>Proceed to Checkout</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Checkout Modal */}
      <Modal visible={checkoutVisible} animationType="slide" transparent onRequestClose={() => setCheckoutVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.checkoutSheet, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Checkout</Text>
            <Text style={[s.sheetSub, { color: colors.textMuted }]}>Review your order before confirming</Text>

            {/* Order summary */}
            <View style={[s.orderCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <Text style={[s.orderLabel, { color: colors.textMuted }]}>Order Summary</Text>
              <Text style={[s.orderEquip, { color: colors.text }]}>{equipment.name}</Text>
              <Text style={[s.orderMeta, { color: colors.textMuted }]}>
                {localFormatDate(startDate)} - {localFormatDate(endDate)} | {quantity} unit{parseInt(quantity) !== 1 ? 's' : ''}
              </Text>
              <View style={[s.orderTotalRow, { borderTopColor: colors.border }]}>
                <Text style={[s.orderTotalLabel, { color: colors.text }]}>Total</Text>
                <Text style={[s.orderTotalValue, { color: colors.primary }]}>{formatCurrency(totalCost)}</Text>
              </View>
            </View>

            {/* Payment method */}
            <Text style={[s.payLabel, { color: colors.text }]}>Payment Method</Text>
            <Text style={[s.payNote, { color: colors.textMuted }]}>Select how you'll pay upon approval</Text>
            {PAYMENT_METHODS.map((pm) => (
              <TouchableOpacity
                key={pm.id}
                style={[
                  s.payMethod,
                  { borderColor: selectedPayment === pm.id ? colors.primary : colors.border },
                  selectedPayment === pm.id && { backgroundColor: `${colors.primary}08` },
                ]}
                onPress={() => setSelectedPayment(pm.id)}
              >
                <View style={[s.payIconWrap, { backgroundColor: selectedPayment === pm.id ? colors.primaryLight : colors.cardAlt }]}>
                  <MaterialIcons name={pm.icon} size={20} color={selectedPayment === pm.id ? colors.primary : colors.textMuted} />
                </View>
                <View style={s.payInfo}>
                  <Text style={[s.payMethodLabel, { color: colors.text }]}>{pm.label}</Text>
                  <Text style={[s.payMethodSub, { color: colors.textMuted }]}>{pm.sub}</Text>
                </View>
                <View style={[s.payRadio, { borderColor: selectedPayment === pm.id ? colors.primary : colors.border }]}>
                  {selectedPayment === pm.id && <View style={[s.payRadioFill, { backgroundColor: colors.primary }]} />}
                </View>
              </TouchableOpacity>
            ))}

            <View style={[s.mockNote, { backgroundColor: `${colors.warning}15`, borderColor: colors.warning }]}>
              <MaterialIcons name="info-outline" size={14} color={colors.warning} />
              <Text style={[s.mockNoteText, { color: colors.warning }]}>
                Payment is collected upon admin approval and equipment delivery
              </Text>
            </View>

            <TouchableOpacity
              style={[s.confirmBtn, { backgroundColor: submitting ? colors.border : colors.primary }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.88}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <>
                  <MaterialIcons name="check-circle" size={20} color="#fff" />
                  <Text style={s.confirmBtnText}>Confirm Rental Request</Text>
                </>
              }
            </TouchableOpacity>

            <TouchableOpacity style={s.cancelBtn} onPress={() => setCheckoutVisible(false)}>
              <Text style={[s.cancelBtnText, { color: colors.textMuted }]}>Go back and edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0,
  },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  equipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  equipIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  equipInfo: { flex: 1 },
  equipName: { fontSize: 15, fontWeight: '700', letterSpacing: 0 },
  equipMeta: { fontSize: 12, marginTop: 2 },
  billingBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  billingBadgeText: { fontSize: 11, fontWeight: '700' },
  fieldGroup: { gap: 10 },
  label: { fontSize: 14, fontWeight: '700', letterSpacing: 0 },
  durationRow: { flexDirection: 'row', gap: 8 },
  durationChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 2,
  },
  durationText: { fontSize: 13, fontWeight: '700' },
  durationRate: { fontSize: 11, fontWeight: '500' },
  datesCol: { gap: 4 },
  dateDivider: {
    height: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  durationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  durationInfoText: { fontSize: 12, fontWeight: '600' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  qtyDisplay: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: { width: '100%', textAlign: 'center', fontSize: 18, fontWeight: '700', padding: 0 },
  qtyMax: { fontSize: 12 },
  error: { fontSize: 12, marginTop: 2 },
  notesWrap: { borderRadius: 14, borderWidth: 1.5, padding: 14, minHeight: 90 },
  notes: { fontSize: 14, lineHeight: 20, padding: 0 },
  costCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  costTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4, letterSpacing: 0 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between' },
  costLabel: { fontSize: 13 },
  costValue: { fontSize: 13, fontWeight: '600' },
  costTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1.5,
  },
  costTotalLabel: { fontSize: 15, fontWeight: '700' },
  costTotalValue: { fontSize: 20, fontWeight: '800' },
  costNote: { fontSize: 11, marginTop: 4 },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  checkoutBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  checkoutSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '92%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: '800', letterSpacing: 0, marginBottom: 4 },
  sheetSub: { fontSize: 13, marginBottom: 20 },
  orderCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 20 },
  orderLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  orderEquip: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  orderMeta: { fontSize: 13, marginBottom: 14 },
  orderTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1 },
  orderTotalLabel: { fontSize: 14, fontWeight: '600' },
  orderTotalValue: { fontSize: 18, fontWeight: '800' },
  payLabel: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  payNote: { fontSize: 13, marginBottom: 14 },
  payMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 10,
    gap: 12,
  },
  payIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  payInfo: { flex: 1 },
  payMethodLabel: { fontSize: 14, fontWeight: '600' },
  payMethodSub: { fontSize: 12, marginTop: 1 },
  payRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  payRadioFill: { width: 10, height: 10, borderRadius: 5 },
  mockNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 20,
  },
  mockNoteText: { flex: 1, fontSize: 12, fontWeight: '500' },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 10,
    marginBottom: 12,
  },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { fontSize: 14, fontWeight: '500' },
});

export default RentalForm;
