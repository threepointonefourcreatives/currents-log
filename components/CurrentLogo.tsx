/**
 * CurrentLogo — The official wave brand mark.
 * Uses the actual logo asset with a subtle "wax seal" drop shadow.
 */

import { View, Image, StyleSheet } from 'react-native';
import { Radii } from '../src/theme/theme';

interface CurrentLogoProps {
  size?: number;
}

const logoSource = require('../assets/images/current-logo.png');

export default function CurrentLogo({ size = 72 }: CurrentLogoProps) {
  return (
    <View
      style={[styles.shadow, { width: size, height: size, borderRadius: size / 2 }]}
      testID="current-logo"
    >
      <Image
        source={logoSource}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
    overflow: 'hidden',
  } as any,
});
