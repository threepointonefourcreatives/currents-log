/**
 * OtpInput — 6-digit code entry with neumorphic indented cells.
 * Uses a hidden TextInput for reliable input + 6 Skia-rendered display cells.
 * Each cell uses the same BoxShadow (inner) "Indented Paper" physics.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import {
  Canvas,
  Box,
  BoxShadow,
  rrect,
  rect,
} from '@shopify/react-native-skia';
import { Colors, Typography, Spacing, Radii } from '../src/theme/theme';

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
}

export default function OtpInput({ length = 6, onComplete }: OtpInputProps) {
  const [code, setCode] = useState('');
  const inputRef = useRef<TextInput>(null);
  const { width: screenWidth } = useWindowDimensions();

  // Dynamic cell sizing based on screen width
  const paddingH = Spacing.lg; // 24px each side
  const gap = 10;
  const totalGap = (length - 1) * gap;
  const cellSize = Math.min(
    52,
    Math.floor((screenWidth - paddingH * 2 - totalGap) / length),
  );

  const handleChange = useCallback(
    (text: string) => {
      const digits = text.replace(/[^0-9]/g, '').slice(0, length);
      setCode(digits);
      if (digits.length === length) {
        onComplete(digits);
      }
    },
    [length, onComplete],
  );

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <View style={styles.container} testID="otp-input">
      {/* Hidden input captures all keystrokes */}
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={handleChange}
        maxLength={length}
        keyboardType="number-pad"
        autoFocus
        caretHidden
        style={[styles.hiddenInput, { color: '#1A1A1A' }]}
        testID="otp-hidden-input"
      />

      {/* Visual cells */}
      <Pressable
        style={[styles.cellRow, { gap }]}
        onPress={focusInput}
        testID="otp-cell-row"
      >
        {Array.from({ length }, (_, i) => (
          <OtpCell
            key={i}
            digit={code[i]}
            active={i === code.length}
            size={cellSize}
          />
        ))}
      </Pressable>
    </View>
  );
}

// ─── Individual OTP Cell ─────────────────────────────────────

interface OtpCellProps {
  digit?: string;
  active: boolean;
  size: number;
}

function OtpCell({ digit, active, size }: OtpCellProps) {
  return (
    <View
      style={[
        styles.cell,
        { width: size, height: size, borderRadius: Radii.lg },
        active && styles.cellActive,
      ]}
      testID={`otp-cell-${digit ?? 'empty'}`}
    >
      {/* Skia inner shadow background */}
      <Canvas style={{ ...StyleSheet.absoluteFillObject, pointerEvents: 'none' }}>
        <Box
          box={rrect(rect(0, 0, size, size), Radii.lg, Radii.lg)}
          color={Colors.lightCanvas}
        >
          <BoxShadow dx={4} dy={4} blur={8} color="rgba(0,0,0,0.06)" inner />
          <BoxShadow dx={-4} dy={-4} blur={8} color="rgba(255,255,255,0.90)" inner />
        </Box>
      </Canvas>

      {/* Digit display */}
      {digit ? (
        <Text style={styles.digit}>{digit}</Text>
      ) : (
        active && <View style={styles.cursor} />
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    color: '#1A1A1A',
  },
  cellRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cellActive: {
    borderWidth: 1.5,
    borderColor: Colors.mood4,
  },
  digit: {
    fontFamily: Typography.sans.bold,
    fontSize: 22,
    color: '#1A1A1A',
    zIndex: 1,
  },
  cursor: {
    width: 2,
    height: 22,
    backgroundColor: Colors.mood4,
    borderRadius: 1,
    zIndex: 1,
  },
});
