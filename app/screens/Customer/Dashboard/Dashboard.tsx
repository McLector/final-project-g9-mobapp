import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
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
import { supabase } from '../../../../src/lib/supabase';
import useAuth from '../../../../src/hooks/useAuth';
import useTheme from '../../../../src/hooks/useTheme';
import { Equipment, Rental, CustomerStackParamList } from '../../../../src/types';
import { formatCurrency, formatDate } from '../../../../src/utils/format';
import EquipmentCard from '../../../../src/components/EquipmentCard/EquipmentCard';
import StatusBadge from '../../../../src/components/StatusBadge/StatusBadge';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';

type Props = { navigation: NativeStackNavigationProp<CustomerStackParamList> };

const CustomerDashboard = ({ navigation }: Props) => {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [featuredEquipment, setFeaturedEquipment] = useState<Equipment[]>([]);
  const [recentRentals, setRecentRentals] = useState<Rental[]>([]);
  const [stats, setStats] = useState({ active: 0, pending: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [eqRes, rnRes] = await Promise.all([
      supabase
        .from('equipment')
        .select('*')
        .eq('is_active', true)
        .gt('available_quantity', 0)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('rentals')
        .select('*, equipment(*)')
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    if (eqRes.data) setFeaturedEquipment(eqRes.data as Equipment[]);
    if (rnRes.data) {
      const rentals = rnRes.data as Rental[];
      setRecentRentals(rentals);
      setStats({
        active: rentals.filter(r => r.status === 'active').length,
        pending: rentals.filter(r => r.status === 'pending').length,
        total: rentals.length,
      });
    }
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  if (loading) return <LoadingSpinner message="Loading..." />;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <LinearGradient colors={['#0F172A', '#1E3A5F']} style={s.hero}>
          <View style={s.heroTop}>
            <View style={s.heroLeft}>
              <Text style={s.greeting}>{greeting()},</Text>
              <Text style={s.heroName}>{user?.full_name ?? 'Customer'}</Text>
            </View>
            <View style={[s.avatar, { backgroundColor: colors.primary }]}>
              <Text style={s.avatarText}>
                {(user?.full_name ?? 'U').substring(0, 1).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Stat cards */}
          <View style={s.statsRow}>
            {[
              { label: 'Active', value: stats.active, icon: 'play-circle-filled', color: colors.success },
              { label: 'Pending', value: stats.pending, icon: 'pending', color: colors.warning },
              { label: 'Total', value: stats.total, icon: 'history', color: colors.accent },
            ].map((stat) => (
              <View key={stat.label} style={s.statChip}>
                <MaterialIcons name={stat.icon as keyof typeof MaterialIcons.glyphMap} size={22} color={stat.color} />
                <Text style={s.statVal}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Quick actions */}
        <View style={[s.section, { paddingTop: 18 }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={s.actionsRow}>
            {[
              { label: 'Browse\nEquipment', icon: 'category', screen: 'Catalog' },
              { label: 'My\nRentals', icon: 'receipt-long', screen: 'MyRentals' },
            ].map((a) => (
              <TouchableOpacity
                key={a.label}
                style={[s.actionCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                onPress={() => (navigation as any).navigate(a.screen)}
                activeOpacity={0.8}
              >
                <View style={[s.actionIconWrap, { backgroundColor: colors.primaryLight }]}>
                  <MaterialIcons name={a.icon as keyof typeof MaterialIcons.glyphMap} size={24} color={colors.primary} />
                </View>
                <Text style={[s.actionLabel, { color: colors.text }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured equipment */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Available Equipment</Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('Catalog')}>
              <Text style={[s.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {featuredEquipment.slice(0, 3).map((eq) => (
            <EquipmentCard
              key={eq.id}
              item={eq}
              onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: eq.id })}
            />
          ))}
        </View>

        {/* Recent rentals */}
        {recentRentals.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Rentals</Text>
            {recentRentals.map((r) => (
              <View key={r.id} style={[s.rentalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={s.rentalInfo}>
                  <Text style={[s.rentalName, { color: colors.text }]} numberOfLines={1}>
                    {r.equipment?.name ?? 'Equipment'}
                  </Text>
                  <Text style={[s.rentalDate, { color: colors.textMuted }]}>
                    {formatDate(r.start_date)} → {formatDate(r.end_date)}
                  </Text>
                </View>
                <View style={s.rentalRight}>
                  <Text style={[s.rentalCost, { color: colors.primary }]}>
                    {formatCurrency(r.total_cost)}
                  </Text>
                  <StatusBadge status={r.status} />
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 22,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  heroLeft: { flex: 1 },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    marginBottom: 2,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  statVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0,
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  actionCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  rentalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  rentalInfo: { flex: 1, gap: 4 },
  rentalName: { fontSize: 15, fontWeight: '700' },
  rentalDate: { fontSize: 12 },
  rentalRight: { alignItems: 'flex-end', gap: 6 },
  rentalCost: { fontSize: 15, fontWeight: '800' },
});

export default CustomerDashboard;
