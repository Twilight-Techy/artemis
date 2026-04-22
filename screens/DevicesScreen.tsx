import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../constants/theme';
import TopNavBar from '../components/TopNavBar';
import { Device, DeviceType } from '../components/devices/types';
import { DeviceFilterBar, FilterCategory } from '../components/devices/DeviceFilterBar';
import { RoomSection } from '../components/devices/RoomSection';
import { DeviceDetailModal } from '../components/devices/DeviceDetailModal';
import { RootStackParamList } from '../navigation/AppNavigator';

const MOCK_DEVICES: Device[] = [
  {
    id: '1', roomId: 'Living Room', name: 'Main Lights', type: 'light', isOn: true, intensity: 80, color: '#74B1FF'
  },
  {
    id: '2', roomId: 'Living Room', name: 'AC Unit', type: 'climate', isOn: true, temperature: 22
  },
  {
    id: '3', roomId: 'Bedroom', name: 'Bedside Lamp', type: 'light', isOn: false, intensity: 40, color: '#FF716C'
  },
  {
    id: '4', roomId: 'Bedroom', name: 'Smart Blinds', type: 'shade', isOn: true, position: 20
  },
  {
    id: '5', roomId: 'Kitchen', name: 'Coffee Maker', type: 'appliance', isOn: false, statusText: 'Ready'
  },
  {
    id: '6', roomId: 'Living Room', name: 'Temp Sensor', type: 'sensor', isOn: true, statusText: '22.5°C'
  }
];

export default function DevicesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All');
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES);
  
  // Modal state
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const handleDeviceToggle = (id: string, newState: boolean) => {
    setDevices(prev => prev.map(dev => dev.id === id ? { ...dev, isOn: newState } : dev));
    
    // Update selected device if it's currently open
    if (selectedDevice?.id === id) {
      setSelectedDevice(prev => prev ? { ...prev, isOn: newState } : null);
    }
  };

  const handleDevicePress = (device: Device) => {
    setSelectedDevice(device);
  };

  const handleUpdateDeviceValue = (updates: Partial<Device>) => {
    if (!selectedDevice) return;
    
    // Update local state
    setDevices(prev => prev.map(dev => 
      dev.id === selectedDevice.id ? { ...dev, ...updates } : dev
    ));
    
    // Update currently selected
    setSelectedDevice(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleDeviceLongPress = (device: Device) => {
    navigation.navigate('EditDevice', {
      deviceId: device.id,
      deviceName: device.name,
      roomId: device.roomId,
      deviceType: device.type,
    });
  };

  const filteredDevices = useMemo(() => {
    if (activeFilter === 'All') return devices;
    
    return devices.filter(dev => {
      if (activeFilter === 'Lights' && dev.type === 'light') return true;
      if (activeFilter === 'Climate' && dev.type === 'climate') return true;
      if (activeFilter === 'Sensors' && dev.type === 'sensor') return true;
      if (activeFilter === 'Security' && dev.type === 'sensor') return true; // Just reuse sensor for mockup
      return false;
    });
  }, [devices, activeFilter]);

  // Group by room
  const rooms = useMemo(() => {
    const grouped: Record<string, Device[]> = {};
    filteredDevices.forEach(dev => {
      if (!grouped[dev.roomId]) grouped[dev.roomId] = [];
      grouped[dev.roomId].push(dev);
    });
    return grouped;
  }, [filteredDevices]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TopNavBar />
      
      {/* ═══ Greeting Section ═══ */}
      <View style={styles.greetingSection}>
        <View style={styles.headlineRow}>
          <Text style={styles.headline}>Connected </Text>
          <Text style={styles.headlineGradient}>Devices</Text>
        </View>
        <Text style={styles.subText}>
          {filteredDevices.length} {filteredDevices.length === 1 ? 'device' : 'devices'} across {Object.keys(rooms).length} {Object.keys(rooms).length === 1 ? 'room' : 'rooms'}
        </Text>
      </View>

      <View style={styles.header}>
        <DeviceFilterBar activeFilter={activeFilter} onSelect={setActiveFilter} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {Object.keys(rooms).map(roomName => (
          <RoomSection
            key={roomName}
            roomName={roomName}
            devices={rooms[roomName]}
            onDevicePress={handleDevicePress}
            onDeviceToggle={handleDeviceToggle}
            onDeviceLongPress={handleDeviceLongPress}
          />
        ))}
      </ScrollView>

      <DeviceDetailModal
        visible={!!selectedDevice}
        device={selectedDevice}
        onClose={() => setSelectedDevice(null)}
        onToggle={() => {
          if (selectedDevice) {
            handleDeviceToggle(selectedDevice.id, !selectedDevice.isOn);
          }
        }}
        onUpdateValue={handleUpdateDeviceValue}
        onEdit={(device) => {
          setSelectedDevice(null); // Close modal
          handleDeviceLongPress(device); // Navigate to edit
        }}
      />

      {/* Add Device FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AddDevice')}
      >
        <Ionicons name="add" size={28} color={Colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  greetingSection: {
    paddingHorizontal: Spacing['2xl'],
    marginBottom: Spacing.md,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headline: {
    fontFamily: Typography.families.headline,
    fontSize: 32,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  headlineGradient: {
    fontFamily: Typography.families.headline,
    fontSize: 32,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  subText: {
    fontFamily: Typography.families.body,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
  header: {
    paddingVertical: 16,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
