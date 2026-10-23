import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { logger } from './logger';

const IS_WEB = Platform.OS === 'web';

export const requestNotificationPermission = async () => {
  if (IS_WEB) {
    logger.debug('Web environment: Notification permissions bypassed.');
    return false;
  }
  
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      return newStatus === 'granted';
    }
    return true;
  } catch (error) {
    logger.warn('Notification permission error safely caught:', error);
    return false;
  }
};

export const scheduleReminder = async (type: 'morning' | 'evening' | 'custom' | 'none') => {
  if (IS_WEB) {
    logger.debug(`Web environment: ${type} schedule bypassed.`);
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (type === 'none') return;

    let hour = 8; // Default morning
    if (type === 'evening') hour = 20;

    if (type === 'custom') {
      logger.debug('TODO: Implement custom time picker');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Captain's Log",
        body: "How are the waters looking today, Captain?",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hour,
        minute: 0,
      },
    });
  } catch (error) {
    logger.warn('Notification scheduling error safely caught:', error);
  }
};
