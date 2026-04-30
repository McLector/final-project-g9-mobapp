import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../../../../src/lib/supabase';
import useTheme from '../../../../src/hooks/useTheme';
import { Equipment, CustomerStackParamList } from '../../../../src/types';
import { formatCurrency } from '../../../../src/utils/format';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAuth from '../../../../src/hooks/useAuth';
import { useToast } from '../../../../src/hooks/useToast';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';
import AvailabilityCalendar from '../../../../src/components/AvailabilityCalendar/AvailabilityCalendar';
import EquipmentDetailStyle from './EquipmentDetailStyle';

type Props = {
  navigation: NativeStackNavigationProp<CustomerStackParamList, 'EquipmentDetail'>;
  route: RouteProp<CustomerStackParamList, 'EquipmentDetail'>;
};

const EquipmentDetail = ({ navigation, route }: Props) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { showSuccess } = useToast();
  const { equipmentId } = route.params;
  const [isFavorited, setIsFavorited] = useState(false);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAvailability, setShowAvailability] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('equipment').select('*').eq('id', equipmentId).single();
    if (data) setEquipment(data as Equipment);
    setLoading(false);
  }, [equipmentId]);

  useEffect(() => { load(); }, [load]);

  const favKey = user ? `@starkrent_favorites_${user.id}_v1` : null;

  useEffect(() => {
    if (!favKey) return;
    AsyncStorage.getItem(favKey).then(raw => {
      const ids: string[] = raw ? JSON.parse(raw) : [];
      setIsFavorited(ids.includes(equipmentId));
    });
  }, [favKey, equipmentId]);

  const toggleFavorite = async () => {
    if (!favKey) return;
    const raw = await AsyncStorage.getItem(favKey);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    let newIds: string[];
    if (isFavorited) {
      newIds = ids.filter(id => id !== equipmentId);
      setIsFavorited(false);
      showSuccess('Removed from favorites');
    } else {
      newIds = [...ids, equipmentId];
      setIsFavorited(true);
      showSuccess('Added to favorites');
    }
    await AsyncStorage.setItem(favKey, JSON.stringify(newIds));
  };

  if (loading || !equipment) return <LoadingSpinner message="Loading equipment..." />;

  const isAvailable = equipment.available_quantity > 0;

  return (
    <SafeAreaView edges={['top','bottom']} style={[EquipmentDetailStyle.safe, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image */}
        <View style={EquipmentDetailStyle.imageContainer}>
          <Image
            source={{ uri: equipment.image_url || 'https://via.placeholder.com/600x360' }}
            style={EquipmentDetailStyle.image}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent']}
            style={EquipmentDetailStyle.imageOverlay}
          >
            <TouchableOpacity onPress={() => navigation.goBack()} style={EquipmentDetailStyle.backBtn}>
              <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>
          <View
            style={[
              EquipmentDetailStyle.availBadge,
              { backgroundColor: isAvailable ? colors.success : colors.danger },
            ]}
          >
            <Text style={EquipmentDetailStyle.availText}>
              {isAvailable ? `${equipment.available_quantity} of ${equipment.total_quantity} Available` : 'Not Available'}
            </Text>
          </View>
        </View>

        <View style={[EquipmentDetailStyle.body, { backgroundColor: colors.surface }]}>
          {/* Header info */}
          <View style={EquipmentDetailStyle.topRow}>
            <View style={[EquipmentDetailStyle.categoryTag, { backgroundColor: colors.primaryLight }]}>
              <Text style={[EquipmentDetailStyle.categoryText, { color: colors.primary }]}>
                {equipment.category}
              </Text>
            </View>
            <View style={EquipmentDetailStyle.conditionRow}>
              <MaterialIcons name="verified" size={14} color={colors.success} />
              <Text style={[EquipmentDetailStyle.conditionText, { color: colors.textMuted }]}>
                {equipment.condition}
              </Text>
            </View>
          </View>

          <Text style={[EquipmentDetailStyle.name, { color: colors.text }]}>{equipment.name}</Text>
          <Text style={[EquipmentDetailStyle.description, { color: colors.textMuted }]}>
            {equipment.description}
          </Text>

          {/* Rates */}
          <Text style={[EquipmentDetailStyle.sectionTitle, { color: colors.text }]}>Rental Rates</Text>
          <View style={EquipmentDetailStyle.ratesRow}>
            {[
              { label: 'Daily', rate: equipment.daily_rate },
              { label: 'Weekly', rate: equipment.weekly_rate },
              { label: 'Monthly', rate: equipment.monthly_rate },
            ].map((r) => (
              <View key={r.label} style={[EquipmentDetailStyle.rateCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <Text style={[EquipmentDetailStyle.rateLabel, { color: colors.textMuted }]}>{r.label}</Text>
                <Text style={[EquipmentDetailStyle.rateValue, { color: colors.primary }]}>
                  {formatCurrency(r.rate)}
                </Text>
              </View>
            ))}
          </View>

          {/* Specs */}
          {equipment.specs && Object.keys(equipment.specs).length > 0 && (
            <>
              <Text style={[EquipmentDetailStyle.sectionTitle, { color: colors.text }]}>Specifications</Text>
              <View style={[EquipmentDetailStyle.specsCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                {Object.entries(equipment.specs).map(([key, val], i, arr) => (
                  <View
                    key={key}
                    style={[
                      EquipmentDetailStyle.specRow,
                      i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                  >
                    <Text style={[EquipmentDetailStyle.specKey, { color: colors.textMuted }]}>{key}</Text>
                    <Text style={[EquipmentDetailStyle.specVal, { color: colors.text }]}>{val as string}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

          {/* Availability button */}
          <TouchableOpacity
            style={[{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 8, borderRadius: 12, paddingVertical: 13,
              borderWidth: 1.5,
            }, { backgroundColor: colors.infoLight, borderColor: colors.info }]}
            onPress={() => setShowAvailability(true)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="event-available" size={18} color={colors.info} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.info }}>
              Check Availability Calendar
            </Text>
            <MaterialIcons name="chevron-right" size={16} color={colors.info} />
          </TouchableOpacity>

      {/* CTA */}
      <View style={[EquipmentDetailStyle.cta, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View>
          <Text style={[EquipmentDetailStyle.ctaFrom, { color: colors.textMuted }]}>Starting from</Text>
          <Text style={[EquipmentDetailStyle.ctaRate, { color: colors.primary }]}>
            {formatCurrency(equipment.daily_rate)}<Text style={{ fontSize: 13, fontWeight: '400', color: colors.textMuted }}>/day</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={[
            EquipmentDetailStyle.rentBtn,
            { backgroundColor: isAvailable ? colors.primary : colors.border },
          ]}
          disabled={!isAvailable}
          onPress={() => navigation.navigate('RentalForm', { equipmentId: equipment.id })}
          activeOpacity={0.85}
        >
          <Text style={[EquipmentDetailStyle.rentBtnText, { color: isAvailable ? '#FFFFFF' : colors.textMuted }]}>
            {isAvailable ? 'Rent Now' : 'Not Available'}
          </Text>
        </TouchableOpacity>
      </View>
      {/* Availability Modal */}
      <Modal
        visible={showAvailability}
        animationType="slide"
        onRequestClose={() => setShowAvailability(false)}
      >
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            paddingHorizontal: 16, paddingVertical: 14,
            borderBottomWidth: 1, borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          }}>
            <TouchableOpacity onPress={() => setShowAvailability(false)}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
                Availability
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={1}>
                {equipment?.name}
              </Text>
            </View>
            <View style={{
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
              backgroundColor: colors.primaryLight,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                First come, first served
              </Text>
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <View style={{
              padding: 12, borderRadius: 10, marginBottom: 12,
              backgroundColor: colors.warningLight,
              flexDirection: 'row', gap: 8, alignItems: 'flex-start',
            }}>
              <MaterialIcons name="info" size={15} color={colors.warning} />
              <Text style={{ flex: 1, fontSize: 12, color: colors.warning, lineHeight: 17 }}>
                Booking requests are accepted on a first-come, first-served basis. Final approval is subject to admin review.
              </Text>
            </View>
            <AvailabilityCalendar
              equipmentId={equipment?.id ?? ''}
              totalQuantity={equipment?.total_quantity ?? 0}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default EquipmentDetail;
