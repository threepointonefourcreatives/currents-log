import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Radii, Typography, Spacing } from '../src/theme/theme';

export type ScheduleOption = 'Morning' | 'Evening' | 'Custom' | 'None';

interface SegmentedToggleProps<T extends string> {
  options: T[];
  selectedOption: T;
  onSelect: (option: T) => void;
  variant?: 'light' | 'dark';
}

export default function SegmentedToggle<T extends string>({ options, selectedOption, onSelect, variant = 'dark' }: SegmentedToggleProps<T>) {
  const isLight = variant === 'light';

  return (
    <View style={[styles.container, isLight && styles.containerLight]} testID="segmented-toggle">
      {options.map((option, index) => {
        const isSelected = option === selectedOption;
        
        // Slightly hacky border radius to keep the caps rounded
        const isFirst = index === 0;
        const isLast = index === options.length - 1;
        
        return (
          <TouchableOpacity
            key={option}
            activeOpacity={0.8}
            onPress={() => onSelect(option)}
            style={[
              styles.segment,
              isLight ? (isSelected ? styles.segmentSelectedLight : styles.segmentUnselectedLight)
                      : (isSelected ? styles.segmentSelected : styles.segmentUnselected),
              isFirst && styles.segmentFirst,
              isLast && styles.segmentLast,
            ]}
          >
            <Text
              style={[
                styles.label,
                isLight ? (isSelected ? styles.labelSelectedLight : styles.labelUnselectedLight)
                        : (isSelected ? styles.labelSelected : styles.labelUnselected),
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 44,
    width: '100%',
    alignSelf: 'center',
  },
  containerLight: {
    // Optionally a slightly different container background if needed, but segments handle it
  },
  segment: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentFirst: {
    borderTopLeftRadius: Radii.pill,
    borderBottomLeftRadius: Radii.pill,
  },
  segmentLast: {
    borderTopRightRadius: Radii.pill,
    borderBottomRightRadius: Radii.pill,
  },
  segmentUnselected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Flat dark background
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  segmentSelected: {
    backgroundColor: Colors.lightCanvas, // Raised light paper button
    elevation: 2, // Slight lift
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  segmentUnselectedLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)', // Inset light
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.02)',
  },
  segmentSelectedLight: {
    backgroundColor: Colors.lightCanvas, // Raised light paper button
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  label: {
    fontFamily: Typography.sans.semiBold,
    fontSize: 13,
  },
  labelUnselected: {
    color: Colors.textSecondary,
  },
  labelSelected: {
    color: Colors.textPrimaryLight,
  },
  labelUnselectedLight: {
    color: Colors.textSecondary,
  },
  labelSelectedLight: {
    color: Colors.textPrimaryLight,
  },
});
