import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../src/theme/theme';
import AvatarUploader from '../components/AvatarUploader';
import NeumorphicInput from '../components/NeumorphicInput';
import TalismanUploader from '../components/TalismanUploader';
import SegmentedToggle, { type ScheduleOption } from '../components/SegmentedToggle';
import PrimaryButton from '../components/PrimaryButton';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { saveProfile } from '../src/utils/profileStore';

export default function SetupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [mantra, setMantra] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [talismanUri, setTalismanUri] = useState<string | undefined>();
  const [schedule, setSchedule] = useState<ScheduleOption>('Evening');

  const pickAvatar = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const pickTalisman = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setTalismanUri(result.assets[0].uri);
    }
  };

  const handleOpenLog = async () => {
    await saveProfile({
      name: name.trim(),
      mantra: mantra.trim(),
      avatarUri,
      talismanUri,
      notificationsEnabled: schedule !== 'None',
    });
    router.replace('/(tabs)/surface');
  };

  return (
    <View style={styles.root} testID="screen-setup">
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
        >
          {/* ScrollView for mobile optimization (prevents bottom content cut-off) */}
          <ScrollView
            style={{ flex: 1, paddingHorizontal: Spacing.lg }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. The Header */}
            <Text style={styles.header} testID="setup-header">
              Claim your Log!
            </Text>

            {/* 2. Avatar Uploader ("Your Likeness") */}
            <View style={styles.section}>
              <Text style={styles.label}>Your Likeness</Text>
              <AvatarUploader onPress={pickAvatar} imageUri={avatarUri} />
            </View>

            {/* 3. Your Name Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Your Name</Text>
              <NeumorphicInput
                variant="light"
                fillColor={Colors.mood3} // Muted Sand
                placeholder="Jane Doe"
                placeholderTextColor={Colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* 4. Your Mantra Input (Lora Italic) */}
            <View style={styles.section}>
              <Text style={styles.label}>Your Mantra</Text>
              <NeumorphicInput
                variant="light"
                fillColor={Colors.mood3} // Muted Sand
                placeholder="&quot;The journey is the destination&quot;"
                placeholderTextColor={Colors.textSecondary}
                textStyle={{ fontFamily: Typography.serif.italic, fontSize: 18 }}
                value={mantra}
                onChangeText={setMantra}
              />
            </View>

            {/* 5. Talisman Uploader */}
            <View style={styles.section}>
              <TalismanUploader onPress={pickTalisman} imageUri={talismanUri} />
            </View>

            {/* 6. Notification Schedule */}
            <View style={styles.section}>
              <Text style={[styles.label, { marginBottom: Spacing.md }]}>
                NOTIFICATION SCHEDULE
              </Text>
              <SegmentedToggle
                options={['Morning', 'Evening', 'Custom', 'None']}
                selectedOption={schedule}
                onSelect={setSchedule}
              />
            </View>
          </ScrollView>

          {/* 7. Bottom Button Area (Fixed/Massive) */}
          <View style={styles.footer}>
            <PrimaryButton
              label="OPEN LOG"
              onPress={handleOpenLog}
              disabled={name.trim().length === 0 || mantra.trim().length === 0}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.darkCanvas, // Soft Charcoal Background
  },
  safeArea: {
    flex: 1,
  },
  kav: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxxl, // Generous padding before the button
    alignItems: 'center',
  },
  header: {
    fontFamily: Typography.serif.bold,
    fontSize: 28,
    color: Colors.textPrimaryDark,
    marginBottom: Spacing.xxl,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  label: {
    fontFamily: Typography.sans.semiBold,
    fontSize: 14,
    color: Colors.textPrimaryDark,
    marginBottom: Spacing.sm,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl, // Ensure button isn't cut off on short devices
    backgroundColor: Colors.darkCanvas, // Keep background solid in footer area
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.xxxl,
  },
});
