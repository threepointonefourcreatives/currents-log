/**
 * Screen 2 — OTP Verification ("Awaiting your signal,")
 * PDF Reference: Page 2 of Currents_merged.pdf
 *
 * SwellBackground continues animating behind this screen.
 * 6-digit indented OTP squares with auto-advance to Screen 3.
 */

import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import SwellBackground from '../components/SwellBackground';
import CurrentLogo from '../components/CurrentLogo';
import OtpInput from '../components/OtpInput';
import PrimaryButton from '../components/PrimaryButton';
import { Colors, Typography, Spacing } from '../src/theme/theme';
import { supabase } from '../src/utils/supabase';
import { useLocalSearchParams } from 'expo-router';

export default function OtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { height } = useWindowDimensions();

  // PDF proportions (Page 2)
  const logoSize = Math.round(height * 0.075);
  const topPad = Math.round(height * 0.08);
  const logoToHeading = Math.round(height * 0.04);
  const headingToSub = Math.round(height * 0.015);
  const subToOtp = Math.round(height * 0.06);
  const otpToButton = Math.round(height * 0.14);

  const handleOtpComplete = useCallback(
    async (code: string) => {
      Keyboard.dismiss();
      const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) {
        alert(error.message);
      } else if (data.session) {
        setTimeout(() => {
          router.replace('/setup');
        }, 400);
      }
    },
    [email, router],
  );

  const handleSendAgain = useCallback(() => {
    // TODO: Phase 2 — resend OTP
  }, []);

  return (
    <View style={styles.root} testID="screen-otp">
      <SwellBackground />

      <Pressable onPress={Keyboard.dismiss} style={StyleSheet.absoluteFill}>
        <SafeAreaView style={styles.safe}>
          <KeyboardAvoidingView
            style={styles.kav}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={[styles.content, { paddingTop: topPad }]}>
              {/* Logo */}
              <CurrentLogo size={logoSize} />

              {/* Heading — Lora Bold */}
              <Text
                style={[styles.heading, { marginTop: logoToHeading }]}
                testID="heading-otp"
              >
                Awaiting your signal,
              </Text>

              {/* Subtext — Nunito */}
              <Text
                style={[styles.subtext, { marginTop: headingToSub }]}
                testID="subtext-otp"
              >
                We've sent a flare to your email.{'\n'}
                Enter the code to secure your log.
              </Text>

              {/* OTP Input — 6 indented cells */}
              <View style={{ marginTop: subToOtp, width: '100%' }}>
                <OtpInput onComplete={handleOtpComplete} />
              </View>

              {/* SEND AGAIN button */}
              <View style={{ marginTop: otpToButton, width: '100%' }}>
                <PrimaryButton
                  label="SEND AGAIN"
                  onPress={handleSendAgain}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Pressable>
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
  kav: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  heading: {
    fontFamily: Typography.serif.bold,
    fontSize: 28,
    lineHeight: 36,
    color: Colors.textPrimaryLight,
    textAlign: 'center',
  },
  subtext: {
    fontFamily: Typography.sans.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimaryLight,
    textAlign: 'center',
    opacity: 0.75,
  },
});
