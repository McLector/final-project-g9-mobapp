import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';
import { Rental } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';
import StatusBadge from '../StatusBadge/StatusBadge';
import RentalCardStyle from './RentalCardStyle';

interface Props {
  item: Rental;
  onPress: () => void;
}

const RentalCard = ({ item, onPress }: Props) => {
  const { colors } = useTheme();
  const equipment = item.equipment;

  return (
    <TouchableOpacity
      style={[RentalCardStyle.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={RentalCardStyle.row}>
        {equipment?.image_url ? (
          <Image
            source={{ uri: equipment.image_url }}
            style={RentalCardStyle.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[RentalCardStyle.thumbnailPlaceholder, { backgroundColor: colors.cardAlt }]}>
            <MaterialIcons name="construction" size={24} color={colors.textMuted} />
          </View>
        )}

        <View style={RentalCardStyle.info}>
          <Text style={[RentalCardStyle.name, { color: colors.text }]} numberOfLines={1}>
            {equipment?.name ?? 'Equipment'}
          </Text>
          <Text style={[RentalCardStyle.dates, { color: colors.textMuted }]}>
            {formatDate(item.start_date)} → {formatDate(item.end_date)}
          </Text>
          <Text style={[RentalCardStyle.qty, { color: colors.textSecondary }]}>
            Qty: {item.quantity} · {item.duration_type}
          </Text>
        </View>

        <View style={RentalCardStyle.right}>
          <Text style={[RentalCardStyle.cost, { color: colors.primary }]}>
            {formatCurrency(item.total_cost)}
          </Text>
        </View>
      </View>

      <View style={[RentalCardStyle.footer, { borderTopColor: colors.border }]}>
        <StatusBadge status={item.status} />
        <Text style={[RentalCardStyle.date, { color: colors.textMuted }]}>
          {formatDate(item.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default RentalCard;
