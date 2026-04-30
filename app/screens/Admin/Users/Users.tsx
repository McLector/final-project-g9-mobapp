import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../../src/lib/supabase';
import useTheme from '../../../../src/hooks/useTheme';
import { AppUser, AdminStackParamList } from '../../../../src/types';
import { formatDate, getInitials } from '../../../../src/utils/format';
import EmptyState from '../../../../src/components/EmptyState/EmptyState';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';
import UsersStyle from './UsersStyle';

type Props = { navigation: NativeStackNavigationProp<AdminStackParamList> };

const Users = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [filter, setFilter] = useState<'all' | 'customer' | 'admin'>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data as AppUser[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const filtered = users.filter((u) => {
    const matchesFilter = filter === 'all' || u.role === filter;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone ?? '').includes(q);
    return matchesFilter && matchesSearch;
  });

  const handleToggleActive = async (user: AppUser) => {
    Alert.alert(
      user.is_active ? 'Deactivate User' : 'Activate User',
      `${user.is_active ? 'Deactivate' : 'Activate'} account for "${user.full_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id);
            setSelected(null);
            load();
          },
        },
      ]
    );
  };

  const handleToggleRole = async (user: AppUser) => {
    const newRole = user.role === 'admin' ? 'customer' : 'admin';
    Alert.alert('Change Role', `Make "${user.full_name}" a ${newRole}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
          setSelected(null);
          load();
        },
      },
    ]);
  };

  if (loading) return <LoadingSpinner message="Loading users..." />;

  return (
    <SafeAreaView edges={['top']} style={[UsersStyle.safe, { backgroundColor: colors.background }]}>
      <View style={[UsersStyle.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[UsersStyle.title, { color: colors.text }]}>Users</Text>
        <Text style={[UsersStyle.subtitle, { color: colors.textMuted }]}>{filtered.length} {filter === 'all' ? 'total' : filter}s</Text>
      </View>

      {/* Search */}
      <View style={[UsersStyle.searchRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[UsersStyle.searchWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <MaterialIcons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[UsersStyle.searchInput, { color: colors.text }]}
            placeholder="Search by name, email, or phone..."
            placeholderTextColor={colors.placeholder}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialIcons name="close" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={UsersStyle.filterScroll} style={[UsersStyle.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['all', 'customer', 'admin'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[UsersStyle.filterChip, filter === f ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[UsersStyle.filterText, { color: filter === f ? '#FFF' : colors.textSecondary }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={UsersStyle.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[UsersStyle.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow, opacity: item.is_active ? 1 : 0.6 }]}
            onPress={() => navigation.navigate('UserDetail', { userId: item.id })}
            activeOpacity={0.85}
          >
            <View style={[UsersStyle.avatar, { backgroundColor: item.role === 'admin' ? colors.primary : colors.accent }]}>
              <Text style={UsersStyle.avatarText}>{getInitials(item.full_name)}</Text>
            </View>
            <View style={UsersStyle.info}>
              <Text style={[UsersStyle.name, { color: colors.text }]}>{item.full_name}</Text>
              <Text style={[UsersStyle.email, { color: colors.textMuted }]}>{item.email}</Text>
              <Text style={[UsersStyle.phone, { color: colors.textMuted }]}>{item.phone}</Text>
            </View>
            <View style={UsersStyle.right}>
              <View style={[UsersStyle.roleBadge, { backgroundColor: item.role === 'admin' ? colors.primaryLight : colors.infoLight }]}>
                <Text style={[UsersStyle.roleText, { color: item.role === 'admin' ? colors.primary : colors.accent }]}>{item.role}</Text>
              </View>
              {!item.is_active && (
                <Text style={[UsersStyle.inactive, { color: colors.danger }]}>Inactive</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState icon="people" title="No users found" />}
      />

      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={[UsersStyle.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[UsersStyle.modalCard, { backgroundColor: colors.surface }]}>
            <View style={[UsersStyle.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[UsersStyle.modalTitle, { color: colors.text }]}>User Details</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {selected && (
              <ScrollView contentContainerStyle={UsersStyle.modalBody}>
                <View style={UsersStyle.modalAvatarRow}>
                  <View style={[UsersStyle.modalAvatar, { backgroundColor: selected.role === 'admin' ? colors.primary : colors.accent }]}>
                    <Text style={UsersStyle.modalAvatarText}>{getInitials(selected.full_name)}</Text>
                  </View>
                  <View>
                    <Text style={[UsersStyle.modalName, { color: colors.text }]}>{selected.full_name}</Text>
                    <Text style={[UsersStyle.modalEmail, { color: colors.textMuted }]}>{selected.email}</Text>
                  </View>
                </View>

                {[
                  { label: 'Phone', value: selected.phone },
                  { label: 'Role', value: selected.role },
                  { label: 'Status', value: selected.is_active ? 'Active' : 'Inactive' },
                  { label: 'Joined', value: formatDate(selected.created_at) },
                ].map((row) => (
                  <View key={row.label} style={[UsersStyle.detailRow, { borderBottomColor: colors.border }]}>
                    <Text style={[UsersStyle.detailLabel, { color: colors.textMuted }]}>{row.label}</Text>
                    <Text style={[UsersStyle.detailValue, { color: colors.text }]}>{row.value}</Text>
                  </View>
                ))}

                <TouchableOpacity
                  style={[UsersStyle.actionBtn, { backgroundColor: selected.is_active ? colors.warningLight : colors.successLight }]}
                  onPress={() => handleToggleActive(selected)}
                >
                  <MaterialIcons name={selected.is_active ? 'block' : 'check-circle'} size={18} color={selected.is_active ? colors.warning : colors.success} />
                  <Text style={[UsersStyle.actionBtnText, { color: selected.is_active ? colors.warning : colors.success }]}>
                    {selected.is_active ? 'Deactivate Account' : 'Activate Account'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[UsersStyle.actionBtn, { backgroundColor: colors.infoLight }]}
                  onPress={() => handleToggleRole(selected)}
                >
                  <MaterialIcons name="swap-horiz" size={18} color={colors.info} />
                  <Text style={[UsersStyle.actionBtnText, { color: colors.info }]}>
                    Make {selected.role === 'admin' ? 'Customer' : 'Admin'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Users;
