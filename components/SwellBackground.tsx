/**
 * SwellBackground — The animated gradient mesh behind all screens.
 * Rendered with @shopify/react-native-skia.
 * A slow-moving "Sunset-to-Dusk" gradient with warm drifting blobs.
 */

import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Rect,
  LinearGradient,
  vec,
  Circle,
  RadialGradient,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../src/theme/theme';

export default function SwellBackground() {
  const { width, height } = useWindowDimensions();

  const breathe = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 14000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, []);

  // Gentle opacity pulse for the warm blobs
  const blob1Alpha = useDerivedValue(() => 0.55 + breathe.value * 0.4);
  const blob2Alpha = useDerivedValue(() => 0.9 - breathe.value * 0.35);

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      {/* Base vertical sunset gradient */}
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={[
            Colors.mood5,       // #EC4724 — vibrant top
            Colors.mood4,       // #F37F21 — soft orange
            '#F5C594',          // peach bridge
            Colors.lightCanvas, // #F9F8F1 — warm off-white
            Colors.lightCanvas,
          ]}
          positions={[0, 0.12, 0.3, 0.52, 1]}
        />
      </Rect>

      {/* Drifting warm blob 1 — orange glow */}
      <Circle
        cx={width * 0.35}
        cy={height * 0.14}
        r={height * 0.32}
        opacity={blob1Alpha}
      >
        <RadialGradient
          c={vec(width * 0.35, height * 0.14)}
          r={height * 0.32}
          colors={['rgba(243, 127, 33, 0.22)', 'rgba(243, 127, 33, 0)']}
        />
      </Circle>

      {/* Drifting warm blob 2 — terra cotta glow */}
      <Circle
        cx={width * 0.68}
        cy={height * 0.06}
        r={height * 0.26}
        opacity={blob2Alpha}
      >
        <RadialGradient
          c={vec(width * 0.68, height * 0.06)}
          r={height * 0.26}
          colors={['rgba(236, 71, 36, 0.18)', 'rgba(236, 71, 36, 0)']}
        />
      </Circle>
    </Canvas>
  );
}
