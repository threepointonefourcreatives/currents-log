import React, { useState, useCallback } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { loadProfile, saveProfile, UserProfile } from '../src/utils/profileStore';
import { Colors, Typography, Spacing, MoodColors, Radii } from '../src/theme/theme';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { getLogs } from '../src/utils/db';
import { requestNotificationPermission, scheduleReminder } from '../src/utils/notifications';

export default function CabinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [moodCounts, setMoodCounts] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          const loadedProfile = await loadProfile();
          setProfile(loadedProfile);

          const fetchedLogs = await getLogs();
          const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          fetchedLogs.forEach((log) => {
            if (counts[log.score] !== undefined) {
              counts[log.score]++;
            }
          });
          setMoodCounts(counts);
        } catch (error) {
          console.error(error);
        }
      };
      fetchData();
    }, [])
  );

  const handleNotificationChange = async (schedule: 'morning' | 'evening' | 'custom' | 'none') => {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Permission required to set reminders.');
      setProfile(prev => prev ? { ...prev, notificationSchedule: 'none' } : { notificationSchedule: 'none' });
      await saveProfile({ notificationSchedule: 'none' });
      return;
    }

    setProfile(prev => prev ? { ...prev, notificationSchedule: schedule } : { notificationSchedule: schedule });
    await saveProfile({ notificationSchedule: schedule });
    await scheduleReminder(schedule);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Top Header */}
        <View style={styles.header} />

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          {/* Identity Block */}
          <View style={styles.identityBlock}>
            {profile?.avatarUri ? (
              <Image source={{ uri: profile.avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarPlaceholderText}>
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : 'C'}
                </Text>
              </View>
            )}

            <Text style={styles.name}>{profile?.name || 'Captain'}</Text>
            
            {profile?.mantra ? (
              <Text style={styles.mantra}>"{profile.mantra}"</Text>
            ) : null}
          </View>

          {/* Talisman Block */}
          {profile?.talismanUri && (
            <View style={styles.talismanBlock}>
              <Text style={styles.talismanTitle}>Your Talisman</Text>
              <Image source={{ uri: profile.talismanUri }} style={styles.talismanImage} />
            </View>
          )}

          {/* Voyage Thus Far */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>THE VOYAGE THUS FAR</Text>
            <View style={styles.voyageRow}>
              {[5, 4, 3, 2, 1].map((score) => (
                <View key={score} style={styles.voyageCircleContainer}>
                  <View style={[styles.voyageCircle, { backgroundColor: MoodColors[score] }]}>
                     <Text style={styles.voyageCount}>{moodCounts[score]}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Notification Schedule */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>NOTIFICATION SCHEDULE</Text>
            <View style={styles.segmentedControl}>
              {['morning', 'evening', 'custom', 'none'].map((val, idx) => {
                const isActive = profile?.notificationSchedule === val || (!profile?.notificationSchedule && val === 'none');
                return (
                  <Pressable
                    key={val}
                    style={[
                      styles.segmentButton,
                      isActive ? styles.segmentButtonActive : null,
                      idx === 0 ? styles.segmentFirst : null,
                      idx === 3 ? styles.segmentLast : null,
                      idx > 0 && !isActive ? styles.segmentSeparator : null
                    ]}
                    onPress={() => handleNotificationChange(val as any)}
                  >
                    <Text style={[styles.segmentText, isActive ? styles.segmentTextActive : null]}>
                      {val.charAt(0).toUpperCase() + val.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Faux Tab Bar */}
        <View style={[styles.fauxTabBar, { paddingBottom: insets.bottom, height: 85 + insets.bottom }]}>
          <Pressable style={styles.fauxTabButton} onPress={() => router.replace('/(tabs)/surface')}>
            <Feather name="calendar" size={24} color="#8A887E" />
          </Pressable>
          <Pressable style={[styles.fauxTabButton, styles.fauxTabSeparator]} onPress={() => router.replace('/(tabs)')}>
            <Feather name="home" size={24} color="#8A887E" />
          </Pressable>
          <Pressable style={[styles.fauxTabButton, styles.fauxTabSeparator]} onPress={() => router.replace('/(tabs)/logbook')}>
            <Feather name="book" size={24} color="#8A887E" />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.darkCanvas,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  backText: {
    fontFamily: Typography.sans.semiBold,
    fontSize: 16,
    color: Colors.textPrimaryDark,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120,
    alignItems: 'center',
  },
  identityBlock: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarPlaceholder: {
    backgroundColor: Colors.darkFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontFamily: Typography.serif.bold,
    fontSize: 48,
    color: Colors.textPrimaryDark,
  },
  name: {
    fontFamily: Typography.serif.bold,
    fontSize: 32,
    color: Colors.textPrimaryDark,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  mantra: {
    fontFamily: Typography.serif.italic,
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  talismanBlock: {
    alignItems: 'center',
    width: '100%',
    marginTop: Spacing.xl,
  },
  talismanTitle: {
    fontFamily: Typography.sans.semiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  talismanImage: {
    width: 250,
    height: 350,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionBlock: {
    alignItems: 'center',
    width: '100%',
    marginTop: Spacing.xxl,
  },
  sectionTitle: {
    fontFamily: Typography.sans.semiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  voyageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  voyageCircleContainer: {
    alignItems: 'center',
  },
  voyageCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 8px rgba(0,0,0,0.15)',
  } as any,
  voyageCount: {
    fontFamily: Typography.sans.bold,
    fontSize: 18,
    color: Colors.textPrimaryLight,
  },
  segmentedControl: {
    flexDirection: 'row',
    width: '100%',
    height: 44,
    backgroundColor: Colors.darkFill,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: Colors.lightCanvas,
    borderRadius: Radii.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentFirst: {
    borderTopLeftRadius: Radii.lg,
    borderBottomLeftRadius: Radii.lg,
  },
  segmentLast: {
    borderTopRightRadius: Radii.lg,
    borderBottomRightRadius: Radii.lg,
  },
  segmentSeparator: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.05)',
  },
  segmentText: {
    fontFamily: Typography.sans.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.textPrimaryLight,
  },
  fauxTabBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    height: 85,
    backgroundColor: '#D7D5B2',
  },
  fauxTabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D7D5B2',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  fauxTabSeparator: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.1)',
  },
});
