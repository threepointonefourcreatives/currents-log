/**
 * Screen 1 — "Prepare your Log"
 * The entry point. A warm animated gradient backdrop with
 * the logo, heading, email input, and EMBARK button.
 *
 * PDF Reference: Page 1 of Currents_merged.pdf (ULTIMATE SOURCE OF TRUTH)
 */

import { useState, useCallback } from 'react';
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
import NeumorphicInput from '../components/NeumorphicInput';
import PrimaryButton from '../components/PrimaryButton';
import { Colors, Typography, Spacing } from '../src/theme/theme';
import { supabase } from '../src/utils/supabase';

export default function PrepareYourLog() {
  const [email, setEmail] = useState('');
  const { height } = useWindowDimensions();
  const router = useRouter();

  const handleEmbark = useCallback(async () => {
    Keyboard.dismiss();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      alert(error.message);
    } else {
      router.push({ pathname: '/otp', params: { email } });
    }
  }, [email, router]);

  // Proportions derived from PDF (Page 1) — logo ~19%, input ~44%, button ~55%
  const logoSize = Math.round(height * 0.075);
  const topPad = Math.round(height * 0.12);
  const logoToText = Math.round(height * 0.015);
  const textToInput = Math.round(height * 0.10);
  const inputToButton = Math.round(height * 0.035);

  return (
    <View style={styles.root} testID="screen-prepare-log">
      {/* Animated gradient background — "The Swell" */}
      <SwellBackground />

      {/* Content layer */}
      <Pressable onPress={Keyboard.dismiss} style={StyleSheet.absoluteFill}>
        <SafeAreaView style={styles.safe}>
          <KeyboardAvoidingView
            style={styles.kav}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={[styles.content, { paddingTop: topPad }]}>
              {/* Logo */}
              <CurrentLogo size={logoSize} />

              {/* Heading — Lora Serif */}
              <Text
                style={[styles.heading, { marginTop: logoToText }]}
                testID="heading-prepare"
              >
                Prepare your Log
              </Text>

              {/* Input + Button cluster */}
              <View style={[styles.formArea, { marginTop: textToInput }]}>
                <NeumorphicInput
                  placeholder="Enter your email..."
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handleEmbark}
                />

                <View style={{ height: inputToButton }} />

                <PrimaryButton
                  label="EMBARK"
                  onPress={handleEmbark}
                  disabled={email.trim().length === 0}
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
    ...StyleSheet.absoluteFillObject,
  },
  kav: {
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
  formArea: {
    width: '100%',
    alignItems: 'center',
  },
});
