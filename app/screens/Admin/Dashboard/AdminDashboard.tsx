import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../../../src/lib/supabase';
import useAuth from '../../../../src/hooks/useAuth';
import useTheme from '../../../../src/hooks/useTheme';
import NotificationBell from '../../../../src/components/NotificationBell/NotificationBell';
import { Rental, AdminStackParamList } from '../../../../src/types';
import { formatCurrency, formatDate, getInitials } from '../../../../src/utils/format';
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
    const [eqRes, rentalsRes, recentRes, custRes] = await Promise.all([
      supabase.from('equipment').select('total_quantity, available_quantity, is_active, needs_maintenance'),
      supabase.from('rentals').select('status, total_cost'),
      supabase.from('rentals').select('*, equipment(name, image_url), customer:profiles(full_name)').order('created_at', { ascending: false }).limit(10),
      supabase.from('profiles').select('id').eq('role', 'customer'),
    ]);

    const equipment = eqRes.data ?? [];
    const allRentals = (rentalsRes.data ?? []) as Pick<Rental, 'status' | 'total_cost'>[];
    const recent = (recentRes.data ?? []) as Rental[];

    const revenue = allRentals
      .filter((r) => ['active', 'returned', 'approved'].includes(r.status))
      .reduce((sum, r) => sum + r.total_cost, 0);

    setStats({
      totalEquipment: equipment.filter((e: any) => e.is_active).length,
      maintenanceCount: equipment.filter((e: any) => e.needs_maintenance).length,
      availableUnits: equipment.reduce((s: number, e: any) => s + (e.available_quantity || 0), 0),
      activeRentals: allRentals.filter((r) => r.status === 'active').length,
      pendingRequests: allRentals.filter((r) => r.status === 'pending').length,
      totalRevenue: revenue,
      totalCustomers: custRes.data?.length ?? 0,
    });
    setRecentRentals(recent.slice(0, 6));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  if (loading) return <LoadingSpinner message="Loading..." />;

  const KPI_ITEMS = [
    { label: 'Equipment', value: stats.totalEquipment, icon: 'construction' as const, color: colors.primary },
    { label: 'Available', value: stats.availableUnits, icon: 'check-circle' as const, color: colors.success },
    { label: 'Active', value: stats.activeRentals, icon: 'play-circle-filled' as const, color: colors.accent },
    { label: 'Pending', value: stats.pendingRequests, icon: 'pending' as const, color: colors.warning },
    { label: 'Customers', value: stats.totalCustomers, icon: 'people' as const, color: colors.info },
    { label: 'Revenue', value: formatCurrency(stats.totalRevenue), icon: 'payments' as const, color: colors.success },
  ];

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <LinearGradient colors={['#0F172A', '#1A2744']} style={AdminDashboardStyle.header}>
          <View style={AdminDashboardStyle.headerTop}>
            <View>
              <Text style={AdminDashboardStyle.greeting}>Admin Panel</Text>
              <Text style={AdminDashboardStyle.userName}>{user?.full_name}</Text>
            </View>
            <View style={[AdminDashboardStyle.adminBadge, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="admin-panel-settings" size={20} color="#FFF" />
            </View>
          </View>

          {/* Pending Alert Banner */}
          {stats.pendingRequests > 0 && (
            <TouchableOpacity
              style={AdminDashboardStyle.alertBanner}
              onPress={() => navigation.navigate('AdminTabs')}
            >
              <View style={s.alertIconWrap}>
                <MaterialIcons name="notification-important" size={18} color="#fff" />
              </View>
              <Text style={s.alertText}>
                {stats.pendingRequests} request{stats.pendingRequests > 1 ? 's' : ''} awaiting review
              </Text>
              <MaterialIcons name="arrow-forward-ios" size={13} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* ── KPI Grid ── */}
        <View style={s.kpiSection}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Overview</Text>
          <View style={s.kpiGrid}>
            {KPI_ITEMS.map((k) => (
              <View key={k.label} style={[s.kpiCard, { backgroundColor: colors.card, shadowColor: '#000' }]}>
                <View style={[s.kpiIcon, { backgroundColor: `${k.color}18` }]}>
                  <MaterialIcons name={k.icon} size={22} color={k.color} />
                </View>
                <Text style={[s.kpiValue, { color: colors.text }]}>{k.value}</Text>
                <Text style={[s.kpiLabel, { color: colors.textMuted }]}>{k.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick actions */}
        <View style={AdminDashboardStyle.section}>
          <Text style={[AdminDashboardStyle.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={AdminDashboardStyle.actionsGrid}>
            {[
              { label: 'Add Equipment', icon: 'add-box', action: () => navigation.navigate('EquipmentForm', {}) },
              { label: 'View Requests', icon: 'assignment', action: () => navigation.navigate('AdminTabs') },
              { label: 'Manage Users', icon: 'manage-accounts', action: () => navigation.navigate('AdminTabs') },
              { label: 'Analytics', icon: 'bar-chart', action: () => navigation.navigate('AdminTabs') },
            ].map((a) => (
              <TouchableOpacity
                key={a.label}
                style={[AdminDashboardStyle.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={a.action}
                activeOpacity={0.8}
              >
                <MaterialIcons name={a.icon as keyof typeof MaterialIcons.glyphMap} size={26} color={colors.primary} />
                <Text style={[AdminDashboardStyle.actionLabel, { color: colors.text }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Recent Requests ── */}
        <View style={[s.section, { paddingBottom: 32 }]}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Requests</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AdminTabs', { screen: 'RentalRequests' })}>
              <Text style={[s.seeAll, { color: colors.primary }]}>View all</Text>
            </TouchableOpacity>
          </View>
          {recentRentals.map((r) => {
            const customer = (r as unknown as { customer: { full_name: string } }).customer;
            return (
              <TouchableOpacity
                key={r.id}
                style={[s.rentalCard, { backgroundColor: colors.card, shadowColor: '#000' }]}
                onPress={() => navigation.navigate('RentalDetail', { rentalId: r.id })}
                activeOpacity={0.88}
              >
                <View style={[s.rentalStatusBar, { backgroundColor: STATUS_COLOR[r.status] ?? colors.textMuted }]} />
                <View style={s.rentalBody}>
                  <View style={s.rentalTop}>
                    <View style={s.rentalInfo}>
                      <Text style={[s.rentalEquip, { color: colors.text }]} numberOfLines={1}>
                        {r.equipment?.name ?? 'Equipment'}
                      </Text>
                      <Text style={[s.rentalCustomer, { color: colors.textMuted }]}>
                        {customer?.full_name ?? 'Customer'} | {formatDate(r.start_date)}
                      </Text>
                    </View>
                    <View style={s.rentalRight}>
                      <Text style={[s.rentalCost, { color: colors.primary }]}>{formatCurrency(r.total_cost)}</Text>
                      <StatusBadge status={r.status} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const STATUS_COLOR: Record<string, string> = {
  pending: '#D97706',
  approved: '#0284C7',
  active: '#16A34A',
  returned: '#64748B',
  rejected: '#DC2626',
  cancelled: '#94A3B8',
};

const s = StyleSheet.create({
  safe: { flex: 1 },
  hero: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLeft: { flex: 1 },
  heroRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  adminLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600', letterSpacing: 0.8 },
  heroName: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0, marginTop: 2 },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  notifCount: { fontSize: 9, color: '#fff', fontWeight: '800' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217,119,6,0.25)',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.4)',
  },
  alertIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(217,119,6,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertText: { flex: 1, fontSize: 13, color: '#fff', fontWeight: '600' },
  kpiSection: { paddingHorizontal: 16, paddingTop: 22 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: 0, marginBottom: 14 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  seeAll: { fontSize: 13, fontWeight: '600' },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '31%',
    borderRadius: 18,
    padding: 14,
    alignItems: 'flex-start',
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    minWidth: 100,
    flexGrow: 1,
  },
  kpiIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: { fontSize: 20, fontWeight: '800', letterSpacing: 0 },
  kpiLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  section: { paddingHorizontal: 16, paddingTop: 22 },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '47%',
    borderRadius: 18,
    padding: 16,
    alignItems: 'flex-start',
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    flexGrow: 1,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0 },
  rentalCard: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  rentalStatusBar: { width: 4 },
  rentalBody: { flex: 1, padding: 14 },
  rentalTop: { flexDirection: 'row', gap: 10 },
  rentalInfo: { flex: 1, gap: 3 },
  rentalEquip: { fontSize: 14, fontWeight: '700', letterSpacing: 0 },
  rentalCustomer: { fontSize: 12 },
  rentalRight: { alignItems: 'flex-end', gap: 5 },
  rentalCost: { fontSize: 14, fontWeight: '800' },
});

export default AdminDashboard;
