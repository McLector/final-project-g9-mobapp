import React, { useCallback, useEffect, useState } from 'react';
import {
  DeviceEventEmitter,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../../src/lib/supabase';
import useAuth from '../../../../src/hooks/useAuth';
import { FAVORITES_CHANGED_EVENT } from '../Favorites/Favorites';
import useTheme from '../../../../src/hooks/useTheme';
import { Equipment, CustomerStackParamList, EquipmentCategory } from '../../../../src/types';
import { EQUIPMENT_CATEGORIES } from '../../../../src/constants';
import EquipmentCard from '../../../../src/components/EquipmentCard/EquipmentCard';
import EmptyState from '../../../../src/components/EmptyState/EmptyState';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';
import CatalogStyle from './CatalogStyle';

type Props = {
  navigation: NativeStackNavigationProp<CustomerStackParamList>;
};

const CATEGORY_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  All: 'apps',
  Excavation: 'terrain',
  Lifting: 'arrow-upward',
  'Concrete & Masonry': 'foundation',
  'Road & Paving': 'traffic',
  Compaction: 'compress',
  'Material Handling': 'local-shipping',
  Drilling: 'rotate-right',
  'Aerial & Access': 'flight-takeoff',
};

const Catalog = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filtered, setFiltered] = useState<Equipment[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EquipmentCategory | 'All'>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc'>('default');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('equipment')
      .select('*')
      .eq('is_active', true)
      .order('name'); // Show all active regardless of availability
    if (data) {
      setEquipment(data as Equipment[]);
      setFiltered(data as Equipment[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadFavorites = useCallback(async () => {
    if (!user?.id) return;
    const raw = await AsyncStorage.getItem(`@starkrent_favorites_${user.id}_v1`);
    setFavorites(raw ? JSON.parse(raw) : []);
  }, [user?.id]);

  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  // Sync when Favorites page removes an item
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(FAVORITES_CHANGED_EVENT, loadFavorites);
    return () => sub.remove();
  }, [loadFavorites]);

  const toggleFavorite = async (id: string) => {
    if (!user?.id) return;
    const key = `@starkrent_favorites_${user.id}_v1`;
    const newFavs = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(newFavs);
    await AsyncStorage.setItem(key, JSON.stringify(newFavs));
    DeviceEventEmitter.emit(FAVORITES_CHANGED_EVENT);
  };

  useEffect(() => {
    let result = [...equipment];
    if (selectedCategory !== 'All') {
      result = result.filter((e) => e.category === selectedCategory);
    }
    if (search.trim()) {
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (sortBy === 'price_asc') result.sort((a, b) => a.daily_rate - b.daily_rate);
    if (sortBy === 'price_desc') result.sort((a, b) => b.daily_rate - a.daily_rate);
    setFiltered(result);
  }, [search, selectedCategory, equipment, sortBy]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const categories: Array<EquipmentCategory | 'All'> = ['All', ...EQUIPMENT_CATEGORIES];

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: colors.surface }]}>
        <View style={s.headerTop}>
          <View>
            <Text style={[s.title, { color: colors.text }]}>Equipment</Text>
            <Text style={[s.subtitle, { color: colors.textMuted }]}>
              {filtered.length} item{filtered.length !== 1 ? 's' : ''} available
            </Text>
          </View>
        </View>

        {/* Search */}
        <View style={[s.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            placeholder="Search equipment..."
            placeholderTextColor={colors.placeholder}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={s.clearBtn}>
              <MaterialIcons name="close" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Category Filters ── */}
      <View style={[s.filterWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterScroll}
        >
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            const iconName = CATEGORY_ICONS[cat] ?? 'category';
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  s.filterChip,
                  active
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1 },
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <MaterialIcons
                  name={iconName}
                  size={13}
                  color={active ? '#fff' : colors.textSecondary}
                />
                <Text style={[s.filterText, { color: active ? '#fff' : colors.textSecondary }]}>
                  {cat === 'All' ? 'All' : cat.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={CatalogStyle.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <EquipmentCard
            item={item}
            onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: item.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="search-off"
            title="No equipment found"
            subtitle="Try adjusting your search or category filter"
          />
        }
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerTop: {
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  clearBtn: {
    padding: 2,
  },
  filterWrap: {
    borderBottomWidth: 1,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
    marginRight: 4,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  list: {
    paddingTop: 16,
    paddingBottom: 24,
  },
});

export default Catalog;
