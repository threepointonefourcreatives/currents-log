import { useState, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions, TouchableOpacity, Text, Image } from 'react-native';
import {
  Canvas,
  Box,
  BoxShadow,
  rrect,
  rect,
} from '@shopify/react-native-skia';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors, Radii } from '../src/theme/theme';

interface AvatarUploaderProps {
  onPress?: () => void;
  size?: number;
  imageUri?: string;
}

export default function AvatarUploader({ onPress, size = 120, imageUri }: AvatarUploaderProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}
      testID="avatar-uploader"
    >
      {/* Skia-rendered inner shadow background (Dark Canvas Indent) */}
      <Canvas style={{ ...StyleSheet.absoluteFillObject, pointerEvents: 'none' }}>
        <Box
          box={rrect(rect(0, 0, size, size), size / 2, size / 2)}
          color={Colors.darkFill}
        >
          {/* Top-left inner shadow (dark) — 40% opacity */}
          <BoxShadow dx={4} dy={4} blur={8} color="rgba(0,0,0,0.40)" inner />
          {/* Bottom-right inner shadow (light) — 10% opacity */}
          <BoxShadow dx={-4} dy={-4} blur={8} color="rgba(255,255,255,0.10)" inner />
        </Box>
      </Canvas>

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={[StyleSheet.absoluteFillObject, { borderRadius: size / 2 }]} />
      ) : (
        <View style={styles.iconContainer}>
          <FontAwesome5 name="plus" size={16} color={Colors.textPrimaryDark} style={styles.plusIcon} />
          <FontAwesome5 name="camera" size={32} color={Colors.textPrimaryDark} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  plusIcon: {
    position: 'absolute',
    top: -12,
    right: -12,
  },
});
