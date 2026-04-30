import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import EquipmentManageStyle from './EquipmentManageStyle';

type Props = { navigation: NativeStackNavigationProp<AdminStackParamList> };

interface EquipmentForm {
  name: string; categories: EquipmentCategory[]; description: string;
  daily_rate: string; weekly_rate: string; monthly_rate: string;
  total_quantity: string; condition: EquipmentCondition; image_url: string;
}

interface SpecEntry { key: string; value: string; id: string; }

const EMPTY_FORM: EquipmentForm = {
  name: '', categories: [], description: '',
  daily_rate: '', weekly_rate: '', monthly_rate: '',
  total_quantity: '1', condition: 'Good', image_url: '',
};

const EquipmentManage = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
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
      name: eq.name, categories: eq.categories ?? (eq.category ? [eq.category] : []), description: eq.description,
      daily_rate: String(eq.daily_rate), weekly_rate: String(eq.weekly_rate),
      monthly_rate: String(eq.monthly_rate), total_quantity: String(eq.total_quantity),
      condition: eq.condition, image_url: eq.image_url ?? '',
    });
    // Convert specs object to editable entries
    const entries = eq.specs ? Object.entries(eq.specs).map(([k, v], i) => ({
      key: k, value: String(v), id: String(i),
    })) : [];
    setSpecEntries(entries);
    setEditingId(eq.id);
    setErrors({});
    setModalVisible(true);
  };

  const validate = () => {
    const e: Record<string, string> = {
      name: validateRequired(form.name) ?? '',
      description: validateRequired(form.description) ?? '',
      categories: form.categories.length === 0 ? 'Select at least one category.' : '',
      daily_rate: validatePositiveNumber(parseFloat(form.daily_rate)) ?? '',
      weekly_rate: validatePositiveNumber(parseFloat(form.weekly_rate)) ?? '',
      monthly_rate: validatePositiveNumber(parseFloat(form.monthly_rate)) ?? '',
      total_quantity: validatePositiveNumber(parseInt(form.total_quantity)) ?? '',
    };
    const f = Object.fromEntries(Object.entries(e).filter(([, v]) => v));
    setErrors(f);
    return Object.keys(f).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // Build specs object from entries (skip empty keys)
      const specsObj: Record<string, string> = {};
      specEntries.forEach(({ key, value }) => {
        if (key.trim() && value.trim()) specsObj[key.trim()] = value.trim();
      });

      const payload = {
        name: form.name.trim(),
        category: form.categories[0] ?? 'Excavation',  // primary category for backward compat
        categories: form.categories,
        description: form.description.trim(),
        daily_rate: parseFloat(form.daily_rate),
        weekly_rate: parseFloat(form.weekly_rate),
        monthly_rate: parseFloat(form.monthly_rate),
        total_quantity: parseInt(form.total_quantity),
        condition: form.condition,
        image_url: form.image_url.trim(),
        specs: specsObj,
        is_active: true,
      };

      if (editingId) {
        const { error } = await supabase.from('equipment').update(payload).eq('id', editingId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('equipment').insert({
          ...payload,
          available_quantity: parseInt(form.total_quantity),
        });
        if (error) throw new Error(error.message);
      }
      showSuccess(editingId ? 'Equipment updated' : 'Equipment added');
      setModalVisible(false);
      load();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Save failed.');
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
        {
          text: 'Confirm',
          onPress: async () => {
            await supabase.from('equipment').update({ is_active: !eq.is_active }).eq('id', eq.id);
            load();
          },
        },
      ]
    );
  };

  const handleDelete = async (eq: Equipment) => {
    Alert.alert('Delete Equipment', `Permanently delete "${eq.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
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
    } finally {
      setUploadingImage(false);
    }
  };

  const handleClearMaintenance = async (eq: Equipment) => {
    Alert.alert(
      'Clear Maintenance Flag',
      `Mark "${eq.name}" as serviced and clear the maintenance flag?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Flag',
          onPress: async () => {
            const { error } = await supabase.rpc('clear_maintenance_flag', { equipment_id: eq.id });
            if (error) {
              showError(error.message);
            } else {
              showSuccess(`${eq.name} cleared for service`);
              load();
            }
          },
        },
      ]
    );
  };

  const setField = (key: keyof EquipmentForm, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }));
  };

  if (loading) return <LoadingSpinner message="Loading equipment..." />;

  return (
    <SafeAreaView edges={['top']} style={[EquipmentManageStyle.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[EquipmentManageStyle.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[EquipmentManageStyle.title, { color: colors.text }]}>Equipment</Text>
          <Text style={[EquipmentManageStyle.subtitle, { color: colors.textMuted }]}>{equipment.length} items</Text>
        </View>
        <TouchableOpacity style={[EquipmentManageStyle.addBtn, { backgroundColor: colors.primary }]} onPress={openCreate}>
          <MaterialIcons name="add" size={22} color="#FFF" />
          <Text style={EquipmentManageStyle.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[EquipmentManageStyle.searchRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[EquipmentManageStyle.searchWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <MaterialIcons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[EquipmentManageStyle.searchInput, { color: colors.text }]}
            placeholder="Search equipment..."
            placeholderTextColor={colors.placeholder}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Sort bar */}
      <View style={[EquipmentManageStyle.sortBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[EquipmentManageStyle.sortLabel, { color: colors.textMuted }]}>Sort:</Text>
        {([
          { key: 'name', label: 'Name' },
          { key: 'price_asc', label: 'Price ↑' },
          { key: 'price_desc', label: 'Price ↓' },
          { key: 'avail', label: 'Available' },
        ] as const).map(s => (
          <TouchableOpacity
            key={s.key}
            style={[EquipmentManageStyle.sortChip,
              sortBy === s.key
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
            onPress={() => setSortBy(s.key)}
          >
            <Text style={[EquipmentManageStyle.sortText, { color: sortBy === s.key ? '#FFF' : colors.textSecondary }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={EquipmentManageStyle.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={[EquipmentManageStyle.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow, opacity: item.is_active ? 1 : 0.6 }]}>
            <View style={EquipmentManageStyle.cardRow}>
              <Image source={{ uri: item.image_url || 'https://via.placeholder.com/80' }} style={EquipmentManageStyle.thumb} resizeMode="cover" />
              <View style={EquipmentManageStyle.cardInfo}>
                <Text style={[EquipmentManageStyle.cardName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[EquipmentManageStyle.cardCategory, { color: colors.textMuted }]}>{item.category}</Text>
                <Text style={[EquipmentManageStyle.cardRate, { color: colors.primary }]}>{formatCurrency(item.daily_rate)}/day</Text>
                <Text style={[EquipmentManageStyle.cardAvail, { color: item.available_quantity > 0 ? colors.success : colors.danger }]}>
                  {item.available_quantity}/{item.total_quantity} available
                </Text>
                {item.needs_maintenance && (
                  <View style={[EquipmentManageStyle.maintenanceBadge, { backgroundColor: colors.warningLight }]}>
                    <MaterialIcons name="build" size={11} color={colors.warning} />
                    <Text style={[EquipmentManageStyle.maintenanceText, { color: colors.warning }]}>
                      Needs Service
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={[EquipmentManageStyle.cardActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity style={EquipmentManageStyle.actionBtn} onPress={() => openEdit(item)}>
                <MaterialIcons name="edit" size={18} color={colors.accent} />
                <Text style={[EquipmentManageStyle.actionText, { color: colors.accent }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={EquipmentManageStyle.actionBtn} onPress={() => handleToggleActive(item)}>
                <MaterialIcons name={item.is_active ? 'visibility-off' : 'visibility'} size={18} color={colors.warning} />
                <Text style={[EquipmentManageStyle.actionText, { color: colors.warning }]}>{item.is_active ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={EquipmentManageStyle.actionBtn} onPress={() => handleDelete(item)}>
                <MaterialIcons name="delete" size={18} color={colors.danger} />
                <Text style={[EquipmentManageStyle.actionText, { color: colors.danger }]}>Delete</Text>
              </TouchableOpacity>
              {item.needs_maintenance && (
                <TouchableOpacity style={EquipmentManageStyle.actionBtn} onPress={() => handleClearMaintenance(item)}>
                  <MaterialIcons name="build" size={18} color={colors.success} />
                  <Text style={[EquipmentManageStyle.actionText, { color: colors.success }]}>Service</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="construction" title="No equipment found" subtitle="Add your first equipment item." />}
      />

      {/* Form Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={[EquipmentManageStyle.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[EquipmentManageStyle.modalCard, { backgroundColor: colors.surface }]}>
            <View style={[EquipmentManageStyle.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[EquipmentManageStyle.modalTitle, { color: colors.text }]}>
                {editingId ? 'Edit Equipment' : 'Add Equipment'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={EquipmentManageStyle.modalBody} keyboardShouldPersistTaps="handled">
              {/* Text fields */}
              {([
                { key: 'name', label: 'Equipment Name', placeholder: 'e.g. CAT 320 Excavator' },
                { key: 'description', label: 'Description', placeholder: 'Brief description...', multiline: true },
              ] as Array<{ key: keyof EquipmentForm; label: string; placeholder: string; multiline?: boolean }>).map((f) => (
                <View key={f.key} style={EquipmentManageStyle.fieldGroup}>
                  <Text style={[EquipmentManageStyle.label, { color: colors.textSecondary }]}>{f.label}</Text>
                  <View style={[EquipmentManageStyle.inputWrapper, { backgroundColor: colors.inputBg, borderColor: errors[f.key] ? colors.danger : colors.inputBorder }]}>
                    <TextInput
                      style={[EquipmentManageStyle.input, f.multiline && { minHeight: 72 }, { color: colors.text }]}
                      value={form[f.key]}
                      onChangeText={(v) => setField(f.key, v)}
                      placeholder={f.placeholder}
                      placeholderTextColor={colors.placeholder}
                      multiline={f.multiline}
                      textAlignVertical={f.multiline ? 'top' : 'center'}
                    />
                  </View>
                  {errors[f.key] ? <Text style={[EquipmentManageStyle.error, { color: colors.danger }]}>{errors[f.key]}</Text> : null}
                </View>
              ))}

              {/* Image upload */}
              <View style={EquipmentManageStyle.fieldGroup}>
                <Text style={[EquipmentManageStyle.label, { color: colors.textSecondary }]}>Equipment Image</Text>
                {form.image_url ? (
                  <Image source={{ uri: form.image_url }} style={EquipmentManageStyle.imagePreview} resizeMode="cover" />
                ) : null}
                <View style={EquipmentManageStyle.imageRow}>
                  <TouchableOpacity
                    style={[EquipmentManageStyle.uploadBtn, { backgroundColor: colors.cardAlt, borderColor: colors.inputBorder }]}
                    onPress={handleImageUpload}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <MaterialIcons name="cloud-upload" size={18} color={colors.primary} />
                    )}
                    <Text style={[EquipmentManageStyle.uploadBtnText, { color: colors.primary }]}>
                      {uploadingImage ? 'Uploading...' : form.image_url ? 'Change Image' : 'Upload Image'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={[EquipmentManageStyle.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, marginTop: 6 }]}>
                  <TextInput
                    style={[EquipmentManageStyle.input, { color: colors.text }]}
                    value={form.image_url}
                    onChangeText={(v) => setField('image_url', v)}
                    placeholder="Or paste image URL..."
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
              </View>

              {/* Numeric fields */}
              <View style={EquipmentManageStyle.ratesRow}>
                {([
                  { key: 'daily_rate', label: 'Daily Rate (₱)' },
                  { key: 'weekly_rate', label: 'Weekly Rate (₱)' },
                  { key: 'monthly_rate', label: 'Monthly Rate (₱)' },
                ] as Array<{ key: keyof EquipmentForm; label: string }>).map((f) => (
                  <View key={f.key} style={[EquipmentManageStyle.fieldGroup, { flex: 1 }]}>
                    <Text style={[EquipmentManageStyle.label, { color: colors.textSecondary }]}>{f.label}</Text>
                    <View style={[EquipmentManageStyle.inputWrapper, { backgroundColor: colors.inputBg, borderColor: errors[f.key] ? colors.danger : colors.inputBorder }]}>
                      <TextInput
                        style={[EquipmentManageStyle.input, { color: colors.text }]}
                        value={form[f.key]}
                        onChangeText={(v) => setField(f.key, v)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.placeholder}
                      />
                    </View>
                    {errors[f.key] ? <Text style={[EquipmentManageStyle.error, { color: colors.danger }]}>{errors[f.key]}</Text> : null}
                  </View>
                ))}
              </View>

              {/* Quantity */}
              <View style={EquipmentManageStyle.fieldGroup}>
                <Text style={[EquipmentManageStyle.label, { color: colors.textSecondary }]}>Total Quantity</Text>
                <View style={[EquipmentManageStyle.inputWrapper, { backgroundColor: colors.inputBg, borderColor: errors.total_quantity ? colors.danger : colors.inputBorder }]}>
                  <TextInput
                    style={[EquipmentManageStyle.input, { color: colors.text }]}
                    value={form.total_quantity}
                    onChangeText={(v) => setField('total_quantity', v)}
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
                {errors.total_quantity ? <Text style={[EquipmentManageStyle.error, { color: colors.danger }]}>{errors.total_quantity}</Text> : null}
              </View>

              {/* Category picker - multi-select */}
              <View style={EquipmentManageStyle.fieldGroup}>
                <Text style={[EquipmentManageStyle.label, { color: colors.textSecondary }]}>
                  Categories <Text style={{ fontWeight: '400', fontSize: 11 }}>(select all that apply)</Text>
                </Text>
                {form.categories.length === 0 && (
                  <Text style={[{ fontSize: 11, color: colors.danger, marginBottom: 4 }]}>Select at least one category</Text>
                )}
                <View style={EquipmentManageStyle.chipScroll}>
                  {EQUIPMENT_CATEGORIES.map((cat) => {
                    const selected = form.categories.includes(cat);
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[EquipmentManageStyle.chip, { backgroundColor: selected ? colors.primary : colors.cardAlt, borderColor: selected ? colors.primary : colors.border }]}
                        onPress={() => {
                          const cur = form.categories;
                          const next = selected ? cur.filter(c => c !== cat) : [...cur, cat];
                          setForm(p => ({ ...p, categories: next }));
                        }}
                      >
                        {selected && <MaterialIcons name="check" size={11} color="#FFF" />}
                        <Text style={[EquipmentManageStyle.chipText, { color: selected ? '#FFF' : colors.textSecondary }]}>{cat}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Condition picker */}
              <View style={EquipmentManageStyle.fieldGroup}>
                <Text style={[EquipmentManageStyle.label, { color: colors.textSecondary }]}>Condition</Text>
                <View style={EquipmentManageStyle.chipScroll}>
                  {EQUIPMENT_CONDITIONS.map((cond) => (
                    <TouchableOpacity
                      key={cond}
                      style={[EquipmentManageStyle.chip, { backgroundColor: form.condition === cond ? colors.success : colors.cardAlt, borderColor: form.condition === cond ? colors.success : colors.border }]}
                      onPress={() => setField('condition', cond)}
                    >
                      <Text style={[EquipmentManageStyle.chipText, { color: form.condition === cond ? '#FFF' : colors.textSecondary }]}>{cond}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Specs editor */}
              <View style={EquipmentManageStyle.fieldGroup}>
                <View style={EquipmentManageStyle.specsHeader}>
                  <Text style={[EquipmentManageStyle.label, { color: colors.textSecondary }]}>Specifications</Text>
                  <TouchableOpacity
                    style={[EquipmentManageStyle.addSpecBtn, { backgroundColor: colors.primaryLight }]}
                    onPress={() => setSpecEntries(p => [...p, { key: '', value: '', id: String(Date.now()) }])}
                  >
                    <MaterialIcons name="add" size={14} color={colors.primary} />
                    <Text style={[EquipmentManageStyle.addSpecText, { color: colors.primary }]}>Add Spec</Text>
                  </TouchableOpacity>
                </View>
                {specEntries.length === 0 ? (
                  <Text style={[EquipmentManageStyle.specsEmpty, { color: colors.textMuted }]}>
                    No specs yet. Tap "Add Spec" to add technical details like weight, dimensions, etc.
                  </Text>
                ) : (
                  specEntries.map((entry, idx) => (
                    <View key={entry.id} style={[EquipmentManageStyle.specRow, { borderColor: colors.border }]}>
                      <View style={[EquipmentManageStyle.specKeyInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                        <TextInput
                          style={[EquipmentManageStyle.specInputText, { color: colors.text }]}
                          value={entry.key}
                          onChangeText={(v) => setSpecEntries(p => p.map((e, i) => i === idx ? { ...e, key: v } : e))}
                          placeholder="e.g. Weight"
                          placeholderTextColor={colors.placeholder}
                        />
                      </View>
                      <View style={[EquipmentManageStyle.specValInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                        <TextInput
                          style={[EquipmentManageStyle.specInputText, { color: colors.text }]}
                          value={entry.value}
                          onChangeText={(v) => setSpecEntries(p => p.map((e, i) => i === idx ? { ...e, value: v } : e))}
                          placeholder="e.g. 22,000 kg"
                          placeholderTextColor={colors.placeholder}
                        />
                      </View>
                      <TouchableOpacity
                        style={[EquipmentManageStyle.removeSpecBtn, { backgroundColor: colors.dangerLight }]}
                        onPress={() => setSpecEntries(p => p.filter((_, i) => i !== idx))}
                      >
                        <MaterialIcons name="close" size={14} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              <TouchableOpacity
                style={[EquipmentManageStyle.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? <ActivityIndicator color="#FFF" /> : (
                  <Text style={EquipmentManageStyle.saveBtnText}>{editingId ? 'Save Changes' : 'Add Equipment'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default EquipmentManage;
