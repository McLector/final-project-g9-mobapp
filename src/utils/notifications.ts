import { Alert, Platform } from 'react-native';

type NotifyOptions = {
  title: string;
  body: string;
  nativeAlert?: boolean;
};

const SERVICE_WORKER_PATH = '/constructrent-sw.js';

export const initializeNotifications = async () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  const navigatorWithSw = window.navigator as Navigator & {
    serviceWorker?: ServiceWorkerContainer;
  };

  try {
    if (navigatorWithSw.serviceWorker) {
      await navigatorWithSw.serviceWorker.register(SERVICE_WORKER_PATH);
    }

    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  } catch {
    // Notifications are optional; the app should keep working if the browser blocks them.
  }
};

export const notifyUser = async ({ title, body, nativeAlert = true }: NotifyOptions) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('Notification' in window)) {
    if (nativeAlert) Alert.alert(title, body);
    return;
  }

  try {
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission !== 'granted') {
      Alert.alert(title, body);
      return;
    }

    const registration = await navigator.serviceWorker?.ready;
    if (registration?.showNotification) {
      await registration.showNotification(title, {
        body,
        icon: '/assets/icon.png',
        badge: '/assets/favicon.png',
      });
      return;
    }

    new Notification(title, { body, icon: '/assets/icon.png' });
  } catch {
    Alert.alert(title, body);
  }
};
