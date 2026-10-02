/**
 * PrimaryButton — Bold CTA button (e.g., "EMBARK").
 * Solid terra-cotta fill with a subtle wax-seal drop shadow.
 * This is a RAISED element — outer shadow IS allowed here.
 */

import {
  TouchableOpacity,
  Text,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../src/theme/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function PrimaryButton({
  label,
  onPress,
  disabled = false,
  style,
}: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      testID="primary-button"
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        styles.button,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 56,
    borderRadius: Radii.md,
    backgroundColor: Colors.mood5,
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle wax-seal drop shadow
    boxShadow: '0 4px 14px rgba(236, 71, 36, 0.30)',
  } as any,
  disabled: {
    opacity: 0.65,
  },
  label: {
    fontFamily: Typography.sans.bold,
    fontSize: 16,
    letterSpacing: 2.5,
    color: Colors.lightCanvas,
    textTransform: 'uppercase',
  } as any,
});
