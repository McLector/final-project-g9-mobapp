import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';
import { Equipment } from '../../types';
import { formatCurrency } from '../../utils/format';
import EquipmentCardStyle from './EquipmentCardStyle';

interface Props {
  item: Equipment;
  onPress: () => void;
  isFavorited?: boolean;
  onFavorite?: () => void;
}

const EquipmentCard = ({ item, onPress, isFavorited, onFavorite }: Props) => {
  const { colors } = useTheme();
  const isAvailable = item.available_quantity > 0;

  return (
    <TouchableOpacity
      style={[EquipmentCardStyle.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={EquipmentCardStyle.imageWrapper}>
        <Image
          source={{ uri: item.image_url || 'https://via.placeholder.com/400x240' }}
          style={EquipmentCardStyle.image}
          resizeMode="cover"
        />
        {onFavorite && (
          <TouchableOpacity
            style={[EquipmentCardStyle.favBtn]}
            onPress={onFavorite}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons
              name={isFavorited ? 'favorite' : 'favorite-border'}
              size={18}
              color={isFavorited ? '#F97316' : '#FFFFFF'}
            />
          </TouchableOpacity>
        )}
        <View
          style={[
            EquipmentCardStyle.availabilityBadge,
            { backgroundColor: isAvailable ? colors.success : colors.danger },
          ]}
        >
          <Text style={EquipmentCardStyle.availabilityText}>
            {isAvailable ? `${item.available_quantity} Available` : 'Unavailable'}
          </Text>
        </View>
        <View style={[EquipmentCardStyle.categoryBadge, { backgroundColor: colors.overlay }]}>
          <Text style={EquipmentCardStyle.categoryText}>
            {Array.isArray(item.categories) && item.categories.length > 0
              ? item.categories.join(' · ')
              : item.category}
          </Text>
        </View>
      </View>

      <View style={[EquipmentCardStyle.body, { borderTopColor: colors.border }]}>
        <Text style={[EquipmentCardStyle.name, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[EquipmentCardStyle.description, { color: colors.textMuted }]} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={EquipmentCardStyle.footer}>
          <View>
            <Text style={[EquipmentCardStyle.rateLabel, { color: colors.textMuted }]}>From</Text>
            <Text style={[EquipmentCardStyle.rate, { color: colors.primary }]}>
              {formatCurrency(item.daily_rate)}
              <Text style={[EquipmentCardStyle.rateUnit, { color: colors.textMuted }]}>/day</Text>
            </Text>
          </View>
          <View style={EquipmentCardStyle.conditionRow}>
            <MaterialIcons name="verified" size={12} color={colors.success} />
            <Text style={[EquipmentCardStyle.condition, { color: colors.textMuted }]}>
              {item.condition}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default EquipmentCard;
