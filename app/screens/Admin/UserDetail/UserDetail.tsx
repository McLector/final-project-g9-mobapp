import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../../../../src/lib/supabase';
import useTheme from '../../../../src/hooks/useTheme';
import { useToast } from '../../../../src/hooks/useToast';
import { AppUser, Rental, AdminStackParamList } from '../../../../src/types';
import { formatCurrency, formatDate, getInitials } from '../../../../src/utils/format';
import StatusBadge from '../../../../src/components/StatusBadge/StatusBadge';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';
import UserDetailStyle from './UserDetailStyle';

type Props = {
  navigation: NativeStackNavigationProp<AdminStackParamList, 'UserDetail'>;
  route: RouteProp<AdminStackParamList, 'UserDetail'>;
};

const UserDetail = ({ navigation, route }: Props) => {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const { userId } = route.params;

  const [user, setUser] = useState<AppUser | null>(null);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    const [userRes, rentalsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase
        .from('rentals')
        .select('*, equipment(name, category, image_url)')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false }),
    ]);
    if (userRes.data) setUser(userRes.data as AppUser);
    if (rentalsRes.data) setRentals(rentalsRes.data as Rental[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleToggleActive = async () => {
    if (!user) return;
    Alert.alert(
      user.is_active ? 'Deactivate Account' : 'Activate Account',
      `${user.is_active ? 'Deactivate' : 'Activate'} "${user.full_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setActionLoading(true);
            const { error } = await supabase
              .from('profiles')
              .update({ is_active: !user.is_active })
              .eq('id', user.id);
            if (error) {
              showError(error.message);
            } else {
              showSuccess(user.is_active ? 'Account deactivated' : 'Account activated');
              load();
            }
            setActionLoading(false);
          },
        },
      ]
    );
  };

  const handleToggleRole = async () => {
    if (!user) return;
    const newRole = user.role === 'admin' ? 'customer' : 'admin';
    Alert.alert('Change Role', `Make "${user.full_name}" a ${newRole}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setActionLoading(true);
          const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', user.id);
          if (error) {
            showError(error.message);
          } else {
            showSuccess(`Role changed to ${newRole}`);
            load();
          }
          setActionLoading(false);
        },
      },
    ]);
  };

  if (loading || !user) return <LoadingSpinner message="Loading user..." />;

  // Stats
  const totalSpend = rentals
    .filter((r) => r.status === 'returned')
    .reduce((s, r) => s + r.total_cost, 0);
  const activeCount = rentals.filter((r) => r.status === 'active').length;
  const completedCount = rentals.filter((r) => r.status === 'returned').length;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[UserDetailStyle.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[UserDetailStyle.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={UserDetailStyle.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[UserDetailStyle.headerTitle, { color: colors.text }]}>User Profile</Text>
        <View style={{ width: 30 }} />
      </View>

      <FlatList
        data={rentals}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={UserDetailStyle.listContent}
        ListHeaderComponent={
          <>
            {/* Hero */}
            <LinearGradient colors={['#0F172A', '#1A2744']} style={UserDetailStyle.hero}>
              <View style={[UserDetailStyle.avatar, { backgroundColor: user.role === 'admin' ? colors.primary : colors.accent }]}>
                <Text style={UserDetailStyle.avatarText}>{getInitials(user.full_name)}</Text>
              </View>
              <Text style={UserDetailStyle.heroName}>{user.full_name}</Text>
              <Text style={UserDetailStyle.heroEmail}>{user.email}</Text>
              <View style={UserDetailStyle.pillRow}>
                <View style={[UserDetailStyle.pill, { backgroundColor: user.role === 'admin' ? 'rgba(249,115,22,0.3)' : 'rgba(96,165,250,0.2)' }]}>
                  <Text style={UserDetailStyle.pillText}>{user.role}</Text>
                </View>
                <View style={[UserDetailStyle.pill, { backgroundColor: user.is_active ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }]}>
                  <Text style={[UserDetailStyle.pillText, { color: user.is_active ? '#4ADE80' : '#F87171' }]}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Stats row */}
            <View style={UserDetailStyle.statsRow}>
              {[
                { label: 'Total Spend', value: formatCurrency(totalSpend), icon: 'payments', color: colors.success },
                { label: 'Active', value: String(activeCount), icon: 'play-circle-filled', color: colors.accent },
                { label: 'Completed', value: String(completedCount), icon: 'check-circle', color: colors.info },
                { label: 'Total', value: String(rentals.length), icon: 'history', color: colors.primary },
              ].map((s) => (
                <View key={s.label} style={[UserDetailStyle.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <MaterialIcons name={s.icon as keyof typeof MaterialIcons.glyphMap} size={18} color={s.color} />
                  <Text style={[UserDetailStyle.statValue, { color: colors.text }]}>{s.value}</Text>
                  <Text style={[UserDetailStyle.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* User info */}
            <View style={[UserDetailStyle.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[UserDetailStyle.cardTitle, { color: colors.text }]}>Account Details</Text>
              {[
                { label: 'Phone', value: user.phone },
                { label: 'Email', value: user.email },
                { label: 'Role', value: user.role },
                { label: 'Joined', value: formatDate(user.created_at) },
              ].map((row) => (
                <View key={row.label} style={[UserDetailStyle.row, { borderBottomColor: colors.border }]}>
                  <Text style={[UserDetailStyle.rowLabel, { color: colors.textMuted }]}>{row.label}</Text>
                  <Text style={[UserDetailStyle.rowValue, { color: colors.text }]}>{row.value}</Text>
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={UserDetailStyle.actionsRow}>
              <TouchableOpacity
                style={[UserDetailStyle.actionBtn, { backgroundColor: user.is_active ? colors.warningLight : colors.successLight, borderColor: user.is_active ? colors.warning : colors.success }]}
                onPress={handleToggleActive}
                disabled={actionLoading}
              >
                {actionLoading ? <ActivityIndicator size="small" color={colors.text} /> : (
                  <>
                    <MaterialIcons
                      name={user.is_active ? 'block' : 'check-circle'}
                      size={16}
                      color={user.is_active ? colors.warning : colors.success}
                    />
                    <Text style={[UserDetailStyle.actionBtnText, { color: user.is_active ? colors.warning : colors.success }]}>
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[UserDetailStyle.actionBtn, { backgroundColor: colors.infoLight, borderColor: colors.info }]}
                onPress={handleToggleRole}
                disabled={actionLoading}
              >
                <MaterialIcons name="swap-horiz" size={16} color={colors.info} />
                <Text style={[UserDetailStyle.actionBtnText, { color: colors.info }]}>
                  Make {user.role === 'admin' ? 'Customer' : 'Admin'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Rental history header */}
            <View style={UserDetailStyle.sectionHeader}>
              <Text style={[UserDetailStyle.sectionTitle, { color: colors.text }]}>Rental History</Text>
              <Text style={[UserDetailStyle.sectionCount, { color: colors.textMuted }]}>{rentals.length} total</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[UserDetailStyle.rentalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('RentalDetail', { rentalId: item.id })}
            activeOpacity={0.85}
          >
            <View style={UserDetailStyle.rentalTop}>
              <View style={UserDetailStyle.rentalInfo}>
                <Text style={[UserDetailStyle.rentalEquip, { color: colors.text }]} numberOfLines={1}>
                  {item.equipment?.name ?? 'Equipment'}
                </Text>
                <Text style={[UserDetailStyle.rentalDates, { color: colors.textMuted }]}>
                  {formatDate(item.start_date)} → {formatDate(item.end_date)}
                </Text>
                <Text style={[UserDetailStyle.rentalMeta, { color: colors.textMuted }]}>
                  Qty: {item.quantity} · {item.duration_type}
                </Text>
              </View>
              <View style={UserDetailStyle.rentalRight}>
                <StatusBadge status={item.status} />
                <Text style={[UserDetailStyle.rentalCost, { color: colors.primary }]}>
                  {formatCurrency(item.total_cost)}
                </Text>
                <MaterialIcons name="chevron-right" size={16} color={colors.textMuted} />
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={[UserDetailStyle.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialIcons name="receipt-long" size={32} color={colors.textMuted} />
            <Text style={[UserDetailStyle.emptyText, { color: colors.textMuted }]}>No rental history</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default UserDetail;
