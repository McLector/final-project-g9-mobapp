import React from 'react';
import { Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';
import EmptyStateStyle from './EmptyStateStyle';

interface Props {
  icon?: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const EmptyState = ({ icon = 'inbox', title, subtitle, action }: Props) => {
  const { colors } = useTheme();
  return (
    <View style={EmptyStateStyle.container}>
      <View style={[EmptyStateStyle.iconWrapper, { backgroundColor: colors.cardAlt }]}>
        <MaterialIcons name={icon} size={40} color={colors.textMuted} />
      </View>
      <Text style={[EmptyStateStyle.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[EmptyStateStyle.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      ) : null}
      {action}
    </View>
  );
};

export default EmptyState;
