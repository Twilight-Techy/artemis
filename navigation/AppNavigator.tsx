import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors, Typography } from '../constants/theme';

import HomeScreen from '../screens/HomeScreen';
import DevicesScreen from '../screens/DevicesScreen';
import FunctionsScreen from '../screens/FunctionsScreen';
import AutomationsScreen from '../screens/AutomationsScreen';

const Tab = createBottomTabNavigator();

type TabIconMap = {
  [key: string]: {
    active: keyof typeof Ionicons.glyphMap;
    inactive: keyof typeof Ionicons.glyphMap;
  };
};

const TAB_ICONS: TabIconMap = {
  Home: { active: 'home', inactive: 'home-outline' },
  Devices: { active: 'hardware-chip', inactive: 'hardware-chip-outline' },
  Functions: { active: 'code-slash', inactive: 'code-slash-outline' },
  Automations: { active: 'sparkles', inactive: 'sparkles-outline' },
};

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.active : icons.inactive;
          const iconColor = focused ? Colors.primary : 'rgba(255, 255, 255, 0.3)';
          const iconSize = focused ? size + 2 : size;
          return (
            <View style={focused ? styles.activeIconWrapper : undefined}>
              <Ionicons name={iconName} size={iconSize} color={iconColor} />
            </View>
          );
        },
        tabBarLabel: ({ focused }) => (
          <Text
            style={[
              styles.tabLabel,
              { color: focused ? Colors.primary : 'rgba(255, 255, 255, 0.3)' },
            ]}
          >
            {route.name.toUpperCase()}
          </Text>
        ),
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.tabBarAndroidBg]} />
          )
        ),
        tabBarItemStyle: styles.tabBarItem,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Devices" component={DevicesScreen} />
      <Tab.Screen name="Functions" component={FunctionsScreen} />
      <Tab.Screen name="Automations" component={AutomationsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 88 : 72,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(14, 14, 16, 0.92)',
    borderTopWidth: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  tabBarAndroidBg: {
    backgroundColor: 'rgba(14, 14, 16, 0.92)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  tabBarItem: {
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 0 : 8,
  },
  tabLabel: {
    fontFamily: Typography.families.label,
    fontSize: 9,
    fontWeight: Typography.weights.bold,
    letterSpacing: 2,
    marginTop: 4,
  },
  activeIconWrapper: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
});
