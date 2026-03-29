import React from 'react';
import { Tabs } from 'expo-router';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../src/theme/theme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.tabBarContainer}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const isPrevFocused = state.index === index - 1;
        
        // Render a 1px vertical separator if it's not the first tab, not active, and the adjacent left tab isn't active
        const showLeftSeparator = !isFocused && !isPrevFocused && index > 0;
        
        let iconName: 'calendar' | 'home' | 'book' = 'home';
        if (route.name === 'surface') iconName = 'calendar';
        if (route.name === 'index') iconName = 'home';
        if (route.name === 'logbook') iconName = 'book';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.name}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            style={[
              isFocused ? styles.tabButtonActive : styles.tabButtonInactive,
              showLeftSeparator && styles.separatorLeft
            ]}
            activeOpacity={0.8}
          >
            {isFocused && (
              <>
                <View style={styles.leftMaskContainer}>
                  <View style={styles.leftMaskInner} />
                </View>
                <View style={styles.rightMaskContainer}>
                  <View style={styles.rightMaskInner} />
                </View>
              </>
            )}
            <Feather 
              name={iconName} 
              size={24} 
              color={isFocused ? Colors.textPrimaryLight : '#8A887E'} 
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="surface" options={{ title: 'Surface' }} />
      <Tabs.Screen name="index" options={{ title: 'Log' }} />
      <Tabs.Screen name="logbook" options={{ title: 'Ledger' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#D7D5B2',
  },
  tabButtonInactive: {
    flex: 1,
    height: '100%',
    backgroundColor: '#D7D5B2',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  tabButtonActive: {
    flex: 1,
    height: '100%',
    backgroundColor: Colors.lightCanvas,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separatorLeft: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.1)',
  },
  leftMaskContainer: {
    position: 'absolute',
    bottom: 0,
    left: -20,
    width: 20,
    height: 20,
    backgroundColor: Colors.lightCanvas,
  },
  leftMaskInner: {
    flex: 1,
    backgroundColor: '#D7D5B2',
    borderBottomRightRadius: 20,
  },
  rightMaskContainer: {
    position: 'absolute',
    bottom: 0,
    right: -20,
    width: 20,
    height: 20,
    backgroundColor: Colors.lightCanvas,
  },
  rightMaskInner: {
    flex: 1,
    backgroundColor: '#D7D5B2',
    borderBottomLeftRadius: 20,
  },
});
