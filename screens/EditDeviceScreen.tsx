import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import { DeviceType } from '../components/devices/types';
import { RootStackParamList } from '../navigation/AppNavigator';

// ── Types ──
type EditDeviceRouteParams = {
  EditDevice: {
    deviceId: string;
    deviceName: string;
    roomId: string;
    deviceType: DeviceType;
  };
};

type RoomOption = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const ROOMS: RoomOption[] = [
  { id: 'living_room', label: 'LIVING ROOM', icon: 'tv-outline' },
  { id: 'kitchen', label: 'KITCHEN', icon: 'restaurant-outline' },
  { id: 'bedroom', label: 'BED ROOM', icon: 'bed-outline' },
  { id: 'studio', label: 'STUDIO', icon: 'mic-outline' },
];

const DEVICE_TYPES: { id: DeviceType; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: 'light', label: 'Light', icon: 'lightbulb-outline' },
  { id: 'climate', label: 'Climate', icon: 'ac-unit' },
  { id: 'appliance', label: 'Appliance', icon: 'kitchen' },
  { id: 'media', label: 'Media', icon: 'speaker' },
  { id: 'shade', label: 'Shade', icon: 'blinds' },
  { id: 'sensor', label: 'Sensor', icon: 'sensors' },
];

type Protocol = 'mqtt' | 'http';

export default function EditDeviceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<EditDeviceRouteParams, 'EditDevice'>>();

  const { deviceName: initialName, roomId: initialRoom, deviceType: initialType } = route.params;

  const [deviceName, setDeviceName] = useState(initialName || 'Studio Fan');
  const [deviceType, setDeviceType] = useState<DeviceType>(initialType || 'appliance');
  const [selectedRoom, setSelectedRoom] = useState(initialRoom || 'studio');
  const [protocol, setProtocol] = useState<Protocol>('mqtt');
  const [brokerAddress, setBrokerAddress] = useState('mqtt://192.168.1.100:1883');
  const [topic, setTopic] = useState('home/studio/fan/set');
  const [pinConfig, setPinConfig] = useState('D4');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ═══ Header Bar ═══ */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EDIT DEVICE</Text>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ Identity Section ═══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="finger-print-outline" size={20} color={Colors.primaryDim} />
            <Text style={styles.sectionHeading}>Identity</Text>
          </View>
          <View style={styles.identityCard}>
            <Text style={styles.fieldLabel}>DEVICE NAME</Text>
            <View style={styles.nameInputRow}>
              <MaterialIcons
                name={DEVICE_TYPES.find(t => t.id === deviceType)?.icon || 'device-unknown'}
                size={22}
                color={Colors.primaryDim}
                style={styles.nameIcon}
              />
              <TextInput
                style={styles.nameInput}
                value={deviceName}
                onChangeText={setDeviceName}
                placeholderTextColor="rgba(173,170,173,0.5)"
                placeholder="Enter device name"
              />
            </View>

            <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>DEVICE TYPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeScrollContent}>
              {DEVICE_TYPES.map((type) => {
                const isSelected = deviceType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.typePill, isSelected && styles.typePillSelected]}
                    onPress={() => setDeviceType(type.id)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons 
                      name={type.icon} 
                      size={18} 
                      color={isSelected ? Colors.primary : Colors.onSurfaceVariant} 
                    />
                    <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>{type.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* ═══ Location Section ═══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="location-outline" size={20} color={Colors.primaryDim} />
            <Text style={styles.sectionHeading}>Location</Text>
          </View>
          <View style={styles.roomGrid}>
            {ROOMS.map((room) => {
              const isSelected = selectedRoom === room.id;
              return (
                <TouchableOpacity
                  key={room.id}
                  style={[
                    styles.roomCard,
                    isSelected && styles.roomCardSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedRoom(room.id)}
                >
                  <Ionicons
                    name={room.icon}
                    size={24}
                    color={isSelected ? Colors.primary : Colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.roomLabel,
                      isSelected && styles.roomLabelSelected,
                    ]}
                  >
                    {room.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {/* New Room */}
            <TouchableOpacity
              style={styles.newRoomCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ManageRooms')}
            >
              <Ionicons name="add" size={24} color={Colors.onSurfaceVariant} />
              <Text style={styles.roomLabel}>NEW ROOM</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══ Technical Configuration ═══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="code-slash-outline" size={20} color={Colors.primaryDim} />
            <Text style={styles.sectionHeading}>Configuration</Text>
          </View>

          <View style={styles.techCard}>
            {/* Protocol Toggle */}
            <Text style={styles.fieldLabel}>PROTOCOL</Text>
            <View style={styles.protocolRow}>
              <TouchableOpacity
                style={[
                  styles.protocolPill,
                  protocol === 'mqtt' && styles.protocolPillActive,
                ]}
                onPress={() => setProtocol('mqtt')}
                activeOpacity={0.7}
              >
                {protocol === 'mqtt' && (
                  <View style={styles.protocolDot} />
                )}
                <Text
                  style={[
                    styles.protocolText,
                    protocol === 'mqtt' && styles.protocolTextActive,
                  ]}
                >
                  MQTT
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.protocolPill,
                  protocol === 'http' && styles.protocolPillActive,
                ]}
                onPress={() => setProtocol('http')}
                activeOpacity={0.7}
              >
                {protocol === 'http' && (
                  <View style={styles.protocolDot} />
                )}
                <Text
                  style={[
                    styles.protocolText,
                    protocol === 'http' && styles.protocolTextActive,
                  ]}
                >
                  HTTP REST
                </Text>
              </TouchableOpacity>
            </View>

            {/* Divider via spacing */}
            <View style={styles.techDivider} />

            {/* Broker Address */}
            <Text style={styles.fieldLabel}>BROKER ADDRESS</Text>
            <TextInput
              style={styles.monoInput}
              value={brokerAddress}
              onChangeText={setBrokerAddress}
              placeholderTextColor="rgba(173,170,173,0.5)"
              placeholder="mqtt://..."
            />

            {/* Topic */}
            <Text style={styles.fieldLabel}>TOPIC</Text>
            <TextInput
              style={[styles.monoInput, { color: Colors.secondaryFixed }]}
              value={topic}
              onChangeText={setTopic}
            />

            {/* Pin Config */}
            <Text style={styles.fieldLabel}>PIN CONFIGURATION</Text>
            <TextInput
              style={styles.monoInput}
              value={pinConfig}
              onChangeText={setPinConfig}
              placeholder="e.g., GPIO4"
              placeholderTextColor="rgba(173,170,173,0.5)"
            />
          </View>
        </View>

        {/* ═══ Action Buttons ═══ */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8}>
            <Ionicons name="save" size={20} color={Colors.onSurface} />
            <Text style={styles.saveBtnText}>SAVE CONFIGURATION</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
            <Text style={styles.deleteBtnText}>DELETE DEVICE</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Header ──
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['2xl'],
    height: 56,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    letterSpacing: 3,
  },

  scrollContent: {
    paddingBottom: Spacing['5xl'] * 2,
  },

  // ── Sections ──
  section: {
    paddingHorizontal: Spacing['2xl'],
    marginBottom: Spacing['3xl'],
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionHeading: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.headlineSm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    letterSpacing: 0.3,
  },

  // ── Identity ──
  identityCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
    padding: Spacing['2xl'],
  },
  fieldLabel: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  nameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.3)',
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
  },
  nameIcon: {
    marginRight: Spacing.md,
  },
  nameInput: {
    flex: 1,
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurface,
    paddingVertical: Spacing.lg,
  },
  typeScrollContent: {
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.3)',
    backgroundColor: Colors.surfaceContainerLow,
  },
  typePillSelected: {
    backgroundColor: 'rgba(116, 177, 255, 0.15)',
    borderColor: Colors.primary,
  },
  typeLabel: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    fontWeight: Typography.weights.medium,
    color: Colors.onSurfaceVariant,
  },
  typeLabelSelected: {
    color: Colors.onSurface,
  },

  // ── Location ──
  roomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  roomCard: {
    width: '47%',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  roomCardSelected: {
    backgroundColor: Colors.surfaceContainerHighest,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 4,
  },
  roomLabel: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.2,
  },
  roomLabelSelected: {
    color: Colors.onSurface,
  },
  newRoomCard: {
    width: '47%',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
    borderStyle: 'dashed',
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },

  // ── Technical Configuration ──

  techCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
    padding: Spacing['2xl'],
    gap: Spacing.lg,
  },
  protocolRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  protocolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.3)',
    backgroundColor: Colors.surfaceContainerLow,
  },
  protocolPillActive: {
    backgroundColor: 'rgba(116, 177, 255, 0.15)',
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  protocolDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  protocolText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    fontWeight: Typography.weights.medium,
    color: Colors.onSurfaceVariant,
  },
  protocolTextActive: {
    color: Colors.primary,
  },
  techDivider: {
    height: 1,
    backgroundColor: 'rgba(72, 71, 74, 0.15)',
  },
  monoInput: {
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.2)',
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    color: Colors.onSurface,
  },

  // ── Actions ──
  actionsSection: {
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.lg,
    marginTop: Spacing['2xl'],
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    paddingVertical: Spacing.lg + 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
  saveBtnText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelMd,
    fontWeight: Typography.weights.bold,
    color: Colors.onPrimary,
    letterSpacing: 2,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.full,
    paddingVertical: Spacing.lg + 2,
    borderWidth: 1,
    borderColor: 'rgba(215, 56, 59, 0.3)',
  },
  deleteBtnText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelMd,
    fontWeight: Typography.weights.bold,
    color: Colors.error,
    letterSpacing: 2,
  },
});
