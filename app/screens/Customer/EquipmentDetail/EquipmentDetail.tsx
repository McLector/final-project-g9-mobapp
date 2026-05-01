import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
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

type Props = {
  navigation: NativeStackNavigationProp<CustomerStackParamList, 'EquipmentDetail'>;
  route: RouteProp<CustomerStackParamList, 'EquipmentDetail'>;
};

const { height: SCREEN_H } = Dimensions.get('window');
const IMAGE_H = Math.min(300, SCREEN_H * 0.34);

const EquipmentDetail = ({ navigation, route }: Props) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { showSuccess } = useToast();
  const { equipmentId } = route.params;
  const [isFavorited, setIsFavorited] = useState(false);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'specs' | 'calendar'>('info');
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
  const hasSpecs = equipment.specs && Object.keys(equipment.specs).length > 0;

  const CONDITION_COLOR: Record<string, string> = {
    Excellent: colors.success,
    Good: colors.accent,
    Fair: colors.warning,
    'Needs Maintenance': colors.danger,
  };

  return (
    <SafeAreaView edges={['bottom']} style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* ── Hero Image ── */}
        <View style={[s.imageContainer, { height: IMAGE_H }]}>
          <Image
            source={{ uri: equipment.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800' }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'transparent', 'rgba(0,0,0,0.3)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Back button */}
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Favorite button */}
          <TouchableOpacity style={s.favBtn} onPress={toggleFavorite}>
            <MaterialIcons
              name={isFavorited ? 'favorite' : 'favorite-border'}
              size={20}
              color={isFavorited ? '#EF4444' : '#fff'}
            />
          </TouchableOpacity>

          {/* Availability pill */}
          <View style={[s.availPill, { backgroundColor: isAvailable ? colors.success : colors.danger }]}>
            <View style={s.availDot} />
            <Text style={s.availText}>
              {isAvailable
                ? `${equipment.available_quantity} of ${equipment.total_quantity} Available`
                : 'Not Available'}
            </Text>
          </View>
        </View>

        {/* ── Info Panel ── */}
        <View style={[s.panel, { backgroundColor: colors.surface }]}>
          {/* Tags Row */}
          <View style={s.tagsRow}>
            <View style={[s.catTag, { backgroundColor: colors.primaryLight }]}>
              <Text style={[s.catTagText, { color: colors.primary }]}>{equipment.category}</Text>
            </View>
            <View style={[s.condTag, { backgroundColor: `${CONDITION_COLOR[equipment.condition] ?? colors.success}18` }]}>
              <MaterialIcons name="verified" size={11} color={CONDITION_COLOR[equipment.condition] ?? colors.success} />
              <Text style={[s.condTagText, { color: CONDITION_COLOR[equipment.condition] ?? colors.success }]}>
                {equipment.condition}
              </Text>
            </View>
          </View>

          {/* Name */}
          <Text style={[s.name, { color: colors.text }]}>{equipment.name}</Text>

          {/* Price */}
          <View style={[s.priceRow, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
            <View>
              <Text style={[s.priceLabel, { color: colors.textMuted }]}>Base price</Text>
              <Text style={[s.price, { color: colors.primary }]}>
                {formatCurrency(equipment.daily_rate)}
                <Text style={[s.priceUnit, { color: colors.textMuted }]}> /day</Text>
              </Text>
            </View>
          </View>

          {/* Tab Bar */}
          <View style={[s.tabs, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
            {([
              { key: 'info', label: 'Details' },
              ...(hasSpecs ? [{ key: 'specs', label: 'Specs' }] : []),
              { key: 'calendar', label: 'Availability' },
            ] as { key: 'info' | 'specs' | 'calendar'; label: string }[]).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[s.tab, activeTab === tab.key && { backgroundColor: colors.primary }]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[s.tabText, { color: activeTab === tab.key ? '#fff' : colors.textMuted }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          {activeTab === 'info' && (
            <View style={s.tabContent}>
              <Text style={[s.descHeading, { color: colors.textMuted }]}>About this equipment</Text>
              <Text style={[s.desc, { color: colors.textSecondary }]}>{equipment.description}</Text>
            </View>
          )}

          {activeTab === 'specs' && hasSpecs && (
            <View style={[s.specsCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              {Object.entries(equipment.specs).map(([key, val], i, arr) => (
                <View
                  key={key}
                  style={[
                    s.specRow,
                    i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <Text style={[s.specKey, { color: colors.textMuted }]}>{key}</Text>
                  <Text style={[s.specVal, { color: colors.text }]}>{val as string}</Text>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'calendar' && (
            <View style={s.tabContent}>
              <AvailabilityCalendar
                equipmentId={equipment.id}
                totalQuantity={equipment.total_quantity}
              />
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={[s.cta, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View>
          <Text style={[s.ctaFrom, { color: colors.textMuted }]}>Starting from</Text>
          <Text style={[s.ctaPrice, { color: colors.primary }]}>
            {formatCurrency(equipment.daily_rate)}<Text style={{ fontSize: 13, fontWeight: '400', color: colors.textMuted }}>/day</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={[
            s.rentBtn,
            { backgroundColor: isAvailable ? colors.primary : colors.border },
          ]}
          disabled={!isAvailable}
          onPress={() => navigation.navigate('RentalForm', { equipmentId: equipment.id })}
          activeOpacity={0.88}
        >
          <MaterialIcons
            name={isAvailable ? 'calendar-today' : 'block'}
            size={18}
            color={isAvailable ? '#fff' : colors.textMuted}
          />
          <Text style={[s.rentBtnText, { color: isAvailable ? '#fff' : colors.textMuted }]}>
            {isAvailable ? 'Rent Now' : 'Unavailable'}
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

const s = StyleSheet.create({
  safe: { flex: 1 },
  imageContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  availPill: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  availDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  availText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  panel: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginTop: -12,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
    minHeight: 500,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  catTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  catTagText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  condTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  condTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 30,
    marginBottom: 14,
  },
  priceRow: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0,
  },
  priceUnit: {
    fontSize: 15,
    fontWeight: '400',
  },
  rateGrid: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
  },
  rateItem: {
    flex: 1,
  },
  rateLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  rateVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  rateDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 14,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabContent: {
    marginBottom: 16,
  },
  descHeading: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  desc: {
    fontSize: 15,
    lineHeight: 24,
  },
  specsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  specKey: {
    fontSize: 14,
    fontWeight: '500',
  },
  specVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  cta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  ctaLeft: {},
  ctaFrom: {
    fontSize: 12,
    marginBottom: 2,
  },
  ctaPrice: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0,
  },
  ctaPriceUnit: {
    fontSize: 14,
    fontWeight: '400',
  },
  rentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 8,
    gap: 8,
  },
  rentBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default EquipmentDetail;
