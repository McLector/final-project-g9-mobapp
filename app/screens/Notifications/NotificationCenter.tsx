import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList, RefreshControl, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import useAuth from '../../../src/hooks/useAuth';
import useTheme from '../../../src/hooks/useTheme';
import {
  AppNotification,
  getNotifications,
  markAllRead,
  markOneRead,
  clearAllNotifications,
} from '../../../src/hooks/useNotifications';

type Props = { navigation: NativeStackNavigationProp<any> };

const TYPE_CONFIG = {
  rental_status: { icon: 'receipt-long' as const, color: '#3B82F6' },
  extension: { icon: 'event' as const, color: '#F59E0B' },
  chat: { icon: 'chat' as const, color: '#8B5CF6' },
  system: { icon: 'notifications' as const, color: '#6B7280' },
};

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const NotificationCenter = ({ navigation }: Props) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const notifs = await getNotifications(user.id);
    setNotifications(notifs);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    await markAllRead(user.id);
    setNotifications(p => p.map(n => ({ ...n, isRead: true })));
  };

  const handleClearAll = async () => {
    if (!user?.id) return;
    await clearAllNotifications(user.id);
    setNotifications([]);
  };

  const handleTap = async (notif: AppNotification) => {
    if (!user?.id) return;
    // Mark as read
    await markOneRead(user.id, notif.id);
    setNotifications(p => p.map(n => n.id === notif.id ? { ...n, isRead: true } : n));

    // Navigate to relevant screen
    if (notif.rentalId) {
      // Determine if user is admin or customer by checking user.role
      const isAdmin = user.role === 'admin';
      if (isAdmin) {
        navigation.navigate('RentalDetail', { rentalId: notif.rentalId });
      } else {
        navigation.navigate('CustomerRentalDetail', { rentalId: notif.rentalId });
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: colors.surface,
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>
              {unreadCount} unread
            </Text>
          )}
        </View>
        {notifications.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={{ padding: 6 }}
                onPress={handleMarkAllRead}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                  Mark all read
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={{ padding: 6 }} onPress={handleClearAll}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.danger }}>Clear all</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.system;
          return (
            <TouchableOpacity
              onPress={() => handleTap(item)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                backgroundColor: item.isRead ? colors.background : `${colors.primary}08`,
              }}
            >
              {/* Icon */}
              <View style={{
                width: 42, height: 42, borderRadius: 21,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${cfg.color}18`,
              }}>
                <MaterialIcons name={cfg.icon} size={20} color={cfg.color} />
              </View>

              {/* Content */}
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: item.isRead ? '600' : '800',
                    color: colors.text,
                    flex: 1,
                  }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!item.isRead && (
                    <View style={{
                      width: 8, height: 8, borderRadius: 4,
                      backgroundColor: colors.primary,
                    }} />
                  )}
                </View>
                <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18 }} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  {timeAgo(item.createdAt)}
                </Text>
              </View>

              {/* Chevron if tappable */}
              {item.rentalId && (
                <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80, gap: 12 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: colors.cardAlt,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <MaterialIcons name="notifications-none" size={32} color={colors.textMuted} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>No notifications</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 }}>
              You're all caught up! Rental updates will appear here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default NotificationCenter;
