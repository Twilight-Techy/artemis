import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { Device, DeviceType } from '../components/devices/types';
import { DeviceFilterBar, FilterCategory } from '../components/devices/DeviceFilterBar';
import { RoomSection } from '../components/devices/RoomSection';
import { DeviceDetailModal } from '../components/devices/DeviceDetailModal';

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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingVertical: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
});
