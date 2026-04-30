import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import useTheme from '../../hooks/useTheme';
import LoadingSpinnerStyle from './LoadingSpinnerStyle';

interface Props {
  message?: string;
  size?: 'small' | 'large';
}

const LoadingSpinner = ({ message, size = 'large' }: Props) => {
  const { colors } = useTheme();
  return (
    <View style={[LoadingSpinnerStyle.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message ? (
        <Text style={[LoadingSpinnerStyle.text, { color: colors.textMuted }]}>{message}</Text>
      ) : null}
    </View>
  );
};

export default LoadingSpinner;
