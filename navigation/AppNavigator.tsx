import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography } from '../constants/theme';

import HomeScreen from '../screens/HomeScreen';
import DevicesScreen from '../screens/DevicesScreen';
import FunctionsScreen from '../screens/FunctionsScreen';
import AutomationsScreen from '../screens/AutomationsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AALEditorScreen from '../screens/AALEditorScreen';
import AddDeviceScreen from '../screens/AddDeviceScreen';
import EditDeviceScreen from '../screens/EditDeviceScreen';
import ManageRoomsScreen from '../screens/ManageRoomsScreen';
import AddEditFunctionScreen from '../screens/AddEditFunctionScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
  History: undefined;
  AALEditor: { mode?: 'add' | 'edit'; automationId?: string } | undefined;
  MCPOverlay: undefined;
  AddDevice: undefined;
  EditDevice: { deviceId: string; deviceName: string; roomId: string; deviceType: string };
  ManageRooms: undefined;
  AddEditFunction: { mode: 'add' | 'edit'; functionName?: string; functionCategory?: string; functionDescription?: string };
};

const Tab = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

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

function CustomTabBar({ state, descriptors, navigation, insets }: any) {
  return (
    <View style={[styles.tabBar, { height: 64 + insets.bottom, paddingBottom: insets.bottom > 0 ? insets.bottom - 8 : 8 }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.tabBarAndroidBg]} />
      )}
      <View style={{ flexDirection: 'row', flex: 1, paddingTop: 4 }}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

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

          const icons = TAB_ICONS[route.name];
          const iconName = isFocused ? icons.active : icons.inactive;
          const iconColor = isFocused ? Colors.primary : 'rgba(255, 255, 255, 0.3)';
          const iconSize = isFocused ? 26 : 24;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={{ flex: 1, alignItems: 'center' }}
              activeOpacity={0.7}
            >
              <View style={isFocused ? styles.activeIconWrapper : undefined}>
                <Ionicons name={iconName as any} size={iconSize} color={iconColor} />
              </View>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.tabLabel, { color: isFocused ? Colors.primary : 'rgba(255, 255, 255, 0.3)' }]}>
                {route.name.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} insets={insets} />}
      tabBarPosition="bottom"
      swipeEnabled={true}
      screenOptions={{
        lazy: true,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Devices" component={DevicesScreen} />
      <Tab.Screen name="Functions" component={FunctionsScreen} />
      <Tab.Screen name="Automations" component={AutomationsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      detachInactiveScreens={Platform.OS === 'android' ? false : true}
      screenOptions={{
        headerShown: false,
        animation: 'simple_push',
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="AALEditor" component={AALEditorScreen} />
      <Stack.Screen name="AddDevice" component={AddDeviceScreen} />
      <Stack.Screen name="EditDevice" component={EditDeviceScreen} />
      <Stack.Screen name="ManageRooms" component={ManageRoomsScreen} />
      <Stack.Screen name="AddEditFunction" component={AddEditFunctionScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  },
  tabLabel: {
    fontFamily: Typography.families.label,
    fontSize: 8,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.5,
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
