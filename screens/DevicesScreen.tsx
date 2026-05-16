import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../constants/theme';
import TopNavBar from '../components/TopNavBar';
import { Device, DeviceType, mapBackendDevice } from '../components/devices/types';
import { devicePartialToStatePayload } from '../components/devices/capabilities';
import { DeviceFilterBar, FilterCategory } from '../components/devices/DeviceFilterBar';
import { RoomSection } from '../components/devices/RoomSection';
import { DeviceDetailModal } from '../components/devices/DeviceDetailModal';
import { RootStackParamList } from '../navigation/AppNavigator';
import { artemisApi } from '../api/artemisClient';
import { ArtemisLoader } from '../components/ArtemisLoader';
import { ArtemisPullLoader } from '../components/ArtemisPullLoader';

export default function DevicesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All');
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoaded = useRef(false);
  
  // Modal state
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // ── Fetch devices + rooms from backend ──
  const loadDevices = useCallback(async (isPullRefresh = false) => {
    if (!isPullRefresh) setLoading(true);
    try {
      const [devicesData, roomsData] = await Promise.all([
        artemisApi.getDevices(),
        artemisApi.getRooms(),
      ]);

      // Build a room ID → name lookup
      const roomMap: Record<string, string> = {};
      if (Array.isArray(roomsData)) {
        roomsData.forEach((r: any) => { roomMap[r.id] = r.name; });
      }

      // Map backend devices to frontend Device type
      const mapped: Device[] = (Array.isArray(devicesData) ? devicesData : []).map((raw: any) =>
        mapBackendDevice(raw, roomMap[raw.room_id] ?? 'Unknown')
      );

      setDevices(mapped);
      hasLoaded.current = true;
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadDevices(true);
  }, [loadDevices]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoaded.current) {
        loadDevices();
      }
    }, [loadDevices])
  );

  // ── Device toggle (local + API) ──
  const handleDeviceToggle = async (id: string, newState: boolean) => {
    // Optimistic local update
    setDevices(prev => prev.map(dev => dev.id === id ? { ...dev, isOn: newState } : dev));
    if (selectedDevice?.id === id) {
      setSelectedDevice(prev => prev ? { ...prev, isOn: newState } : null);
    }

    // Send command to backend
    try {
      await artemisApi.controlDevice(id, newState ? 'on' : 'off');
    } catch (err) {
      console.error('Toggle failed, reverting:', err);
      setDevices(prev => prev.map(dev => dev.id === id ? { ...dev, isOn: !newState } : dev));
    }
  };

  const handleDevicePress = (device: Device) => {
    setSelectedDevice(device);
  };

  // ── Update specific device values (brightness, speed, etc.) ──
  const handleUpdateDeviceValue = async (updates: Partial<Device>) => {
    if (!selectedDevice) return;
    
    // Optimistic local update
    setDevices(prev => prev.map(dev => 
      dev.id === selectedDevice.id ? { ...dev, ...updates } : dev
    ));
    setSelectedDevice(prev => prev ? { ...prev, ...updates } : null);

    const payload = devicePartialToStatePayload(updates);
    if (Object.keys(payload).length === 0) return;

    try {
      await artemisApi.controlDevice(selectedDevice.id, 'set', payload);
    } catch (err) {
      console.error('Update value failed:', err);
    }
  };

  const handleDeviceLongPress = (device: Device) => {
    navigation.navigate('EditDevice', {
      deviceId: device.id,
      deviceName: device.name,
      roomId: device.roomRawId,
      deviceType: device.type,
    });
  };

  // ── Filtering ──
  const filteredDevices = useMemo(() => {
    if (activeFilter === 'All') return devices;
    
    const typeMap: Record<string, DeviceType[]> = {
      Lights:   ['light'],
      Climate:  ['climate', 'fan'],
      Sensors:  ['sensor'],
      Security: ['security'],
    };

    const allowedTypes = typeMap[activeFilter] ?? [];
    return devices.filter(dev => allowedTypes.includes(dev.type));
  }, [devices, activeFilter]);

  // ── Group by room ──
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
      
      {/* ── Greeting Section ── */}
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ArtemisLoader size={72} label="Syncing devices..." />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
          <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              // Fully hide the native spinner — ArtemisPullLoader provides the visual
              tintColor="transparent"
              colors={['transparent']}
              progressBackgroundColor="transparent"
              progressViewOffset={-100}
            />
          }
        >
          {/* ── Custom pull-to-refresh header ── */}
          {refreshing && (
            <ArtemisPullLoader
              size={10}
              label="Syncing devices…"
              style={styles.pullLoader}
            />
          )}

          {Object.keys(rooms).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="hardware-chip-outline" size={48} color={Colors.onSurfaceVariant} />
              <Text style={styles.emptyText}>No devices found</Text>
              <Text style={styles.emptySubText}>Add a device to get started</Text>
            </View>
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
      )}

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
          setSelectedDevice(null);
          handleDeviceLongPress(device);
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
    paddingBottom: 220,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    // Pull loader up so it visually centres on the full screen,
    // not just the remaining space below the greeting + filter bar.
    marginBottom: 160,
  },
  pullLoader: {
    paddingVertical: Spacing.lg,
  },
  loadingText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurfaceVariant,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: Spacing.sm,
  },
  emptyText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.headlineMd,
    color: Colors.onSurface,
  },
  emptySubText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurfaceVariant,
  },
  fab: {
    position: 'absolute',
    bottom: 140, // Increased to avoid falling behind the bottom nav
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
