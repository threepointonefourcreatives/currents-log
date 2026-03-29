import React, { useState, useEffect } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Colors,
  Typography,
  Spacing,
  MoodColors,
  MoodLabels,
  MoodConfirmations,
} from '../../src/theme/theme';
import MoodPebble from '../../components/MoodPebble';
import NeumorphicInput from '../../components/NeumorphicInput';
import PrimaryButton from '../../components/PrimaryButton';
import CurrentLogo from '../../components/CurrentLogo';
import Header from '../../src/components/Header';
import { addLog } from '../../src/utils/db';

export default function LoggingScreen() {
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { height } = useWindowDimensions();

  // Animations
  const backgroundColor = useSharedValue<string>(Colors.lightCanvas);
  const formOpacity = useSharedValue(1);
  const successOpacity = useSharedValue(0);

  useEffect(() => {
    if (moodScore) {
      // 5% opacity tint = '0D' in hex
      backgroundColor.value = withTiming(MoodColors[moodScore] + '0D', { duration: 400 });
    } else {
      backgroundColor.value = withTiming(Colors.lightCanvas, { duration: 400 });
    }
  }, [moodScore]);

  const animatedBackground = useAnimatedStyle(() => ({
    backgroundColor: backgroundColor.value,
  }));

  const animatedFormStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    pointerEvents: formOpacity.value === 0 ? 'none' : 'auto',
  }));

  const animatedSuccessStyle = useAnimatedStyle(() => ({
    opacity: successOpacity.value,
    transform: [
      {
        translateY: interpolate(successOpacity.value, [0, 1], [20, 0]),
      },
    ],
  }));

  const handleLog = async () => {
    if (!moodScore || note.trim() === '') return;
    Keyboard.dismiss();
    setIsSubmitting(true);

    try {
      await addLog(moodScore, note.trim());

      // 2. Trigger Success UI (Original Transition)
      formOpacity.value = withTiming(0, { duration: 500 });
      setTimeout(() => {
        successOpacity.value = withTiming(1, { duration: 600 });
      }, 300);

      // 3. The Timed Transition
      setTimeout(() => {
        setNote('');
        setMoodScore(null);
        successOpacity.value = 0; // Hide success overlay quickly
        formOpacity.value = 1; // Restore form for when they return
        router.replace('/surface');
        setIsSubmitting(false);
      }, 2500);

    } catch (error) {
      console.error('Failed to log:', error);
      setIsSubmitting(false);
    }
  };

  const topPad = Math.round(height * 0.08);

  return (
    <Animated.View style={[styles.root, animatedBackground]} testID="screen-logging">
      <SafeAreaView style={styles.safe}>
        {/* Header - Logo & Avatar Placeholder */}
        <Animated.View style={animatedFormStyle}>
          <Header style={{ marginBottom: 0 }} />
        </Animated.View>

        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Main Form Content */}
          <Animated.View style={[styles.content, { paddingTop: topPad }, animatedFormStyle]}>
            <Text style={styles.heading}>Greetings Sailor!</Text>
            <Text style={styles.subtext}>How are the waters looking?</Text>

            {/* Mood Pebbles Row */}
            <View style={styles.pebblesContainer}>
              {[5, 4, 3, 2, 1].map((score) => (
                <MoodPebble
                  key={score}
                  score={score}
                  color={MoodColors[score]}
                  isSelected={moodScore === score}
                  onSelect={setMoodScore}
                  size={48}
                />
              ))}
            </View>

            {/* Dynamic Active Copy */}
            <View style={styles.activeCopyContainer}>
              {moodScore ? (
                <>
                  <Text style={styles.moodTitle}>{MoodLabels[moodScore].title}</Text>
                  <Text style={styles.moodSubtitle}>{MoodLabels[moodScore].subtitle}</Text>
                </>
              ) : (
                <View style={{ height: 50 }} /> // Fixed empty space to prevent layout jump
              )}
            </View>

            {/* Input and Button */}
            <View style={styles.inputContainer}>
              <NeumorphicInput
                placeholder="Add your thoughts...."
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={4}
              />
            </View>

            <PrimaryButton
              label="LOG"
              onPress={handleLog}
              disabled={!moodScore || isSubmitting}
              style={styles.logButton}
            />
          </Animated.View>
        </KeyboardAvoidingView>

        {/* Stoic Success Screen (Palate Cleanser) */}
        <Animated.View style={[styles.successOverlay, animatedSuccessStyle]} pointerEvents={isSubmitting ? 'auto' : 'none'}>
          <View style={styles.successLogo}>
            <CurrentLogo size={100} />
          </View>
          <Text style={styles.successHeading}>Entry Secured!</Text>
          {moodScore && (
            <Text style={styles.successStoicQuote}>
              {MoodConfirmations[moodScore]}
            </Text>
          )}
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  kav: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D7D5B2', // Mood3 Sand roughly matches image
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  avatarText: {
    fontFamily: Typography.serif.bold,
    color: Colors.textPrimaryLight,
    fontSize: 18,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  heading: {
    fontFamily: Typography.serif.semiBold,
    fontSize: 28,
    color: Colors.textPrimaryLight,
    marginBottom: Spacing.xs,
  },
  subtext: {
    fontFamily: Typography.serif.regular,
    fontSize: 18,
    color: Colors.textPrimaryLight,
    marginBottom: Spacing.xl,
  },
  pebblesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  activeCopyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginBottom: Spacing.xl,
  },
  moodTitle: {
    fontFamily: Typography.serif.boldItalic,
    fontSize: 22,
    color: Colors.textPrimaryLight,
    marginBottom: 4,
  },
  moodSubtitle: {
    fontFamily: Typography.sans.regular,
    fontSize: 16,
    color: Colors.textPrimaryLight,
  },
  inputContainer: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  logButton: {
    marginTop: 'auto',
    marginBottom: 100, // Clear the custom tab bar
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    zIndex: 10,
  },
  successLogo: {
    marginBottom: Spacing.xl,
    shadowColor: Colors.mood5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  successHeading: {
    fontFamily: Typography.serif.boldItalic,
    fontSize: 26,
    color: Colors.textPrimaryLight,
    marginBottom: Spacing.sm,
  },
  successStoicQuote: {
    fontFamily: Typography.serif.regular,
    fontSize: 18,
    color: Colors.textPrimaryLight,
    textAlign: 'center',
  },
});
