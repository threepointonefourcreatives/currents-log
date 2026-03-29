/**
 * Screen 3 — Onboarding Success ("Signal confirmed,")
 * PDF Reference: Page 3 of Currents_merged.pdf
 *
 * More spacious than Screens 1 & 2. SwellBackground continues.
 * "Welcome aboard!" in Lora (serif). TO YOUR CABIN CTA.
 */

import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import SwellBackground from '../components/SwellBackground';
import CurrentLogo from '../components/CurrentLogo';
import PrimaryButton from '../components/PrimaryButton';
import { Colors, Typography, Spacing } from '../src/theme/theme';

export default function SuccessScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();

  // PDF proportions (Page 3) — more generous spacing
  const logoSize = Math.round(height * 0.085);
  const topPad = Math.round(height * 0.10);
  const logoToHeading = Math.round(height * 0.05);
  const headingToWelcome = Math.round(height * 0.018);
  const welcomeToButton = Math.round(height * 0.12);

  const handleToCabin = useCallback(() => {
    // Navigate to Captain's Cabin (Phase 3)
    router.replace('/setup');
  }, [router]);

  return (
    <View style={styles.root} testID="screen-success">
      <SwellBackground />

      <SafeAreaView style={styles.safe}>
        <View style={[styles.content, { paddingTop: topPad }]}>
          {/* Logo */}
          <CurrentLogo size={logoSize} />

          {/* Heading — Lora Bold */}
          <Text
            style={[styles.heading, { marginTop: logoToHeading }]}
            testID="heading-success"
          >
            Signal confirmed,
          </Text>

          {/* Welcome — Lora Medium (per user instruction: both lines Lora) */}
          <Text
            style={[styles.welcome, { marginTop: headingToWelcome }]}
            testID="subtext-success"
          >
            Welcome aboard!
          </Text>

          {/* TO YOUR CABIN button */}
          <View style={{ marginTop: welcomeToButton, width: '100%' }}>
            <PrimaryButton
              label="TO YOUR CABIN"
              onPress={handleToCabin}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.lightCanvas,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  heading: {
    fontFamily: Typography.serif.bold,
    fontSize: 28,
    lineHeight: 36,
    color: Colors.textPrimaryLight,
    textAlign: 'center',
  },
  welcome: {
    fontFamily: Typography.serif.medium,
    fontSize: 22,
    lineHeight: 30,
    color: Colors.textPrimaryLight,
    textAlign: 'center',
  },
});
