import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Modal, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../../../../src/lib/supabase';
import useTheme from '../../../../src/hooks/useTheme';
import { useToast } from '../../../../src/hooks/useToast';
import { pickAndUploadImage } from '../../../../src/utils/imageUpload';
import { Equipment, AdminStackParamList, EquipmentCategory, EquipmentCondition } from '../../../../src/types';
import { EQUIPMENT_CATEGORIES, EQUIPMENT_CONDITIONS } from '../../../../src/constants';
import { formatCurrency } from '../../../../src/utils/format';
import { validateRequired, validatePositiveNumber } from '../../../../src/utils/validation';
import EmptyState from '../../../../src/components/EmptyState/EmptyState';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';

type Props = {
  navigation?: NativeStackNavigationProp<AdminStackParamList>;
  route?: RouteProp<AdminStackParamList, 'EquipmentForm'>;
};

interface EquipmentForm {
  name: string; category: EquipmentCategory; description: string;
  daily_rate: string; weekly_rate: string; monthly_rate: string;
  total_quantity: string; condition: EquipmentCondition; image_url: string;
}

interface SpecEntry { key: string; value: string; id: string; }

const EMPTY_FORM: EquipmentForm = {
  name: '', category: 'Excavation', description: '',
  daily_rate: '', weekly_rate: '', monthly_rate: '',
  total_quantity: '1', condition: 'Good', image_url: '',
};

const CONDITION_COLORS: Record<EquipmentCondition, string> = {
  Excellent: '#22C55E',
  Good: '#3B82F6',
  Fair: '#F59E0B',
  'Needs Maintenance': '#EF4444',
};

const EquipmentManage = ({ route }: Props) => {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const { width } = useWindowDimensions();
  const isWide = width > 600;

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc' | 'avail'>('name');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EquipmentForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [specEntries, setSpecEntries] = useState<SpecEntry[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from('equipment').select('*').order('name');
    if (data) setEquipment(data as Equipment[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const filtered = (() => {
    let result = equipment.filter((e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase())
    );
    if (sortBy === 'price_asc') result = [...result].sort((a, b) => a.daily_rate - b.daily_rate);
    if (sortBy === 'price_desc') result = [...result].sort((a, b) => b.daily_rate - a.daily_rate);
    if (sortBy === 'avail') result = [...result].sort((a, b) => b.available_quantity - a.available_quantity);
    return result;
  })();

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setSpecEntries([]);
    setEditingId(null);
    setErrors({});
    setModalVisible(true);
  };

  const openEdit = (eq: Equipment) => {
    setForm({
      name: eq.name, category: eq.category, description: eq.description,
      daily_rate: String(eq.daily_rate), weekly_rate: String(eq.weekly_rate),
      monthly_rate: String(eq.monthly_rate), total_quantity: String(eq.total_quantity),
      condition: eq.condition, image_url: eq.image_url ?? '',
    });
    const entries = eq.specs ? Object.entries(eq.specs).map(([k, v], i) => ({
      key: k, value: String(v), id: String(i),
    })) : [];
    setSpecEntries(entries);
    setEditingId(eq.id);
    setErrors({});
    setModalVisible(true);
  };

  useEffect(() => {
    if (loading || route?.name !== 'EquipmentForm') return;
    const routeEquipmentId = route.params?.equipmentId;
    if (!routeEquipmentId) { openCreate(); return; }
    const existing = equipment.find((eq) => eq.id === routeEquipmentId);
    if (existing) openEdit(existing);
  }, [equipment, loading, route?.name, route?.params?.equipmentId]);

  const validate = () => {
    const e: Record<string, string> = {
      name: validateRequired(form.name) ?? '',
      description: validateRequired(form.description) ?? '',
      daily_rate: validatePositiveNumber(parseFloat(form.daily_rate)) ?? '',
      total_quantity: validatePositiveNumber(parseInt(form.total_quantity)) ?? '',
    };
    if (form.weekly_rate.trim()) {
      const wr = parseFloat(form.weekly_rate);
      if (isNaN(wr) || wr <= 0) e.weekly_rate = 'Must be a positive number.';
    }
    if (form.monthly_rate.trim()) {
      const mr = parseFloat(form.monthly_rate);
      if (isNaN(mr) || mr <= 0) e.monthly_rate = 'Must be a positive number.';
    }
    const f = Object.fromEntries(Object.entries(e).filter(([, v]) => v));
    setErrors(f);
    return Object.keys(f).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const specs = specEntries
        .filter(e => e.key.trim() && e.value.trim())
        .reduce((acc, e) => ({ ...acc, [e.key.trim()]: e.value.trim() }), {});
      const payload = {
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim(),
        daily_rate: parseFloat(form.daily_rate),
        weekly_rate: parseFloat(form.weekly_rate) || parseFloat(form.daily_rate) * 7,
        monthly_rate: parseFloat(form.monthly_rate) || parseFloat(form.daily_rate) * 30,
        total_quantity: parseInt(form.total_quantity),
        condition: form.condition,
        image_url: form.image_url.trim(),
        specs,
        is_active: true,
      };
      if (editingId) {
        const existing = equipment.find((eq) => eq.id === editingId);
        const rentedQuantity = existing ? Math.max(0, existing.total_quantity - existing.available_quantity) : 0;
        const { error } = await supabase.from('equipment')
          .update({ ...payload, available_quantity: Math.max(0, parseInt(form.total_quantity) - rentedQuantity) })
          .eq('id', editingId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('equipment').insert({ ...payload, available_quantity: parseInt(form.total_quantity) });
        if (error) throw new Error(error.message);
      }
      showSuccess(editingId ? 'Equipment updated' : 'Equipment added');
      setModalVisible(false);
      load();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (eq: Equipment) => {
    Alert.alert(
      eq.is_active ? 'Deactivate Equipment' : 'Activate Equipment',
      `${eq.is_active ? 'Hide' : 'Show'} "${eq.name}" from the catalog?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: async () => { await supabase.from('equipment').update({ is_active: !eq.is_active }).eq('id', eq.id); load(); } },
      ]
    );
  };

  const handleDelete = async (eq: Equipment) => {
    Alert.alert('Delete Equipment', `Permanently delete "${eq.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('equipment').delete().eq('id', eq.id);
          if (error) Alert.alert('Error', error.message);
          else load();
        },
      },
    ]);
  };

  const handleImageUpload = async () => {
    setUploadingImage(true);
    try {
      const url = await pickAndUploadImage('equipment');
      if (url) setField('image_url', url);
    } catch (err: unknown) {
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Could not upload image.');
    } finally { setUploadingImage(false); }
  };

  const handleClearMaintenance = async (eq: Equipment) => {
    Alert.alert('Clear Maintenance Flag', `Mark "${eq.name}" as serviced?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear Flag',
        onPress: async () => {
          const { error } = await supabase.rpc('clear_maintenance_flag', { equipment_id: eq.id });
          if (error) showError(error.message);
          else { showSuccess(`${eq.name} cleared for service`); load(); }
        },
      },
    ]);
  };

  const setField = (key: keyof EquipmentForm, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }));
  };

  if (loading) return <LoadingSpinner message="Loading equipment..." />;

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: colors.surface }]}>
        <View>
          <Text style={[s.title, { color: colors.text }]}>Equipment</Text>
          <Text style={[s.subtitle, { color: colors.textMuted }]}>{equipment.length} items managed</Text>
        </View>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={openCreate}>
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={s.addBtnText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={[s.searchWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[s.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <MaterialIcons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            placeholder="Search equipment..."
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

      {/* Sort bar */}
      <View style={[s.sortBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.sortLabel, { color: colors.textMuted }]}>Sort:</Text>
        {([
          { key: 'name', label: 'Name' },
          { key: 'price_asc', label: 'Price ↑' },
          { key: 'price_desc', label: 'Price ↓' },
          { key: 'avail', label: 'Available' },
        ] as const).map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[s.sortChip, sortBy === opt.key
              ? { backgroundColor: colors.primary, borderColor: colors.primary }
              : { backgroundColor: colors.cardAlt, borderColor: colors.border }
            ]}
            onPress={() => setSortBy(opt.key)}
          >
            <Text style={[s.sortText, { color: sortBy === opt.key ? '#FFF' : colors.textSecondary }]}>{opt.label}</Text>
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
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#000', opacity: item.is_active ? 1 : 0.6 }]}>
            <View style={s.cardRow}>
              <Image source={{ uri: item.image_url || 'https://via.placeholder.com/80' }} style={s.thumb} resizeMode="cover" />
              <View style={s.cardInfo}>
                <Text style={[s.cardName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[s.cardCategory, { color: colors.textMuted }]}>{item.category}</Text>
                <Text style={[s.cardRate, { color: colors.primary }]}>{formatCurrency(item.daily_rate)}/day</Text>
                <Text style={[s.cardAvail, { color: item.available_quantity > 0 ? colors.success : colors.danger }]}>
                  {item.available_quantity}/{item.total_quantity} available
                </Text>
              </View>
            </View>
            <View style={[s.cardActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity style={[s.cardActionBtn, { backgroundColor: `${colors.accent}10` }]} onPress={() => openEdit(item)}>
                <MaterialIcons name="edit" size={15} color={colors.accent} />
                <Text style={[s.cardActionText, { color: colors.accent }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.cardActionBtn, { backgroundColor: `${colors.warning}10` }]} onPress={() => handleToggleActive(item)}>
                <MaterialIcons name={item.is_active ? 'visibility-off' : 'visibility'} size={15} color={colors.warning} />
                <Text style={[s.cardActionText, { color: colors.warning }]}>{item.is_active ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.cardActionBtn, { backgroundColor: `${colors.danger}10` }]} onPress={() => handleDelete(item)}>
                <MaterialIcons name="delete-outline" size={15} color={colors.danger} />
                <Text style={[s.cardActionText, { color: colors.danger }]}>Delete</Text>
              </TouchableOpacity>
              {item.needs_maintenance && (
                <TouchableOpacity style={[s.cardActionBtn, { backgroundColor: `${colors.success}10` }]} onPress={() => handleClearMaintenance(item)}>
                  <MaterialIcons name="build" size={15} color={colors.success} />
                  <Text style={[s.cardActionText, { color: colors.success }]}>Service</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="construction" title="No equipment found" subtitle="Add your first equipment item." />}
      />

      {/* ── Form Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, { color: colors.text }]}>
                {editingId ? 'Edit Equipment' : 'Add Equipment'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={s.closeBtn}>
                <MaterialIcons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.formBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Name */}
              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Equipment Name *</Text>
                <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: errors.name ? colors.danger : colors.inputBorder }]}>
                  <TextInput
                    style={[s.input, { color: colors.text }]}
                    value={form.name}
                    onChangeText={(v) => setField('name', v)}
                    placeholder="e.g. CAT 320 Excavator"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
                {errors.name ? <Text style={[s.error, { color: colors.danger }]}>{errors.name}</Text> : null}
              </View>

              {/* Description */}
              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Description *</Text>
                <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: errors.description ? colors.danger : colors.inputBorder, minHeight: 80 }]}>
                  <TextInput
                    style={[s.input, { color: colors.text, textAlignVertical: 'top' }]}
                    value={form.description}
                    onChangeText={(v) => setField('description', v)}
                    placeholder="Brief description..."
                    placeholderTextColor={colors.placeholder}
                    multiline
                    numberOfLines={3}
                  />
                </View>
                {errors.description ? <Text style={[s.error, { color: colors.danger }]}>{errors.description}</Text> : null}
              </View>

              {/* Image */}
              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Equipment Image</Text>
                {form.image_url ? (
                  <Image source={{ uri: form.image_url }} style={s.imagePreview} resizeMode="cover" />
                ) : null}
                <TouchableOpacity
                  style={[s.uploadBtn, { backgroundColor: colors.cardAlt, borderColor: colors.inputBorder }]}
                  onPress={handleImageUpload}
                  disabled={uploadingImage}
                >
                  {uploadingImage
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <MaterialIcons name="cloud-upload" size={18} color={colors.primary} />
                  }
                  <Text style={[s.uploadBtnText, { color: colors.primary }]}>
                    {uploadingImage ? 'Uploading...' : form.image_url ? 'Change Image' : 'Upload Image'}
                  </Text>
                </TouchableOpacity>
                <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, marginTop: 8 }]}>
                  <TextInput
                    style={[s.input, { color: colors.text }]}
                    value={form.image_url}
                    onChangeText={(v) => setField('image_url', v)}
                    placeholder="Or paste image URL..."
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
              </View>

              {/* Rates + Quantity */}
              <View style={[s.twoCol, isWide && s.twoColWide]}>
                <View style={[s.fieldGroup, { flex: 1 }]}>
                  <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Daily Rate (₱) *</Text>
                  <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: errors.daily_rate ? colors.danger : colors.inputBorder }]}>
                    <TextInput
                      style={[s.input, { color: colors.text }]}
                      value={form.daily_rate}
                      onChangeText={(v) => setField('daily_rate', v)}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                  {errors.daily_rate ? <Text style={[s.error, { color: colors.danger }]}>{errors.daily_rate}</Text> : null}
                </View>
                <View style={[s.fieldGroup, { flex: 1 }]}>
                  <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Total Quantity *</Text>
                  <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: errors.total_quantity ? colors.danger : colors.inputBorder }]}>
                    <TextInput
                      style={[s.input, { color: colors.text }]}
                      value={form.total_quantity}
                      onChangeText={(v) => setField('total_quantity', v)}
                      keyboardType="number-pad"
                      placeholder="1"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                  {errors.total_quantity ? <Text style={[s.error, { color: colors.danger }]}>{errors.total_quantity}</Text> : null}
                </View>
              </View>

              {/* Weekly + Monthly Rates */}
              <View style={[s.twoCol, isWide && s.twoColWide]}>
                <View style={[s.fieldGroup, { flex: 1 }]}>
                  <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Weekly Rate (₱)</Text>
                  <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: errors.weekly_rate ? colors.danger : colors.inputBorder }]}>
                    <TextInput
                      style={[s.input, { color: colors.text }]}
                      value={form.weekly_rate}
                      onChangeText={(v) => { setField('weekly_rate', v); if (errors.weekly_rate) setErrors((p) => ({ ...p, weekly_rate: '' })); }}
                      keyboardType="numeric"
                      placeholder="Auto"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                  {errors.weekly_rate ? <Text style={[s.error, { color: colors.danger }]}>{errors.weekly_rate}</Text> : null}
                </View>
                <View style={[s.fieldGroup, { flex: 1 }]}>
                  <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Monthly Rate (₱)</Text>
                  <View style={[s.inputWrap, { backgroundColor: colors.inputBg, borderColor: errors.monthly_rate ? colors.danger : colors.inputBorder }]}>
                    <TextInput
                      style={[s.input, { color: colors.text }]}
                      value={form.monthly_rate}
                      onChangeText={(v) => { setField('monthly_rate', v); if (errors.monthly_rate) setErrors((p) => ({ ...p, monthly_rate: '' })); }}
                      keyboardType="numeric"
                      placeholder="Auto"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                  {errors.monthly_rate ? <Text style={[s.error, { color: colors.danger }]}>{errors.monthly_rate}</Text> : null}
                </View>
              </View>

              {/* Category picker */}
              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipScroll}>
                  {EQUIPMENT_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[s.chip, { backgroundColor: form.category === cat ? colors.primary : colors.cardAlt, borderColor: form.category === cat ? colors.primary : colors.border }]}
                      onPress={() => setField('category', cat)}
                    >
                      <Text style={[s.chipText, { color: form.category === cat ? '#FFF' : colors.textSecondary }]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Condition */}
              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Condition</Text>
                <View style={s.condRow}>
                  {EQUIPMENT_CONDITIONS.map((cond) => {
                    const sel = form.condition === cond;
                    const condColor = CONDITION_COLORS[cond] ?? colors.success;
                    return (
                      <TouchableOpacity
                        key={cond}
                        style={[s.condChip, { backgroundColor: sel ? condColor : colors.cardAlt, borderColor: sel ? condColor : colors.border }]}
                        onPress={() => setField('condition', cond)}
                      >
                        <Text style={[s.condChipText, { color: sel ? '#fff' : colors.textSecondary }]}>{cond}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Specs editor */}
              <View style={s.fieldGroup}>
                <View style={s.specsHeader}>
                  <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Specifications</Text>
                  <TouchableOpacity
                    style={[s.addSpecBtn, { backgroundColor: colors.primaryLight }]}
                    onPress={() => setSpecEntries(p => [...p, { key: '', value: '', id: String(Date.now()) }])}
                  >
                    <MaterialIcons name="add" size={14} color={colors.primary} />
                    <Text style={[s.addSpecText, { color: colors.primary }]}>Add Spec</Text>
                  </TouchableOpacity>
                </View>
                {specEntries.length === 0 ? (
                  <Text style={[s.specsEmpty, { color: colors.textMuted }]}>
                    No specs yet. Tap "Add Spec" to add technical details.
                  </Text>
                ) : (
                  specEntries.map((entry, idx) => (
                    <View key={entry.id} style={[s.specRow, { borderColor: colors.border }]}>
                      <View style={[s.specInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                        <TextInput
                          style={[s.specInputText, { color: colors.text }]}
                          value={entry.key}
                          onChangeText={(v) => setSpecEntries(p => p.map((e, i) => i === idx ? { ...e, key: v } : e))}
                          placeholder="e.g. Weight"
                          placeholderTextColor={colors.placeholder}
                        />
                      </View>
                      <View style={[s.specInput, { flex: 1.5, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                        <TextInput
                          style={[s.specInputText, { color: colors.text }]}
                          value={entry.value}
                          onChangeText={(v) => setSpecEntries(p => p.map((e, i) => i === idx ? { ...e, value: v } : e))}
                          placeholder="e.g. 22,000 kg"
                          placeholderTextColor={colors.placeholder}
                        />
                      </View>
                      <TouchableOpacity
                        style={[s.removeSpecBtn, { backgroundColor: `${colors.danger}15` }]}
                        onPress={() => setSpecEntries(p => p.filter((_, i) => i !== idx))}
                      >
                        <MaterialIcons name="close" size={14} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: saving ? colors.border : colors.primary }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.saveBtnText}>{editingId ? 'Save Changes' : 'Add Equipment'}</Text>
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
  title: { fontSize: 22, fontWeight: '800', letterSpacing: 0 },
  subtitle: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, gap: 6 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1.5, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', padding: 0 },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  sortLabel: { fontSize: 12, fontWeight: '600' },
  sortChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  sortText: { fontSize: 12, fontWeight: '600' },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  card: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', padding: 14, gap: 12 },
  thumb: { width: 80, height: 80, borderRadius: 10 },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: 15, fontWeight: '700', letterSpacing: 0 },
  cardCategory: { fontSize: 12 },
  cardRate: { fontSize: 14, fontWeight: '800' },
  cardAvail: { fontSize: 12, fontWeight: '600' },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 8 },
  cardActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, gap: 4 },
  cardActionText: { fontSize: 12, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '94%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  formBody: { paddingHorizontal: 22, paddingBottom: 40, gap: 16 },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap: { borderRadius: 8, borderWidth: 1.5, paddingVertical: 13, paddingHorizontal: 14 },
  input: { fontSize: 15, fontWeight: '500', padding: 0 },
  error: { fontSize: 12 },
  imagePreview: { width: '100%', height: 160, borderRadius: 14, marginBottom: 8 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, gap: 8 },
  uploadBtnText: { fontSize: 13, fontWeight: '600' },
  twoCol: { gap: 12 },
  twoColWide: { flexDirection: 'row' },
  chipScroll: { gap: 8, paddingVertical: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 4 },
  chipText: { fontSize: 12, fontWeight: '600' },
  condRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  condChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  condChipText: { fontSize: 12, fontWeight: '600' },
  specsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addSpecBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 4 },
  addSpecText: { fontSize: 12, fontWeight: '600' },
  specsEmpty: { fontSize: 13, fontStyle: 'italic' },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  specInput: { flex: 1, borderRadius: 8, borderWidth: 1.5, paddingVertical: 10, paddingHorizontal: 10 },
  specInputText: { fontSize: 14, fontWeight: '500', padding: 0 },
  removeSpecBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { paddingVertical: 16, borderRadius: 18, alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default EquipmentManage;
