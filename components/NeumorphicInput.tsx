/**
 * NeumorphicInput — "Indented Paper" text input.
 * Uses @shopify/react-native-skia Box + BoxShadow (inner)
 * to create the pressed-into-screen effect.
 * NO visible borders — definition comes purely from inner shadows.
 */

import { useState, useCallback } from 'react';
import { View, TextInput, StyleSheet, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import {
  Canvas,
  Box,
  BoxShadow,
  rrect,
  rect,
} from '@shopify/react-native-skia';
import { Colors, Typography, Spacing, Radii } from '../src/theme/theme';

interface NeumorphicInputProps extends Omit<TextInputProps, 'style'> {
  /** 'light' for warm off-white canvas, 'dark' for Captain's Cabin */
  variant?: 'light' | 'dark';
  /** Optional override for the background color */
  fillColor?: string;
  /** Optional override for the text style */
  textStyle?: TextStyle;
  /** Optional override for the container style */
  containerStyle?: ViewStyle;
}

export default function NeumorphicInput({
  variant = 'light',
  fillColor: customFillColor,
  textStyle,
  containerStyle,
  placeholder,
  ...rest
}: NeumorphicInputProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSize({ width, height });
    }
  }, []);

  const isLight = variant === 'light';
  const fillColor = customFillColor || (isLight ? Colors.lightCanvas : Colors.darkFill);
  const textColor = isLight ? Colors.textPrimaryLight : Colors.textPrimaryDark;

  // Shadow specs from theme — Light Canvas Indent
  const shadowDark = isLight
    ? 'rgba(0,0,0,0.06)'    // 5–8% opacity
    : 'rgba(0,0,0,0.40)';   // 40% opacity
  const shadowLight = isLight
    ? 'rgba(255,255,255,0.90)' // 80–100% opacity
    : 'rgba(255,255,255,0.10)'; // 10% subtle rim

  return (
    <View
      style={[styles.container, containerStyle]}
      onLayout={onLayout}
      testID="neumorphic-input"
    >
      {/* Skia-rendered inner shadow background */}
      {size.width > 0 && (
        <Canvas style={{ ...StyleSheet.absoluteFillObject, pointerEvents: 'none' }}>
          <Box
            box={rrect(rect(0, 0, size.width, size.height), Radii.lg, Radii.lg)}
            color={fillColor}
          >
            {/* Top-left inner shadow (dark) — light source from top-left */}
            <BoxShadow dx={4} dy={4} blur={8} color={shadowDark} inner />
            {/* Bottom-right inner shadow (light) — reflected light */}
            <BoxShadow dx={-4} dy={-4} blur={8} color={shadowLight} inner />
          </Box>
        </Canvas>
      )}

      {/* Native TextInput overlay — must sit above the Skia Canvas */}
      <TextInput
        testID="neumorphic-text-input"
        style={[
          styles.input,
          { color: textColor },
          textStyle,
        ]}
        placeholder={placeholder}
        placeholderTextColor="#8A95A5"
        selectionColor={Colors.mood4}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 56,
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    fontFamily: Typography.sans.regular,
    fontSize: 16,
    backgroundColor: 'transparent',
    position: 'relative',
    zIndex: 1,
  },
});
