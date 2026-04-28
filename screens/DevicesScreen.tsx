import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../constants/theme';
import TopNavBar from '../components/TopNavBar';
import { Device, DeviceType } from '../components/devices/types';
import { DeviceFilterBar, FilterCategory } from '../components/devices/DeviceFilterBar';
import { RoomSection } from '../components/devices/RoomSection';
import { DeviceDetailModal } from '../components/devices/DeviceDetailModal';
import { RootStackParamList } from '../navigation/AppNavigator';
import { artemisApi } from '../api/artemisClient';

export default function DevicesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All');
  const [devices, setDevices] = useState<Device[]>([]);
  const [roomsDict, setRoomsDict] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal state
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [fetchedRooms, fetchedDevices] = await Promise.all([
        artemisApi.getRooms(),
        artemisApi.getDevices()
      ]);

      // Map rooms id -> room name
      const rDict: Record<string, string> = {};
      fetchedRooms.forEach((r: any) => {
        rDict[r.id] = r.name;
      });
      setRoomsDict(rDict);

      // Map Backend DeviceOut to Frontend Device
      const mappedDevices: Device[] = fetchedDevices.map((d: any) => {
        let typeStr = d.device_type.toLowerCase();
        
        const typeMapping: Record<string, DeviceType> = {
          'fan': 'climate',
          'climate': 'climate',
          'light': 'light',
          'switch': 'appliance',
          'media': 'media',
          'sensor': 'sensor',
          'security': 'appliance',
          'other': 'appliance'
        };

        const resolvedType: DeviceType = typeMapping[typeStr] || 'appliance'; 
        
        // Extract data from new JSON structure
        const state = d.state || {};
        const isOnline = Boolean(d.is_online);
        const isOn = Boolean(state.is_on);

        return {
          id: d.id,
          roomId: rDict[d.room_id] || "Unknown",
          name: d.name,
          type: resolvedType,
          isOn: isOn,
          intensity: state.brightness,
          temperature: state.temperature,
          color: state.color,
          statusText: isOnline ? (isOn ? 'Active' : 'Off') : 'Offline',
        };
      });

      setDevices(mappedDevices);
    } catch (e) {
      console.warn("Failed to fetch devices/rooms", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeviceToggle = async (id: string, newState: boolean) => {
    // Optimistic UI update
    setDevices(prev => prev.map(dev => dev.id === id ? { ...dev, isOn: newState } : dev));
    if (selectedDevice?.id === id) {
      setSelectedDevice(prev => prev ? { ...prev, isOn: newState } : null);
    }

    try {
      await artemisApi.controlDevice(id, newState ? "on" : "off");
    } catch (e) {
      console.warn("Failed to toggle device", e);
      // Revert on failure
      setDevices(prev => prev.map(dev => dev.id === id ? { ...dev, isOn: !newState } : dev));
      if (selectedDevice?.id === id) {
        setSelectedDevice(prev => prev ? { ...prev, isOn: !newState } : null);
      }
    }
  };

  const handleDevicePress = (device: Device) => {
    setSelectedDevice(device);
  };

  const handleUpdateDeviceValue = async (updates: Partial<Device>) => {
    if (!selectedDevice) return;
    
    // Optimistic Update local state
    setDevices(prev => prev.map(dev => 
      dev.id === selectedDevice.id ? { ...dev, ...updates } : dev
    ));
    setSelectedDevice(prev => prev ? { ...prev, ...updates } : null);

    try {
      let payloadToSend: Record<string, any> = {};
      
      if (updates.intensity !== undefined) payloadToSend.brightness = updates.intensity;
      if (updates.temperature !== undefined) payloadToSend.temperature = updates.temperature;
      if (updates.position !== undefined) payloadToSend.position = updates.position;
      if (updates.color !== undefined) payloadToSend.color = updates.color;

      if (Object.keys(payloadToSend).length > 0) {
        await artemisApi.controlDevice(selectedDevice.id, "set", payloadToSend);
      }
    } catch (e) {
      console.warn("Failed to set device value", e);
      // We could revert here, but for slider debouncing it might be better to just re-fetch or let user retry
    }
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
        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          Object.keys(rooms).map(roomName => (
            <RoomSection
              key={roomName}
              roomName={roomName}
              devices={rooms[roomName]}
              onDevicePress={handleDevicePress}
              onDeviceToggle={handleDeviceToggle}
              onDeviceLongPress={handleDeviceLongPress}
            />
          ))
        )}
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
