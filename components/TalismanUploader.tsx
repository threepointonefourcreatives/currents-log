import { View, StyleSheet, TouchableOpacity, Text, useWindowDimensions, Image } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors, Radii, Typography, Spacing } from '../src/theme/theme';

interface TalismanUploaderProps {
  onPress?: () => void;
  imageUri?: string;
}

export default function TalismanUploader({ onPress, imageUri }: TalismanUploaderProps) {
  const { width } = useWindowDimensions();
  // Using a roughly 3:4 aspect ratio for the polaroid frame
  const frameWidth = width * 0.45;
  const frameHeight = frameWidth * 1.33;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label} testID="talisman-label">Your Talisman</Text>
      <Text style={styles.subLabel}>(A memory, place, or face to keep close)</Text>
      
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[styles.polaroidFrame, { width: frameWidth, height: frameHeight }]}
        testID="talisman-uploader"
      >
        <View style={styles.photoArea}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={[StyleSheet.absoluteFillObject, { borderRadius: Radii.md }]} />
          ) : (
            <View style={styles.iconContainer}>
              <FontAwesome5 name="plus" size={16} color={Colors.textPrimaryDark} style={styles.plusIcon} />
              <FontAwesome5 name="camera" size={32} color={Colors.textPrimaryDark} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  label: {
    fontFamily: Typography.sans.semiBold,
    fontSize: 14,
    color: Colors.textPrimaryDark,
    marginBottom: Spacing.xxs,
  },
  subLabel: {
    fontFamily: Typography.sans.regular,
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  polaroidFrame: {
    backgroundColor: Colors.lightCanvas, // Off-white border
    padding: Spacing.xs,
    paddingBottom: Spacing.xl, // Extra space at bottom like real polaroid
    borderRadius: Radii.lg,
    // Note: outer shadow is strictly ZERO per rules, even for polaroids
  },
  photoArea: {
    flex: 1,
    backgroundColor: Colors.darkFill,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIcon: {
    position: 'absolute',
    top: -12,
    right: -12,
  },
});
