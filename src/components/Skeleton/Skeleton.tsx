import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import useTheme from '../../hooks/useTheme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// Single skeleton box with shimmer
export const SkeletonBox = ({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) => {
  const { colors, isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });
  const base = isDark ? '#334155' : '#E2E8F0';
  const highlight = isDark ? '#475569' : '#F1F5F9';

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: base,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Equipment card skeleton
export const EquipmentCardSkeleton = () => {
  const { colors } = useTheme();
  return (
    <View style={[skeletonStyles.equipCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
      <SkeletonBox height={180} borderRadius={0} />
      <View style={skeletonStyles.equipBody}>
        <SkeletonBox height={12} width="40%" borderRadius={6} />
        <SkeletonBox height={18} width="85%" borderRadius={6} />
        <SkeletonBox height={13} width="100%" borderRadius={6} />
        <SkeletonBox height={13} width="75%" borderRadius={6} />
        <View style={skeletonStyles.equipFooter}>
          <SkeletonBox height={22} width="45%" borderRadius={6} />
          <SkeletonBox height={14} width="30%" borderRadius={6} />
        </View>
      </View>
    </View>
  );
};

// Rental card skeleton
export const RentalCardSkeleton = () => {
  const { colors } = useTheme();
  return (
    <View style={[skeletonStyles.rentalCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
      <View style={skeletonStyles.rentalRow}>
        <SkeletonBox width={64} height={64} borderRadius={10} />
        <View style={skeletonStyles.rentalInfo}>
          <SkeletonBox height={15} width="80%" borderRadius={6} />
          <SkeletonBox height={12} width="65%" borderRadius={6} />
          <SkeletonBox height={11} width="40%" borderRadius={6} />
        </View>
        <View style={skeletonStyles.rentalRight}>
          <SkeletonBox height={18} width={70} borderRadius={6} />
        </View>
      </View>
      <View style={[skeletonStyles.rentalFooter, { borderTopColor: colors.border }]}>
        <SkeletonBox height={20} width={80} borderRadius={10} />
        <SkeletonBox height={12} width={60} borderRadius={6} />
      </View>
    </View>
  );
};

// Stat card skeleton (for dashboards)
export const StatCardSkeleton = () => {
  const { colors } = useTheme();
  return (
    <View style={[skeletonStyles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <SkeletonBox width={38} height={38} borderRadius={19} />
      <SkeletonBox height={18} width="60%" borderRadius={6} />
      <SkeletonBox height={11} width="40%" borderRadius={6} />
    </View>
  );
};

// List of n skeletons
export const SkeletonList = ({ count = 3, type = 'equipment' }: { count?: number; type?: 'equipment' | 'rental' }) => (
  <>
    {Array.from({ length: count }).map((_, i) =>
      type === 'equipment' ? (
        <EquipmentCardSkeleton key={i} />
      ) : (
        <RentalCardSkeleton key={i} />
      )
    )}
  </>
);

const skeletonStyles = StyleSheet.create({
  equipCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  equipBody: {
    padding: 14,
    gap: 8,
  },
  equipFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  rentalCard: {
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  rentalRow: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    alignItems: 'center',
  },
  rentalInfo: {
    flex: 1,
    gap: 7,
  },
  rentalRight: {
    alignItems: 'flex-end',
  },
  rentalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
  },
});
