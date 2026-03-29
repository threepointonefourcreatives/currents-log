import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StyleProp, ViewStyle } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { loadProfile, UserProfile } from '../utils/profileStore';
import { Colors, Typography, Spacing } from '../theme/theme';
import CurrentLogo from '../../components/CurrentLogo';

interface HeaderProps {
  style?: StyleProp<ViewStyle>;
}

export default function Header({ style }: HeaderProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadProfile().then(setProfile).catch(console.error);
    }, [])
  );

  const initial = profile?.name ? profile.name.charAt(0).toUpperCase() : '';

  return (
    <View style={[styles.header, style]}>
      <CurrentLogo size={40} />
      <TouchableOpacity 
        style={styles.avatarPlaceholder} 
        onPress={() => router.push('/cabin')}
        activeOpacity={0.8}
      >
        {profile?.avatarUri ? (
          <Image 
            source={{ uri: profile.avatarUri }} 
            style={styles.avatarImage} 
          />
        ) : (
          <Text style={styles.avatarText}>{initial}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D7D5B2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontFamily: Typography.serif.bold,
    color: Colors.textPrimaryLight,
    fontSize: 18,
  },
});
