import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useTheme from '../../hooks/useTheme';
import { Equipment } from '../../types';
import { formatCurrency } from '../../utils/format';
import EquipmentCardStyle from './EquipmentCardStyle';

interface Props {
  item: Equipment;
  onPress: () => void;
  horizontal?: boolean;
  isFavorited?: boolean;
  onFavorite?: () => void;
}

const EquipmentCard = ({ item, onPress, horizontal, isFavorited, onFavorite }: Props) => {
  const { colors } = useTheme();
  const isAvailable = item.available_quantity > 0;
  const s = EquipmentCardStyle;

  if (horizontal) {
    return (
      <TouchableOpacity
        style={[s.hCard, { backgroundColor: colors.card, shadowColor: '#000' }]}
        onPress={onPress}
        activeOpacity={0.88}
      >
        <View style={s.hImageWrap}>
          <Image
            source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' }}
            style={s.hImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={s.hGradient}
          />
          <View style={[s.availDot, { backgroundColor: isAvailable ? colors.success : colors.danger }]} />
          {onFavorite && (
            <TouchableOpacity 
              style={s.favBtn} 
              onPress={(e) => {
                e.stopPropagation();
                onFavorite();
              }}
            >
              <MaterialIcons name={isFavorited ? "favorite" : "favorite-border"} size={16} color={isFavorited ? "#FF4B4B" : "#FFF"} />
            </TouchableOpacity>
          )}
        </View>
        <View style={s.hBody}>
          <View style={[s.catTag, { backgroundColor: colors.primaryLight }]}>
            <Text style={[s.catTagText, { color: colors.primary }]}>{item.category}</Text>
          </View>
          <Text style={[s.hName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
          <Text style={[s.hRate, { color: colors.primary }]}>
            {formatCurrency(item.daily_rate)}<Text style={[s.hRateUnit, { color: colors.textMuted }]}>/day</Text>
          </Text>
          <Text style={[s.hAvail, { color: isAvailable ? colors.success : colors.danger }]}>
            {isAvailable ? `${item.available_quantity} units available` : 'Not available'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.card, shadowColor: '#000' }]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={s.imageWrapper}>
        <Image
          source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600' }}
          style={s.image}
          resizeMode="cover"
        />
        {onFavorite && (
          <TouchableOpacity 
            style={s.favBtn} 
            onPress={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
          >
            <MaterialIcons name={isFavorited ? "favorite" : "favorite-border"} size={18} color={isFavorited ? "#FF4B4B" : "#FFF"} />
          </TouchableOpacity>
        )}
        <View
          style={[
            s.availabilityBadge,
            { backgroundColor: isAvailable ? colors.success : colors.danger },
          ]}
        >
          <Text style={s.availabilityText}>
            {isAvailable ? `${item.available_quantity} Available` : 'Unavailable'}
          </Text>
        </View>
        <View style={[s.categoryBadge, { backgroundColor: colors.overlay }]}>
          <Text style={s.categoryText}>{item.category}</Text>
        </View>
      </View>

      <View style={[s.body, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[s.description, { color: colors.textMuted }]} numberOfLines={2}>{item.description}</Text>
        <View style={s.footer}>
          <View>
            <Text style={[s.rateLabel, { color: colors.textMuted }]}>From</Text>
            <Text style={[s.rate, { color: colors.primary }]}>
              {formatCurrency(item.daily_rate)}
              <Text style={[s.rateUnit, { color: colors.textMuted }]}> /day</Text>
            </Text>
          </View>
          <View style={[s.conditionRow, { backgroundColor: `${colors.success}18` }]}>
            <MaterialIcons name="verified" size={11} color={colors.success} />
            <Text style={[s.condition, { color: colors.success }]}>{item.condition}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default EquipmentCard;
