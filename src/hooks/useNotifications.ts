import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface AppNotification {
  id: string;
  type: 'rental_status' | 'extension' | 'chat' | 'system';
  title: string;
  body: string;
  rentalId?: string;
  isRead: boolean;
  createdAt: string;
}

const getKey = (userId: string) => `@starkrent_notifications_${userId}_v1`;

export const saveNotification = async (userId: string, notif: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>) => {
  try {
    const key = getKey(userId);
    const raw = await AsyncStorage.getItem(key);
    const existing: AppNotification[] = raw ? JSON.parse(raw) : [];
    const newNotif: AppNotification = {
      ...notif,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    // Keep max 50 notifications
    const updated = [newNotif, ...existing].slice(0, 50);
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return newNotif;
  } catch {
    return null;
  }
};

export const getNotifications = async (userId: string): Promise<AppNotification[]> => {
  try {
    const raw = await AsyncStorage.getItem(getKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const markAllRead = async (userId: string) => {
  try {
    const notifs = await getNotifications(userId);
    const updated = notifs.map(n => ({ ...n, isRead: true }));
    await AsyncStorage.setItem(getKey(userId), JSON.stringify(updated));
  } catch {}
};

export const markOneRead = async (userId: string, notifId: string) => {
  try {
    const notifs = await getNotifications(userId);
    const updated = notifs.map(n => n.id === notifId ? { ...n, isRead: true } : n);
    await AsyncStorage.setItem(getKey(userId), JSON.stringify(updated));
  } catch {}
};

export const clearAllNotifications = async (userId: string) => {
  try {
    await AsyncStorage.removeItem(getKey(userId));
  } catch {}
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  const notifs = await getNotifications(userId);
  return notifs.filter(n => !n.isRead).length;
};
