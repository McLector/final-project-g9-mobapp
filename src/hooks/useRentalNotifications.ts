import { useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import useAuth from './useAuth';
import { saveNotification } from './useNotifications';

const LAST_CHECK_KEY = '@starkrent_last_notification_check_v2';

const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  approved: { title: '✓ Rental Approved', body: 'Your rental request has been approved!' },
  rejected: { title: 'Rental Declined', body: 'Your rental request was declined by admin.' },
  active: { title: '🚀 Rental Active', body: 'Your equipment rental is now active.' },
  returned: { title: 'Rental Complete', body: 'Your rental has been marked as returned.' },
  cancelled: { title: 'Rental Cancelled', body: 'A rental request was cancelled.' },
};

const useRentalNotifications = () => {
  const { user, session } = useAuth();
  const { showSuccess, showInfo, showError } = useToast();

  const checkForUpdates = useCallback(async () => {
    if (!user?.id || !session) return;

    try {
      const raw = await AsyncStorage.getItem(LAST_CHECK_KEY);
      const lastCheck = raw ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data } = await supabase
        .from('rentals')
        .select('id, status, equipment:equipment(name), updated_at')
        .eq('customer_id', user.id)
        .gt('updated_at', lastCheck)
        .in('status', ['approved', 'rejected', 'active', 'returned'])
        .order('updated_at', { ascending: false })
        .limit(5);

      if (data && data.length > 0) {
        for (let i = 0; i < data.length; i++) {
          const rental = data[i];
          const equipName = (rental as unknown as { equipment: { name: string } }).equipment?.name ?? 'Equipment';
          const msg = STATUS_MESSAGES[rental.status];
          if (!msg) continue;

          // Save to notification store
          await saveNotification(user.id, {
            type: 'rental_status',
            title: msg.title,
            body: `${equipName}: ${msg.body}`,
            rentalId: rental.id,
          });

          setTimeout(() => {
            if (rental.status === 'approved' || rental.status === 'active') {
              showSuccess(`${equipName}: ${msg.body}`);
            } else if (rental.status === 'rejected') {
              showError(`${equipName}: ${msg.body}`);
            } else {
              showInfo(`${equipName}: ${msg.body}`);
            }
          }, i * 900);
        }
      }

      await AsyncStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
    } catch {}
  }, [user?.id, session]);

  useEffect(() => {
    if (user?.id) {
      const timer = setTimeout(checkForUpdates, 1500);
      return () => clearTimeout(timer);
    }
  }, [user?.id, checkForUpdates]);
};

export default useRentalNotifications;
