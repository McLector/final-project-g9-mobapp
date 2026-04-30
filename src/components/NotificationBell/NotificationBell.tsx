import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useAuth from '../../hooks/useAuth';
import useTheme from '../../hooks/useTheme';
import { getUnreadCount } from '../../hooks/useNotifications';

export const NOTIFICATIONS_CHANGED = 'notifications_changed';

interface Props {
  onPress: () => void;
  lightIcon?: boolean;
}

const NotificationBell = ({ onPress, lightIcon = true }: Props) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const count = await getUnreadCount(user.id);
    setUnread(count);
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(NOTIFICATIONS_CHANGED, refresh);
    return () => sub.remove();
  }, [refresh]);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ padding: 4 }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <MaterialIcons
        name={unread > 0 ? 'notifications' : 'notifications-none'}
        size={24}
        color={lightIcon ? '#FFFFFF' : colors.text}
      />
      {unread > 0 && (
        <View style={{
          position: 'absolute', top: 0, right: 0,
          minWidth: 15, height: 15, borderRadius: 8,
          backgroundColor: colors.danger,
          alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 2,
          borderWidth: 1.5,
          borderColor: lightIcon ? '#0F172A' : colors.surface,
        }}>
          <Text style={{ color: '#FFF', fontSize: 8, fontWeight: '800', lineHeight: 10 }}>
            {unread > 9 ? '9+' : String(unread)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default NotificationBell;
