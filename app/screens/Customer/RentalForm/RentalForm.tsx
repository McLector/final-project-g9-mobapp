import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
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
import { calculateRentalCost, formatCurrency, toDateString } from '../../../../src/utils/format';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';
import DatePicker from '../../../../src/components/DatePicker/DatePicker';
import RentalFormStyle from './RentalFormStyle';

type Props = {
  navigation: NativeStackNavigationProp<CustomerStackParamList, 'RentalForm'>;
  route: RouteProp<CustomerStackParamList, 'RentalForm'>;
};

const RentalForm = ({ navigation, route }: Props) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { showError } = useToast();
  const { equipmentId } = route.params;

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = toDateString(tomorrow);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const [startDate, setStartDate] = useState(tomorrowStr);
  const [endDate, setEndDate] = useState(toDateString(dayAfter));
  const [quantity, setQuantity] = useState('1');
  const [durationType, setDurationType] = useState<RentalDuration>('daily');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data } = await supabase.from('equipment').select('*').eq('id', equipmentId).single();
    if (data) setEquipment(data as Equipment);
    setLoading(false);
  }, [equipmentId]);

  useEffect(() => { load(); }, [load]);

  const daysDiff = Math.max(0, Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  ));

  // Unlock rules: weekly needs 7+ days, monthly needs 30+ days
  const isDurationUnlocked = (d: RentalDuration): boolean => {
    if (d === 'daily') return true;
    if (d === 'weekly') return daysDiff >= 7;
    if (d === 'monthly') return daysDiff >= 30;
    return false;
  };

  const getRecommendedDuration = (days: number): RentalDuration => {
    if (days >= 30) return 'monthly';
    if (days >= 7) return 'weekly';
    return 'daily';
  };

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    if (endDate <= date) {
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      setEndDate(toDateString(next));
    }
    setErrors(p => ({ ...p, startDate: '' }));
  };

  const handleEndDateChange = (date: string) => {
    setEndDate(date);
    const days = Math.ceil(
      (new Date(date).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    setDurationType(getRecommendedDuration(days));
    setErrors(p => ({ ...p, endDate: '' }));
  };

  const totalCost = equipment
    ? calculateRentalCost(
        equipment.daily_rate, equipment.weekly_rate, equipment.monthly_rate,
        new Date(startDate), new Date(endDate), durationType, parseInt(quantity) || 0
      )
    : 0;

  const minEndDate = (() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 1);
    return toDateString(d);
  })();

  const validate = () => {
    if (!equipment) return false;
    const qty = parseInt(quantity);
    const e: Record<string, string> = {};
    const qErr = validateQuantity(qty, equipment.available_quantity);
    if (qErr) e.quantity = qErr;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(startDate) <= today) e.startDate = 'Start date must be in the future.';
    if (new Date(endDate) <= new Date(startDate)) e.endDate = 'End date must be after start date.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !equipment || !user) return;
    setSubmitting(true);
    try {
      // Race condition check
      const { data: freshEquip } = await supabase
        .from('equipment').select('available_quantity').eq('id', equipment.id).single();
      if (freshEquip && freshEquip.available_quantity < parseInt(quantity)) {
        showError(
          freshEquip.available_quantity === 0
            ? 'Sorry — this equipment just became unavailable.'
            : `Only ${freshEquip.available_quantity} unit${freshEquip.available_quantity !== 1 ? 's' : ''} left. Reduce quantity.`
        );
        setEquipment({ ...equipment, available_quantity: freshEquip.available_quantity });
        return;
      }

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
      Alert.alert(
        'Request Submitted!',
        'Your rental request is pending admin approval.',
        [{ text: 'OK', onPress: () => navigation.navigate('CustomerTabsRoot') }]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit.';
      showError(msg.includes('Insufficient') ? 'Equipment just became unavailable. Please try again.' : msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !equipment) return <LoadingSpinner message="Loading..." />;

  const durations: RentalDuration[] = ['daily', 'weekly', 'monthly'];
  const rateForDuration = {
    daily: equipment.daily_rate,
    weekly: equipment.weekly_rate,
    monthly: equipment.monthly_rate,
  };
  const unlockDays = { daily: 0, weekly: 7, monthly: 30 };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[RentalFormStyle.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={RentalFormStyle.flex}>
        <View style={[RentalFormStyle.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[RentalFormStyle.headerTitle, { color: colors.text }]}>Rental Request</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={RentalFormStyle.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Equipment summary */}
          <View style={[RentalFormStyle.equipSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[RentalFormStyle.equipIconBox, { backgroundColor: colors.primaryLight }]}>
              <MaterialIcons name="construction" size={22} color={colors.primary} />
            </View>
            <View style={RentalFormStyle.equipInfo}>
              <Text style={[RentalFormStyle.equipName, { color: colors.text }]}>{equipment.name}</Text>
              <Text style={[RentalFormStyle.equipMeta, { color: colors.textMuted }]}>
                {equipment.category} · {equipment.available_quantity} available
              </Text>
            </View>
          </View>

          {/* Billing type */}
          <View style={RentalFormStyle.fieldGroup}>
            <Text style={[RentalFormStyle.label, { color: colors.text }]}>Billing Type</Text>
            <View style={RentalFormStyle.durationRow}>
              {durations.map((d) => {
                const unlocked = isDurationUnlocked(d);
                const selected = durationType === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[
                      RentalFormStyle.durationChip,
                      {
                        backgroundColor: selected ? colors.primary : unlocked ? colors.cardAlt : colors.borderLight,
                        borderColor: selected ? colors.primary : unlocked ? colors.border : colors.borderLight,
                        opacity: unlocked ? 1 : 0.55,
                      },
                    ]}
                    onPress={() => { if (unlocked) setDurationType(d); }}
                    activeOpacity={unlocked ? 0.8 : 1}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {!unlocked && (
                        <MaterialIcons name="lock" size={11} color={colors.textMuted} />
                      )}
                      <Text style={[RentalFormStyle.durationText, {
                        color: selected ? '#FFF' : unlocked ? colors.textSecondary : colors.textMuted,
                      }]}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </Text>
                    </View>
                    <Text style={[RentalFormStyle.durationRate, {
                      color: selected ? 'rgba(255,255,255,0.8)' : unlocked ? colors.textMuted : colors.borderLight,
                    }]}>
                      {unlocked ? formatCurrency(rateForDuration[d]) : `${unlockDays[d]}+ days`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Date pickers */}
          <View style={RentalFormStyle.fieldGroup}>
            <Text style={[RentalFormStyle.label, { color: colors.text }]}>Rental Period</Text>
            <View style={RentalFormStyle.datesCol}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={handleStartDateChange}
                minDate={tomorrowStr}
                error={errors.startDate}
              />
              <View style={[RentalFormStyle.dateDivider, { backgroundColor: colors.border }]}>
                <MaterialIcons name="arrow-downward" size={14} color={colors.textMuted} />
              </View>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={handleEndDateChange}
                minDate={minEndDate}
                error={errors.endDate}
              />
            </View>
            {daysDiff > 0 && (
              <View style={[RentalFormStyle.durationInfo, { backgroundColor: colors.infoLight }]}>
                <MaterialIcons name="schedule" size={14} color={colors.info} />
                <Text style={[RentalFormStyle.durationInfoText, { color: colors.info }]}>
                  {daysDiff} day{daysDiff !== 1 ? 's' : ''} rental period
                </Text>
              </View>
            )}
          </View>

          {/* Quantity */}
          <View style={RentalFormStyle.fieldGroup}>
            <Text style={[RentalFormStyle.label, { color: colors.text }]}>Quantity</Text>
            <View style={RentalFormStyle.quantityRow}>
              <TouchableOpacity
                style={[RentalFormStyle.qtyBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                onPress={() => setQuantity(String(Math.max(1, parseInt(quantity) - 1)))}
              >
                <MaterialIcons name="remove" size={18} color={colors.text} />
              </TouchableOpacity>
              <View style={[RentalFormStyle.qtyInput, {
                backgroundColor: colors.inputBg,
                borderColor: errors.quantity ? colors.danger : colors.inputBorder,
              }]}>
                <TextInput
                  style={[RentalFormStyle.qtyText, { color: colors.text }]}
                  value={quantity}
                  onChangeText={(v) => { setQuantity(v); setErrors(p => ({ ...p, quantity: '' })); }}
                  keyboardType="number-pad"
                  textAlign="center"
                />
              </View>
              <TouchableOpacity
                style={[RentalFormStyle.qtyBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                onPress={() => setQuantity(String(Math.min(equipment.available_quantity, parseInt(quantity || '0') + 1)))}
              >
                <MaterialIcons name="add" size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={[RentalFormStyle.qtyMax, { color: colors.textMuted }]}>
                max {equipment.available_quantity}
              </Text>
            </View>
            {errors.quantity ? (
              <Text style={[RentalFormStyle.error, { color: colors.danger }]}>{errors.quantity}</Text>
            ) : null}
          </View>

          {/* Notes */}
          <View style={RentalFormStyle.fieldGroup}>
            <Text style={[RentalFormStyle.label, { color: colors.text }]}>
              Notes <Text style={{ fontWeight: '400' }}>(Optional)</Text>
            </Text>
            <View style={[RentalFormStyle.textAreaWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <TextInput
                style={[RentalFormStyle.textArea, { color: colors.text }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Delivery instructions, special requirements..."
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Cost breakdown */}
          <View style={[RentalFormStyle.costCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[RentalFormStyle.costTitle, { color: colors.text }]}>Cost Breakdown</Text>
            {[
              { label: `Rate (${durationType})`, value: formatCurrency(rateForDuration[durationType]) },
              { label: 'Duration', value: `${daysDiff} day${daysDiff !== 1 ? 's' : ''}` },
              { label: 'Quantity', value: `×${quantity || 0} unit${parseInt(quantity) !== 1 ? 's' : ''}` },
            ].map(row => (
              <View key={row.label} style={RentalFormStyle.costRow}>
                <Text style={[RentalFormStyle.costLabel, { color: colors.textMuted }]}>{row.label}</Text>
                <Text style={[RentalFormStyle.costValue, { color: colors.textSecondary }]}>{row.value}</Text>
              </View>
            ))}
            <View style={[RentalFormStyle.costTotal, { borderTopColor: colors.border }]}>
              <Text style={[RentalFormStyle.totalLabel, { color: colors.text }]}>Estimated Total</Text>
              <Text style={[RentalFormStyle.totalValue, { color: colors.primary }]}>{formatCurrency(totalCost)}</Text>
            </View>
            <Text style={[RentalFormStyle.costNote, { color: colors.textMuted }]}>
              * Final amount confirmed upon admin approval
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[RentalFormStyle.submitBtn, { backgroundColor: submitting ? colors.border : colors.primary }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="send" size={18} color="#FFFFFF" />
                <Text style={RentalFormStyle.submitText}>Submit Rental Request</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RentalForm;
