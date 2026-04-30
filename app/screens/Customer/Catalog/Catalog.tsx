import React, { useCallback, useEffect, useState } from 'react';
import {
  DeviceEventEmitter,
  FlatList,
  RefreshControl,
  ScrollView,
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
import { SkeletonList } from '../../../../src/components/Skeleton/Skeleton';
import CatalogStyle from './CatalogStyle';

type Props = {
  navigation: NativeStackNavigationProp<CustomerStackParamList>;
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
      result = result.filter((e) => {
        const inArray = Array.isArray(e.categories) && e.categories.includes(selectedCategory);
        const inSingle = e.category === selectedCategory;
        return inArray || inSingle;
      });
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
    <SafeAreaView edges={['top']} style={[CatalogStyle.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[CatalogStyle.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[CatalogStyle.title, { color: colors.text }]}>Equipment Catalog</Text>
        <Text style={[CatalogStyle.subtitle, { color: colors.textMuted }]}>
          {filtered.length} items available
        </Text>

        {/* Search */}
        <View style={[CatalogStyle.searchWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={[CatalogStyle.searchInput, { color: colors.text }]}
            placeholder="Search equipment..."
            placeholderTextColor={colors.placeholder}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialIcons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={CatalogStyle.categoryScroll}
        style={[CatalogStyle.categoryBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              CatalogStyle.categoryChip,
              selectedCategory === cat
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.cardAlt, borderColor: colors.border },
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                CatalogStyle.categoryText,
                { color: selectedCategory === cat ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort bar */}
      <View style={[CatalogStyle.sortBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[CatalogStyle.sortLabel, { color: colors.textMuted }]}>Sort:</Text>
        {([
          { key: 'default', label: 'Default' },
          { key: 'price_asc', label: 'Price ↑' },
          { key: 'price_desc', label: 'Price ↓' },
        ] as const).map(s => (
          <TouchableOpacity
            key={s.key}
            style={[CatalogStyle.sortChip,
              sortBy === s.key
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.cardAlt, borderColor: colors.border }
            ]}
            onPress={() => setSortBy(s.key)}
          >
            <Text style={[CatalogStyle.sortText, { color: sortBy === s.key ? '#FFF' : colors.textSecondary }]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List or skeleton */}
      {loading ? (
        <View style={{ padding: 16 }}>
          <SkeletonList count={4} type="equipment" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={CatalogStyle.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <EquipmentCard
              item={item}
              onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: item.id })}
              isFavorited={favorites.includes(item.id)}
              onFavorite={() => toggleFavorite(item.id)}
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
      )}
    </SafeAreaView>
  );
};

export default Catalog;
