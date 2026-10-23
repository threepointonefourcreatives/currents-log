import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

export interface UserProfile {
  name?: string;
  mantra?: string;
  avatarUri?: string;
  talismanUri?: string;
  notificationSchedule?: 'morning' | 'evening' | 'custom' | 'none';
}

const PROFILE_KEY = '@captain_profile';

export const loadProfile = async (): Promise<UserProfile | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(PROFILE_KEY);
    const data = jsonValue != null ? JSON.parse(jsonValue) : null;
    logger.debug('Profile loaded', { hasProfile: data != null });
    return data;
  } catch (error) {
    logger.error('Error loading profile:', error);
    return null;
  }
};

export const saveProfile = async (updates: Partial<UserProfile>): Promise<void> => {
  try {
    const currentProfile = await loadProfile();
    const mergedData = { ...(currentProfile || {}), ...updates };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(mergedData));
    logger.debug('Profile saved');
  } catch (error) {
    logger.error('Error saving profile:', error);
  }
};
