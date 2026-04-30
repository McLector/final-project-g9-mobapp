import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList, RefreshControl, Text, TouchableOpacity, View,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../../../src/lib/supabase';
import useAuth from '../../../../src/hooks/useAuth';
import useTheme from '../../../../src/hooks/useTheme';
import { Equipment, CustomerStackParamList } from '../../../../src/types';
import EquipmentCard from '../../../../src/components/EquipmentCard/EquipmentCard';
import EmptyState from '../../../../src/components/EmptyState/EmptyState';
import LoadingSpinner from '../../../../src/components/LoadingSpinner/LoadingSpinner';

type Props = { navigation: NativeStackNavigationProp<CustomerStackParamList> };

export const getFavoritesKey = (userId: string) => `@starkrent_favorites_${userId}_v1`;
export const FAVORITES_CHANGED_EVENT = 'favorites_changed';

const Favorites = ({ navigation }: Props) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getFavIds = useCallback(async (): Promise<string[]> => {
    if (!user?.id) return [];
    const raw = await AsyncStorage.getItem(getFavoritesKey(user.id));
    return raw ? JSON.parse(raw) : [];
  }, [user?.id]);

  const load = useCallback(async () => {
    const ids = await getFavIds();
    setFavorites(ids);
    if (ids.length === 0) {
      setEquipment([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data } = await supabase.from('equipment').select('*').in('id', ids);
    setEquipment((data ?? []) as Equipment[]);
    setLoading(false);
    setRefreshing(false);
  }, [getFavIds]);

  useEffect(() => { load(); }, [load]);

  // Listen for favorites changes from Catalog
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(FAVORITES_CHANGED_EVENT, load);
    return () => sub.remove();
  }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const removeFavorite = async (id: string) => {
    if (!user?.id) return;
    const ids = await getFavIds();
    const newIds = ids.filter(i => i !== id);
    await AsyncStorage.setItem(getFavoritesKey(user.id), JSON.stringify(newIds));
    setFavorites(newIds);
    setEquipment(p => p.filter(e => e.id !== id));
    // Notify Catalog to update heart state
    DeviceEventEmitter.emit(FAVORITES_CHANGED_EVENT);
  };

  if (loading) return <LoadingSpinner message="Loading favorites..." />;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: colors.surface,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Favorites</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>
            {equipment.length} saved item{equipment.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <MaterialIcons name="favorite" size={22} color={colors.danger} />
      </View>

      <FlatList
        data={equipment}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <EquipmentCard
            item={item}
            onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: item.id })}
            isFavorited={favorites.includes(item.id)}
            onFavorite={() => removeFavorite(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="favorite-border"
            title="No favorites yet"
            subtitle="Tap the heart icon on any equipment card to save it here"
          />
        }
      />
    </SafeAreaView>
  );
};

export default Favorites;
