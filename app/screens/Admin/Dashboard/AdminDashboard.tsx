import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../../../src/lib/supabase';
import useAuth from '../../../../src/hooks/useAuth';
import useTheme from '../../../../src/hooks/useTheme';
import NotificationBell from '../../../../src/components/NotificationBell/NotificationBell';
import { Rental, AdminStackParamList } from '../../../../src/types';
import { formatCurrency, formatDate } from '../../../../src/utils/format';
import StatusBadge from '../../../../src/components/StatusBadge/StatusBadge';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';
import AdminDashboardStyle from './AdminDashboardStyle';

type Props = { navigation: NativeStackNavigationProp<AdminStackParamList> };

interface DashStats {
  totalEquipment: number;
  activeRentals: number;
  pendingRequests: number;
  totalRevenue: number;
  availableUnits: number;
  totalCustomers: number;
  maintenanceCount: number;
}

const AdminDashboard = ({ navigation }: Props) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [stats, setStats] = useState<DashStats>({
    totalEquipment: 0, activeRentals: 0, pendingRequests: 0,
    totalRevenue: 0, availableUnits: 0, totalCustomers: 0, maintenanceCount: 0,
  });
  const [recentRentals, setRecentRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [eqRes, rnRes, custRes] = await Promise.all([
      supabase.from('equipment').select('total_quantity, available_quantity, is_active'),
      supabase.from('rentals').select('*, equipment(name, image_url), customer:profiles(full_name)').order('created_at', { ascending: false }).limit(10),
      supabase.from('profiles').select('id').eq('role', 'customer'),
    ]);

    const equipment = eqRes.data ?? [];
    const allRentals = (rnRes.data ?? []) as Rental[];

    const revenue = allRentals
      .filter((r) => ['active', 'returned', 'approved'].includes(r.status))
      .reduce((sum, r) => sum + r.total_cost, 0);

    setStats({
      totalEquipment: equipment.filter((e: { is_active: boolean }) => e.is_active).length,
      maintenanceCount: equipment.filter((e: { needs_maintenance: boolean }) => e.needs_maintenance).length,
      availableUnits: equipment.reduce((s: number, e: { available_quantity: number }) => s + e.available_quantity, 0),
      activeRentals: allRentals.filter((r) => r.status === 'active').length,
      pendingRequests: allRentals.filter((r) => r.status === 'pending').length,
      totalRevenue: revenue,
      totalCustomers: custRes.data?.length ?? 0,
    });
    setRecentRentals(allRentals.slice(0, 6));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  if (loading) return <LoadingSpinner message="Loading..." />;

  const statCards = [
    { label: 'Equipment', value: stats.totalEquipment, icon: 'construction', color: colors.primary },
    { label: 'Available', value: stats.availableUnits, icon: 'check-circle', color: colors.success },
    { label: 'Active', value: stats.activeRentals, icon: 'play-circle-filled', color: colors.accent },
    { label: 'Pending', value: stats.pendingRequests, icon: 'pending', color: colors.warning },
    { label: 'Customers', value: stats.totalCustomers, icon: 'people', color: colors.info },
    { label: 'Revenue', value: formatCurrency(stats.totalRevenue), icon: 'payments', color: colors.success },
    { label: 'Maintenance', value: stats.maintenanceCount, icon: 'build', color: stats.maintenanceCount > 0 ? colors.warning : colors.textMuted },
  ];

  return (
    <SafeAreaView edges={['top']} style={[AdminDashboardStyle.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <LinearGradient colors={['#0F172A', '#1A2744']} style={AdminDashboardStyle.header}>
          <View style={AdminDashboardStyle.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={AdminDashboardStyle.greeting}>Admin Panel</Text>
              <Text style={AdminDashboardStyle.userName}>{user?.full_name}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <NotificationBell onPress={() => navigation.navigate('NotificationCenter')} />
              <View style={[AdminDashboardStyle.adminBadge, { backgroundColor: colors.primary }]}>
                <MaterialIcons name="admin-panel-settings" size={20} color="#FFF" />
              </View>
            </View>
          </View>

          {stats.pendingRequests > 0 && (
            <TouchableOpacity
              style={AdminDashboardStyle.alertBanner}
              onPress={() => navigation.navigate('AdminTabs', { screen: 'RentalRequests' } as never)}
            >
              <MaterialIcons name="notification-important" size={18} color="#FFF" />
              <Text style={AdminDashboardStyle.alertText}>
                {stats.pendingRequests} pending rental request{stats.pendingRequests > 1 ? 's' : ''} awaiting review
              </Text>
              <MaterialIcons name="chevron-right" size={18} color="#FFF" />
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* Stats grid */}
        <View style={AdminDashboardStyle.statsGrid}>
          {statCards.map((s) => (
            <View key={s.label} style={[AdminDashboardStyle.statCard, { backgroundColor: colors.card, shadowColor: colors.shadow, borderColor: colors.border }]}>
              <View style={[AdminDashboardStyle.statIcon, { backgroundColor: `${s.color}20` }]}>
                <MaterialIcons name={s.icon as keyof typeof MaterialIcons.glyphMap} size={22} color={s.color} />
              </View>
              <Text style={[AdminDashboardStyle.statValue, { color: colors.text }]}>{s.value}</Text>
              <Text style={[AdminDashboardStyle.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>



        {/* Recent rentals */}
        <View style={AdminDashboardStyle.section}>
          <Text style={[AdminDashboardStyle.sectionTitle, { color: colors.text }]}>Recent Requests</Text>
          {recentRentals.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[AdminDashboardStyle.rentalRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('RentalDetail', { rentalId: r.id })}
              activeOpacity={0.8}
            >
              <View style={AdminDashboardStyle.rentalInfo}>
                <Text style={[AdminDashboardStyle.rentalEquip, { color: colors.text }]} numberOfLines={1}>
                  {r.equipment?.name ?? 'Equipment'}
                </Text>
                <Text style={[AdminDashboardStyle.rentalCustomer, { color: colors.textMuted }]}>
                  {(r as unknown as { customer: { full_name: string } }).customer?.full_name ?? 'Customer'} · {formatDate(r.start_date)}
                </Text>
              </View>
              <View style={AdminDashboardStyle.rentalRight}>
                <StatusBadge status={r.status} />
                <Text style={[AdminDashboardStyle.rentalCost, { color: colors.primary }]}>
                  {formatCurrency(r.total_cost)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminDashboard;
