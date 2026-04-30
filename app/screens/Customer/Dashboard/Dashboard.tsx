import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl, ScrollView, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../../../src/lib/supabase';
import useAuth from '../../../../src/hooks/useAuth';
import useTheme from '../../../../src/hooks/useTheme';
import useRentalNotifications from '../../../../src/hooks/useRentalNotifications';
import NotificationBell from '../../../../src/components/NotificationBell/NotificationBell';
import { Rental, CustomerStackParamList } from '../../../../src/types';
import { formatCurrency, formatDate } from '../../../../src/utils/format';
import StatusBadge from '../../../../src/components/StatusBadge/StatusBadge';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';
import DashboardStyle from './DashboardStyle';

type Props = { navigation: NativeStackNavigationProp<CustomerStackParamList> };

const CustomerDashboard = ({ navigation }: Props) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  useRentalNotifications();

  const [recentRentals, setRecentRentals] = useState<Rental[]>([]);
  const [stats, setStats] = useState({ active: 0, pending: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('rentals')
      .select('*, equipment(*)')
      .eq('customer_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) {
      const rentals = data as Rental[];
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

  const quickActions = [
    {
      label: 'Browse\nEquipment',
      icon: 'category',
      color: colors.primary,
      bgColor: colors.primaryLight,
      action: () => navigation.navigate('CustomerTabsRoot', { screen: 'Catalog' } as never),
    },
    {
      label: 'My\nRentals',
      icon: 'receipt-long',
      color: colors.accent,
      bgColor: `${colors.accent}20`,
      action: () => navigation.navigate('CustomerTabsRoot', { screen: 'MyRentals' } as never),
    },
    {
      label: 'Saved\nItems',
      icon: 'favorite',
      color: '#E11D48',
      bgColor: '#FFF1F2',
      action: () => navigation.navigate('Favorites'),
    },
    {
      label: 'Rental\nHistory',
      icon: 'history',
      color: colors.success,
      bgColor: colors.successLight,
      action: () => navigation.navigate('RentalHistory'),
    },
  ];

  return (
    <SafeAreaView edges={['top']} style={[DashboardStyle.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <LinearGradient colors={['#0F172A', '#1E3A5F']} style={DashboardStyle.header}>
          <View style={DashboardStyle.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={DashboardStyle.greeting}>{greeting()},</Text>
              <Text style={DashboardStyle.userName}>{user?.full_name ?? 'Customer'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <NotificationBell onPress={() => navigation.navigate('NotificationCenter')} />
              <View style={[DashboardStyle.avatar, { backgroundColor: colors.primary }]}>
                <Text style={DashboardStyle.avatarText}>
                  {(user?.full_name ?? 'U').substring(0, 1).toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <View style={DashboardStyle.statsRow}>
            {[
              { label: 'Active', value: stats.active, icon: 'play-circle-filled', color: colors.success },
              { label: 'Pending', value: stats.pending, icon: 'pending', color: colors.warning },
              { label: 'Total', value: stats.total, icon: 'history', color: colors.accent },
            ].map(s => (
              <View key={s.label} style={[DashboardStyle.statCard, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                <MaterialIcons name={s.icon as keyof typeof MaterialIcons.glyphMap} size={22} color={s.color} />
                <Text style={DashboardStyle.statValue}>{s.value}</Text>
                <Text style={DashboardStyle.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Quick actions - 2x2 grid */}
        <View style={DashboardStyle.section}>
          <Text style={[DashboardStyle.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={DashboardStyle.actionsGrid}>
            {quickActions.map(a => (
              <TouchableOpacity
                key={a.label}
                style={[DashboardStyle.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={a.action}
                activeOpacity={0.8}
              >
                <View style={[DashboardStyle.actionIcon, { backgroundColor: a.bgColor }]}>
                  <MaterialIcons name={a.icon as keyof typeof MaterialIcons.glyphMap} size={24} color={a.color} />
                </View>
                <Text style={[DashboardStyle.actionLabel, { color: colors.text }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent rentals */}
        <View style={DashboardStyle.section}>
          <Text style={[DashboardStyle.sectionTitle, { color: colors.text }]}>Recent Rentals</Text>
          {recentRentals.length === 0 ? (
            <View style={[DashboardStyle.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MaterialIcons name="receipt-long" size={36} color={colors.textMuted} />
              <Text style={[DashboardStyle.emptyTitle, { color: colors.text }]}>No rentals yet</Text>
              <Text style={[DashboardStyle.emptySubtitle, { color: colors.textMuted }]}>
                Browse equipment and submit your first rental request
              </Text>
              <TouchableOpacity
                style={[DashboardStyle.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('CustomerTabsRoot', { screen: 'Catalog' } as never)}
              >
                <Text style={DashboardStyle.emptyBtnText}>Browse Equipment</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentRentals.map(r => (
              <TouchableOpacity
                key={r.id}
                style={[DashboardStyle.rentalRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('CustomerRentalDetail', { rentalId: r.id })}
                activeOpacity={0.85}
              >
                <View style={DashboardStyle.rentalInfo}>
                  <Text style={[DashboardStyle.rentalName, { color: colors.text }]} numberOfLines={1}>
                    {r.equipment?.name ?? 'Equipment'}
                  </Text>
                  <Text style={[DashboardStyle.rentalDate, { color: colors.textMuted }]}>
                    {formatDate(r.start_date)} → {formatDate(r.end_date)}
                  </Text>
                </View>
                <View style={DashboardStyle.rentalRight}>
                  <Text style={[DashboardStyle.rentalCost, { color: colors.primary }]}>
                    {formatCurrency(r.total_cost)}
                  </Text>
                  <StatusBadge status={r.status} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default CustomerDashboard;
