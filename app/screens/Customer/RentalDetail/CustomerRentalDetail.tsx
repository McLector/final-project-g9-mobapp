import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, ActivityIndicator, Modal, ScrollView,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../../../../src/lib/supabase';
import useAuth from '../../../../src/hooks/useAuth';
import useTheme from '../../../../src/hooks/useTheme';
import { useToast } from '../../../../src/hooks/useToast';
import { Rental, CustomerStackParamList } from '../../../../src/types';
import { formatCurrency, formatDate, getDaysDiff, toDateString } from '../../../../src/utils/format';
import StatusBadge from '../../../../src/components/StatusBadge/StatusBadge';
import DatePicker from '../../../../src/components/DatePicker/DatePicker';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';
import CustomerRentalDetailStyle from './CustomerRentalDetailStyle';

type Props = {
  navigation: NativeStackNavigationProp<CustomerStackParamList, 'CustomerRentalDetail'>;
  route: RouteProp<CustomerStackParamList, 'CustomerRentalDetail'>;
};

const CustomerRentalDetail = ({ navigation, route }: Props) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const { rentalId } = route.params;

  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [extendModalVisible, setExtendModalVisible] = useState(false);
  const [newEndDate, setNewEndDate] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('rentals')
      .select('*, equipment(*)')
      .eq('id', rentalId)
      .eq('customer_id', user?.id)
      .single();
    if (data) setRental(data as Rental);
    setLoading(false);
  }, [rentalId, user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = () => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this rental request? This cannot be undone.',
      [
        { text: 'Keep It', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const { error } = await supabase
              .from('rentals')
              .update({ status: 'cancelled' })
              .eq('id', rentalId)
              .eq('customer_id', user?.id);
            if (error) {
              showError(error.message);
            } else {
              showSuccess('Rental request cancelled');
              navigation.goBack();
            }
            setActionLoading(false);
          },
        },
      ]
    );
  };

  const handleConfirmReceipt = () => {
    Alert.alert('Confirm Receipt', 'Confirm that you have received and are now using the equipment?', [
      { text: 'Not Yet', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setActionLoading(true);
          const { error } = await supabase
            .from('rentals').update({ status: 'active' })
            .eq('id', rentalId).eq('customer_id', user?.id).eq('status', 'approved');
          setActionLoading(false);
          if (error) showError(error.message);
          else { showSuccess('Rental marked as active'); load(); }
        },
      },
    ]);
  };

  const handleReturn = () => {
    Alert.alert('Return Equipment', 'Confirm that you are returning this equipment?', [
      { text: 'Not Yet', style: 'cancel' },
      {
        text: 'Confirm Return', style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          const { error } = await supabase
            .from('rentals').update({ status: 'returned' })
            .eq('id', rentalId).eq('customer_id', user?.id).eq('status', 'active');
          setActionLoading(false);
          if (error) showError(error.message);
          else { showSuccess('Equipment returned successfully'); load(); }
        },
      },
    ]);
  };

  const openExtend = () => {
    if (!rental) return;
    const d = new Date(rental.end_date);
    d.setDate(d.getDate() + 1);
    setNewEndDate(toDateString(d));
    setExtendModalVisible(true);
  };

  const handleExtendRequest = async () => {
    if (!rental || !newEndDate || !user) return;
    const currentEnd = new Date(rental.end_date);
    const newEnd = new Date(newEndDate);
    if (newEnd <= currentEnd) {
      showError('New end date must be after current end date.');
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase.from('extension_requests').insert({
        rental_id: rental.id,
        customer_id: user.id,
        requested_end_date: newEndDate,
        status: 'pending',
        customer_note: `Extension from ${rental.end_date} to ${newEndDate}`,
      });
      if (error) throw new Error(error.message);
      showSuccess('Extension request submitted. Awaiting admin approval.');
      setExtendModalVisible(false);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to submit extension request.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !rental) return <LoadingSpinner message="Loading rental..." />;

  const days = getDaysDiff(rental.start_date, rental.end_date);
  const minExtendDate = (() => {
    const d = new Date(rental.end_date);
    d.setDate(d.getDate() + 1);
    return toDateString(d);
  })();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[CustomerRentalDetailStyle.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[CustomerRentalDetailStyle.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={CustomerRentalDetailStyle.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={CustomerRentalDetailStyle.headerCenter}>
          <Text style={[CustomerRentalDetailStyle.headerTitle, { color: colors.text }]}>Rental Details</Text>
          <Text style={[CustomerRentalDetailStyle.headerSub, { color: colors.textMuted }]}>
            #{rental.id.substring(0, 8).toUpperCase()}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <StatusBadge status={rental.status} />
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight }}
            onPress={() => navigation.navigate('RentalChat', {
              rentalId: rental.id,
              rentalTitle: rental.equipment?.name ?? 'Equipment',
            })}
          >
            <MaterialIcons name="chat" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={CustomerRentalDetailStyle.scroll}>
        {/* Equipment banner */}
        <LinearGradient colors={['#0F172A', '#1E3A5F']} style={CustomerRentalDetailStyle.banner}>
          <View style={[CustomerRentalDetailStyle.bannerIcon, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="construction" size={24} color="#FFF" />
          </View>
          <View style={CustomerRentalDetailStyle.bannerInfo}>
            <Text style={CustomerRentalDetailStyle.bannerName}>{rental.equipment?.name ?? 'Equipment'}</Text>
            <Text style={CustomerRentalDetailStyle.bannerCategory}>{rental.equipment?.category}</Text>
          </View>
          <Text style={CustomerRentalDetailStyle.bannerCost}>{formatCurrency(rental.total_cost)}</Text>
        </LinearGradient>

        {/* Rental details */}
        <View style={[CustomerRentalDetailStyle.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[CustomerRentalDetailStyle.cardTitle, { color: colors.text }]}>Rental Info</Text>
          {[
            { label: 'Start Date', value: formatDate(rental.start_date) },
            { label: 'End Date', value: formatDate(rental.end_date) },
            { label: 'Duration', value: `${days} day${days !== 1 ? 's' : ''} (${rental.duration_type})` },
            { label: 'Quantity', value: `${rental.quantity} unit${rental.quantity !== 1 ? 's' : ''}` },
            { label: 'Total Cost', value: formatCurrency(rental.total_cost) },
            { label: 'Submitted', value: formatDate(rental.created_at) },
          ].map((row) => (
            <View key={row.label} style={[CustomerRentalDetailStyle.row, { borderBottomColor: colors.border }]}>
              <Text style={[CustomerRentalDetailStyle.rowLabel, { color: colors.textMuted }]}>{row.label}</Text>
              <Text style={[CustomerRentalDetailStyle.rowValue, {
                color: row.label === 'Total Cost' ? colors.primary : colors.text,
                fontWeight: row.label === 'Total Cost' ? '700' : '500',
              }]}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Notes */}
        {rental.notes ? (
          <View style={[CustomerRentalDetailStyle.notesBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
            <Text style={[CustomerRentalDetailStyle.notesLabel, { color: colors.textMuted }]}>Your Notes</Text>
            <Text style={[CustomerRentalDetailStyle.notesText, { color: colors.text }]}>{rental.notes}</Text>
          </View>
        ) : null}



        {/* Return condition */}
        {rental.return_condition ? (
          <View style={[CustomerRentalDetailStyle.notesBox, { backgroundColor: colors.successLight, borderColor: colors.success }]}>
            <Text style={[CustomerRentalDetailStyle.notesLabel, { color: colors.success }]}>Return Condition</Text>
            <Text style={[CustomerRentalDetailStyle.notesText, { color: colors.text }]}>{rental.return_condition}</Text>
          </View>
        ) : null}

        {/* Actions */}
        {rental.status === 'pending' && (
          <TouchableOpacity
            style={[CustomerRentalDetailStyle.cancelBtn, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}
            onPress={handleCancel}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            {actionLoading ? <ActivityIndicator color={colors.danger} /> : (
              <>
                <MaterialIcons name="cancel" size={20} color={colors.danger} />
                <Text style={[CustomerRentalDetailStyle.cancelBtnText, { color: colors.danger }]}>
                  Cancel This Request
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {rental.status === 'approved' && (
          <TouchableOpacity
            style={[CustomerRentalDetailStyle.extendBtn, { backgroundColor: colors.successLight, borderColor: colors.success }]}
            onPress={handleConfirmReceipt}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            {actionLoading ? <ActivityIndicator color={colors.success} /> : (
              <>
                <MaterialIcons name="inventory" size={20} color={colors.success} />
                <Text style={[CustomerRentalDetailStyle.extendBtnText, { color: colors.success }]}>
                  Confirm Receipt
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {(rental.status === 'approved' || rental.status === 'active') && (
          <TouchableOpacity
            style={[CustomerRentalDetailStyle.extendBtn, { backgroundColor: colors.infoLight, borderColor: colors.info }]}
            onPress={openExtend}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            <MaterialIcons name="event" size={20} color={colors.info} />
            <Text style={[CustomerRentalDetailStyle.extendBtnText, { color: colors.info }]}>
              Request Extension
            </Text>
          </TouchableOpacity>
        )}

        {rental.status === 'active' && (
          <TouchableOpacity
            style={[CustomerRentalDetailStyle.extendBtn, { backgroundColor: colors.successLight, borderColor: colors.success }]}
            onPress={handleReturn}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            {actionLoading ? <ActivityIndicator color={colors.success} /> : (
              <>
                <MaterialIcons name="assignment-return" size={20} color={colors.success} />
                <Text style={[CustomerRentalDetailStyle.extendBtnText, { color: colors.success }]}>
                  Return Equipment
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Extend modal */}
      <Modal visible={extendModalVisible} animationType="slide" transparent onRequestClose={() => setExtendModalVisible(false)}>
        <View style={[CustomerRentalDetailStyle.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[CustomerRentalDetailStyle.modalCard, { backgroundColor: colors.surface }]}>
            <View style={[CustomerRentalDetailStyle.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[CustomerRentalDetailStyle.modalTitle, { color: colors.text }]}>Request Extension</Text>
              <TouchableOpacity onPress={() => setExtendModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={CustomerRentalDetailStyle.modalBody}>
              <Text style={[CustomerRentalDetailStyle.modalEquip, { color: colors.text }]}>
                {rental.equipment?.name}
              </Text>
              <Text style={[CustomerRentalDetailStyle.modalSub, { color: colors.textMuted }]}>
                Current end: {formatDate(rental.end_date)}
              </Text>
              <View style={[CustomerRentalDetailStyle.infoBox, { backgroundColor: colors.warningLight }]}>
                <MaterialIcons name="info" size={15} color={colors.warning} />
                <Text style={[CustomerRentalDetailStyle.infoText, { color: colors.warning }]}>
                  Extension requests are subject to admin approval and equipment availability.
                </Text>
              </View>
              <DatePicker
                label="Requested New End Date"
                value={newEndDate}
                onChange={setNewEndDate}
                minDate={minExtendDate}
              />
              <TouchableOpacity
                style={[CustomerRentalDetailStyle.submitBtn, { backgroundColor: colors.info }]}
                onPress={handleExtendRequest}
                disabled={actionLoading}
                activeOpacity={0.85}
              >
                {actionLoading ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <MaterialIcons name="send" size={18} color="#FFF" />
                    <Text style={CustomerRentalDetailStyle.submitBtnText}>Submit Extension Request</Text>
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

export default CustomerRentalDetail;
