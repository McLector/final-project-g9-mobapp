import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../../src/lib/supabase';
import useTheme from '../../../../src/hooks/useTheme';
import { AppUser, AdminStackParamList } from '../../../../src/types';
import { formatDate, getInitials } from '../../../../src/utils/format';
import { validateEmail, validateFullName, validatePhone } from '../../../../src/utils/validation';
import EmptyState from '../../../../src/components/EmptyState/EmptyState';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';

type Props = { navigation: NativeStackNavigationProp<AdminStackParamList> };

interface UserForm {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

const EMPTY_FORM: UserForm = { fullName: '', email: '', phone: '', password: '' };

const ROLE_COLOR: Record<string, string> = {
  admin: '#F97316',
  customer: '#3B82F6',
};

const Users = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [filter, setFilter] = useState<'all' | 'customer' | 'admin'>('all');
  const [search, setSearch] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone?.toLowerCase().includes(q) ?? false);
    return matchesFilter && matchesSearch;
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setEditingUser(null);
    setFormVisible(true);
  };

  const openEdit = (user: AppUser) => {
    setForm({ fullName: user.full_name, email: user.email, phone: user.phone, password: '' });
    setFormErrors({});
    setEditingUser(user);
    setFormVisible(true);
  };

  const handleSaveUser = async () => {
    const e: Record<string, string> = {};
    const n = validateFullName(form.fullName); if (n) e.fullName = n;
    if (!editingUser) {
      const em = validateEmail(form.email); if (em) e.email = em;
      if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters.';
    }
    const ph = validatePhone(form.phone); if (ph) e.phone = ph;
    setFormErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    try {
      if (editingUser) {
        const { error } = await supabase.from('profiles')
          .update({ full_name: form.fullName.trim(), phone: form.phone.trim() })
          .eq('id', editingUser.id);
        if (error) throw new Error(error.message);
        setSelected(null);
      } else {
        Alert.alert(
          'User Creation',
          'Creating users from the admin panel requires server-side setup. Ask the customer to register directly at the app.',
          [{ text: 'OK' }]
        );
        setSaving(false);
        return;
      }
      setFormVisible(false);
      setEditingUser(null);
      load();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Operation failed.');
    } finally {
      setSaving(false);
    }
  };

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

  const handleDeleteUser = async (user: AppUser) => {
    if (user.role === 'admin') {
      Alert.alert('Not Allowed', 'Admin accounts are managed outside this screen.');
      return;
    }
    Alert.alert('Delete User', `Delete "${user.full_name}" and related rental records?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('profiles').delete().eq('id', user.id).eq('role', 'customer');
          if (error) Alert.alert('Error', error.message);
          else { setSelected(null); load(); }
        },
      },
    ]);
  };

  if (loading) return <LoadingSpinner message="Loading users..." />;

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: colors.surface }]}>
        <View>
          <Text style={[s.title, { color: colors.text }]}>Users</Text>
          <Text style={[s.subtitle, { color: colors.textMuted }]}>{filtered.length} {filter === 'all' ? 'total' : filter + 's'}</Text>
        </View>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={openCreate}>
          <MaterialIcons name="person-add" size={16} color="#fff" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[s.searchRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[s.searchWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <MaterialIcons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
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
      <View style={[s.filterRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['all', 'customer', 'admin'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filter === f
              ? { backgroundColor: colors.primary, borderColor: colors.primary }
              : { backgroundColor: colors.cardAlt, borderColor: colors.border }
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, { color: filter === f ? '#FFF' : colors.textSecondary }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#000', opacity: item.is_active ? 1 : 0.6 }]}
            onPress={() => setSelected(item)}
            activeOpacity={0.85}
          >
            <View style={[s.avatarCircle, { backgroundColor: `${ROLE_COLOR[item.role] ?? colors.primary}20` }]}>
              <Text style={[s.avatarText, { color: ROLE_COLOR[item.role] ?? colors.primary }]}>
                {getInitials(item.full_name)}
              </Text>
            </View>
            <View style={s.cardInfo}>
              <Text style={[s.userName, { color: colors.text }]}>{item.full_name}</Text>
              <Text style={[s.userEmail, { color: colors.textMuted }]} numberOfLines={1}>{item.email}</Text>
              <Text style={[s.userPhone, { color: colors.textMuted }]}>{item.phone}</Text>
            </View>
            <View style={s.cardRight}>
              <View style={[s.rolePill, { backgroundColor: `${ROLE_COLOR[item.role] ?? colors.primary}18` }]}>
                <Text style={[s.roleText, { color: ROLE_COLOR[item.role] ?? colors.primary }]}>{item.role}</Text>
              </View>
              {!item.is_active && (
                <View style={[s.inactivePill, { backgroundColor: `${colors.danger}18` }]}>
                  <Text style={[s.inactiveText, { color: colors.danger }]}>Inactive</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState icon="people" title="No users found" />}
      />

      {/* ── Detail Modal ── */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={s.modalOverlay}>
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, { color: colors.text }]}>User Details</Text>
              <TouchableOpacity onPress={() => setSelected(null)} style={s.closeBtn}>
                <MaterialIcons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            {selected && (
              <ScrollView contentContainerStyle={s.sheetBody} showsVerticalScrollIndicator={false}>
                <View style={s.userHero}>
                  <View style={[s.heroAvatar, { backgroundColor: `${ROLE_COLOR[selected.role] ?? colors.primary}20` }]}>
                    <Text style={[s.heroAvatarText, { color: ROLE_COLOR[selected.role] ?? colors.primary }]}>
                      {getInitials(selected.full_name)}
                    </Text>
                  </View>
                  <Text style={[s.heroName, { color: colors.text }]}>{selected.full_name}</Text>
                  <Text style={[s.heroEmail, { color: colors.textMuted }]}>{selected.email}</Text>
                </View>

                <View style={[s.infoGrid, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                  {[
                    { icon: 'phone' as const, label: 'Phone', value: selected.phone },
                    { icon: 'badge' as const, label: 'Role', value: selected.role },
                    { icon: 'toggle-on' as const, label: 'Status', value: selected.is_active ? 'Active' : 'Inactive' },
                    { icon: 'event' as const, label: 'Joined', value: formatDate(selected.created_at) },
                  ].map((row, i, arr) => (
                    <View key={row.label} style={[s.infoRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                      <View style={s.infoLeft}>
                        <MaterialIcons name={row.icon} size={13} color={colors.textMuted} />
                        <Text style={[s.infoLabel, { color: colors.textMuted }]}>{row.label}</Text>
                      </View>
                      <Text style={[s.infoValue, { color: colors.text }]}>{row.value}</Text>
                    </View>
                  ))}
                </View>

                <View style={s.actionsCol}>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: selected.is_active ? `${colors.warning}15` : `${colors.success}15`, borderColor: selected.is_active ? colors.warning : colors.success }]}
                    onPress={() => handleToggleActive(selected)}
                  >
                    <MaterialIcons name={selected.is_active ? 'block' : 'check-circle'} size={16} color={selected.is_active ? colors.warning : colors.success} />
                    <Text style={[s.actionBtnText, { color: selected.is_active ? colors.warning : colors.success }]}>
                      {selected.is_active ? 'Deactivate Account' : 'Activate Account'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: `${colors.accent}15`, borderColor: colors.accent }]}
                    onPress={() => { setSelected(null); openEdit(selected); }}
                  >
                    <MaterialIcons name="edit" size={16} color={colors.accent} />
                    <Text style={[s.actionBtnText, { color: colors.accent }]}>Edit User Details</Text>
                  </TouchableOpacity>

                  {selected.role !== 'admin' && (
                    <>
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}
                        onPress={() => handleToggleRole(selected)}
                      >
                        <MaterialIcons name="swap-horiz" size={16} color={colors.primary} />
                        <Text style={[s.actionBtnText, { color: colors.primary }]}>Make Admin</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: `${colors.danger}15`, borderColor: colors.danger }]}
                        onPress={() => handleDeleteUser(selected)}
                      >
                        <MaterialIcons name="delete" size={16} color={colors.danger} />
                        <Text style={[s.actionBtnText, { color: colors.danger }]}>Delete Customer</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Create / Edit Modal ── */}
      <Modal visible={formVisible} animationType="slide" transparent onRequestClose={() => setFormVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, { color: colors.text }]}>{editingUser ? 'Edit User' : 'Add Customer'}</Text>
              <TouchableOpacity onPress={() => setFormVisible(false)} style={s.closeBtn}>
                <MaterialIcons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.formBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {[
                { key: 'fullName', label: 'Full Name', keyboard: 'default' as const, icon: 'person' as const },
                ...(!editingUser ? [{ key: 'email', label: 'Email', keyboard: 'email-address' as const, icon: 'email' as const }] : []),
                { key: 'phone', label: 'Phone', keyboard: 'phone-pad' as const, icon: 'phone' as const },
              ].map((field) => (
                <View key={field.key} style={s.fieldGroup}>
                  <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{field.label}</Text>
                  <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: formErrors[field.key] ? colors.danger : colors.inputBorder }]}>
                    <MaterialIcons name={field.icon} size={16} color={colors.textMuted} />
                    <TextInput
                      style={[s.input, { color: colors.text }]}
                      value={form[field.key as keyof UserForm]}
                      onChangeText={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
                      keyboardType={field.keyboard}
                      placeholderTextColor={colors.placeholder}
                      autoCapitalize={field.key === 'email' ? 'none' : 'words'}
                    />
                  </View>
                  {formErrors[field.key] ? <Text style={[s.error, { color: colors.danger }]}>{formErrors[field.key]}</Text> : null}
                </View>
              ))}

              {!editingUser && (
                <View style={s.fieldGroup}>
                  <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Temporary Password</Text>
                  <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: formErrors.password ? colors.danger : colors.inputBorder }]}>
                    <MaterialIcons name="lock" size={16} color={colors.textMuted} />
                    <TextInput
                      style={[s.input, { color: colors.text }]}
                      value={form.password}
                      onChangeText={(p) => setForm((prev) => ({ ...prev, password: p }))}
                      secureTextEntry
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                  {formErrors.password ? <Text style={[s.error, { color: colors.danger }]}>{formErrors.password}</Text> : null}
                </View>
              )}

              <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveUser} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.saveBtnText}>{editingUser ? 'Save Changes' : 'Add Customer'}</Text>
                }
              </TouchableOpacity>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: 0 },
  subtitle: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, gap: 6 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', padding: 0 },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterText: { fontSize: 12, fontWeight: '600' },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  cardInfo: { flex: 1, gap: 2 },
  userName: { fontSize: 15, fontWeight: '700', letterSpacing: 0 },
  userEmail: { fontSize: 12 },
  userPhone: { fontSize: 12 },
  cardRight: { alignItems: 'flex-end', gap: 5 },
  rolePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  roleText: { fontSize: 11, fontWeight: '700' },
  inactivePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  inactiveText: { fontSize: 10, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { paddingHorizontal: 22, paddingBottom: 40, gap: 16 },
  userHero: { alignItems: 'center', gap: 8, paddingVertical: 10 },
  heroAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  heroAvatarText: { fontSize: 26, fontWeight: '800' },
  heroName: { fontSize: 20, fontWeight: '800', letterSpacing: 0 },
  heroEmail: { fontSize: 13 },
  infoGrid: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14 },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '600' },
  actionsCol: { gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 16, gap: 8, borderWidth: 1.5 },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  formBody: { paddingHorizontal: 22, paddingBottom: 40, gap: 16 },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1.5, gap: 10 },
  input: { flex: 1, fontSize: 15, fontWeight: '500', padding: 0 },
  error: { fontSize: 12 },
  saveBtn: { paddingVertical: 16, borderRadius: 18, alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default Users;
