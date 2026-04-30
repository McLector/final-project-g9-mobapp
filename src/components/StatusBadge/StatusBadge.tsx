import React from 'react';
import { Text, View } from 'react-native';
import useTheme from '../../hooks/useTheme';
import { getStatusColors } from '../../styles/theme';
import { STATUS_LABELS } from '../../constants';
import StatusBadgeStyle from './StatusBadgeStyle';

interface Props {
  status: string;
}

const StatusBadge = ({ status }: Props) => {
  const { colors } = useTheme();
  const sc = getStatusColors(status, colors);
  return (
    <View style={[StatusBadgeStyle.badge, { backgroundColor: sc.bg }]}>
      <Text style={[StatusBadgeStyle.text, { color: sc.text }]}>
        {STATUS_LABELS[status] ?? status}
      </Text>
    </View>
  );
};

export default StatusBadge;
