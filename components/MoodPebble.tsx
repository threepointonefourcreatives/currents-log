import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../src/theme/theme';

interface MoodPebbleProps {
  score: number;
  color: string;
  isSelected: boolean;
  onSelect: (score: number) => void;
  size?: number;
}

export default function MoodPebble({
  score,
  color,
  isSelected,
  onSelect,
  size = 56,
}: MoodPebbleProps) {
  const scale = useSharedValue(isSelected ? 1.1 : 1);
  const ringScale = useSharedValue(isSelected ? 1.25 : 0.8);
  const ringOpacity = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.1 : 1, { damping: 14, stiffness: 200 });
    ringScale.value = withSpring(isSelected ? 1.25 : 0.8, { damping: 14, stiffness: 200 });
    ringOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 250 });
  }, [isSelected]);

  const pebbleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <Pressable
      testID={`mood-pebble-${score}`}
      onPress={() => onSelect(score)}
      style={[styles.container, { width: size * 1.5, height: size * 1.5 }]}
    >
      {/* Textured outer ring when selected */}
      <Animated.View
        style={[
          styles.texturedRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: Colors.darkCanvas,
          },
          ringAnimatedStyle,
        ]}
      />

      {/* Main pebble */}
      <Animated.View
        style={[
          styles.pebble,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          pebbleAnimatedStyle,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pebble: {
    // Basic drop shadow for depth
    boxShadow: '0px 4px 8px rgba(0,0,0,0.15)',
    zIndex: 2,
  } as any,
  texturedRing: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed', // Simulates a "textured" or gritty border
    zIndex: 1,
  },
});
