import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';

// ── Types ──
type RoomIcon = keyof typeof Ionicons.glyphMap;

interface Room {
  id: string;
  name: string;
  icon: RoomIcon;
  deviceCount: number;
}

const AVAILABLE_ICONS: { icon: RoomIcon; label: string }[] = [
  { icon: 'tv-outline', label: 'Living' },
  { icon: 'restaurant-outline', label: 'Kitchen' },
  { icon: 'bed-outline', label: 'Bedroom' },
  { icon: 'mic-outline', label: 'Studio' },
  { icon: 'desktop-outline', label: 'Office' },
  { icon: 'car-outline', label: 'Garage' },
  { icon: 'water-outline', label: 'Bathroom' },
  { icon: 'leaf-outline', label: 'Garden' },
  { icon: 'game-controller-outline', label: 'Game' },
  { icon: 'barbell-outline', label: 'Gym' },
  { icon: 'library-outline', label: 'Library' },
  { icon: 'cafe-outline', label: 'Lounge' },
];

const INITIAL_ROOMS: Room[] = [
  { id: '1', name: 'Living Room', icon: 'tv-outline', deviceCount: 3 },
  { id: '2', name: 'Kitchen', icon: 'restaurant-outline', deviceCount: 1 },
  { id: '3', name: 'Bedroom', icon: 'bed-outline', deviceCount: 2 },
  { id: '4', name: 'Studio', icon: 'mic-outline', deviceCount: 0 },
];

export default function ManageRoomsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomName, setRoomName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<RoomIcon>('tv-outline');

  const openAddModal = () => {
    setEditingRoom(null);
    setRoomName('');
    setSelectedIcon('tv-outline');
    setModalVisible(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setRoomName(room.name);
    setSelectedIcon(room.icon);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!roomName.trim()) return;

    if (editingRoom) {
      // Update existing
      setRooms(prev =>
        prev.map(r =>
          r.id === editingRoom.id
            ? { ...r, name: roomName.trim(), icon: selectedIcon }
            : r
        )
      );
    } else {
      // Add new
      const newRoom: Room = {
        id: Date.now().toString(),
        name: roomName.trim(),
        icon: selectedIcon,
        deviceCount: 0,
      };
      setRooms(prev => [...prev, newRoom]);
    }
    setModalVisible(false);
  };

  const handleDelete = (room: Room) => {
    if (room.deviceCount > 0) {
      Alert.alert(
        'Cannot Delete',
        `"${room.name}" still has ${room.deviceCount} device(s) assigned. Reassign or remove them first.`,
        [{ text: 'OK' }]
      );
      return;
    }
    Alert.alert(
      'Delete Room',
      `Are you sure you want to delete "${room.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setRooms(prev => prev.filter(r => r.id !== room.id)),
        },
      ]
    );
  };

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
        <Text style={styles.headerTitle}>MANAGE ROOMS</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* ═══ Heading ═══ */}
      <View style={styles.headingSection}>
        <Text style={styles.headline}>Your Spaces</Text>
        <Text style={styles.subtitle}>
          {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'} configured
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ Room Cards ═══ */}
        {rooms.map((room) => (
          <TouchableOpacity
            key={room.id}
            style={styles.roomCard}
            activeOpacity={0.8}
            onPress={() => openEditModal(room)}
            onLongPress={() => handleDelete(room)}
          >
            <View style={styles.roomCardLeft}>
              <View style={styles.roomIconCircle}>
                <Ionicons name={room.icon} size={24} color={Colors.primary} />
              </View>
              <View style={styles.roomInfo}>
                <Text style={styles.roomName}>{room.name}</Text>
                <Text style={styles.roomDeviceCount}>
                  {room.deviceCount} {room.deviceCount === 1 ? 'device' : 'devices'}
                </Text>
              </View>
            </View>
            <View style={styles.roomCardRight}>
              <Ionicons name="chevron-forward" size={18} color={Colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
        ))}

        {/* ═══ Add Room Card ═══ */}
        <TouchableOpacity
          style={styles.addRoomCard}
          activeOpacity={0.7}
          onPress={openAddModal}
        >
          <View style={styles.addIconCircle}>
            <Ionicons name="add" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.addRoomText}>Add New Room</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ═══ Add/Edit Room Modal ═══ */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <BlurView intensity={40} tint="dark" style={styles.overlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingRoom ? 'Edit Room' : 'New Room'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={22} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Room Name Input */}
            <Text style={styles.fieldLabel}>ROOM NAME</Text>
            <TextInput
              style={styles.nameInput}
              value={roomName}
              onChangeText={setRoomName}
              placeholder="e.g. Living Room"
              placeholderTextColor="rgba(173,170,173,0.5)"
              autoFocus
            />

            {/* Icon Picker */}
            <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>ICON</Text>
            <View style={styles.iconGrid}>
              {AVAILABLE_ICONS.map((item) => {
                const isSelected = selectedIcon === item.icon;
                return (
                  <TouchableOpacity
                    key={item.icon}
                    style={[styles.iconOption, isSelected && styles.iconOptionSelected]}
                    onPress={() => setSelectedIcon(item.icon)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={item.icon}
                      size={22}
                      color={isSelected ? Colors.primary : Colors.onSurfaceVariant}
                    />
                    <Text style={[styles.iconLabel, isSelected && styles.iconLabelSelected]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, !roomName.trim() && styles.saveBtnDisabled]}
              activeOpacity={0.8}
              onPress={handleSave}
              disabled={!roomName.trim()}
            >
              <Ionicons name="checkmark" size={20} color={Colors.onPrimary} />
              <Text style={styles.saveBtnText}>
                {editingRoom ? 'SAVE CHANGES' : 'CREATE ROOM'}
              </Text>
            </TouchableOpacity>

            {/* Delete (only in edit mode) */}
            {editingRoom && (
              <TouchableOpacity
                style={styles.deleteBtn}
                activeOpacity={0.8}
                onPress={() => {
                  setModalVisible(false);
                  handleDelete(editingRoom);
                }}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
                <Text style={styles.deleteBtnText}>DELETE ROOM</Text>
              </TouchableOpacity>
            )}
          </View>
        </BlurView>
      </Modal>
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

  // ── Heading ──
  headingSection: {
    paddingHorizontal: Spacing['2xl'],
    marginBottom: Spacing['2xl'],
  },
  headline: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.displaySm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    letterSpacing: -1,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    color: Colors.onSurfaceVariant,
  },

  scrollContent: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['5xl'] * 2,
    gap: Spacing.md,
  },

  // ── Room Cards ──
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
  },
  roomCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    flex: 1,
  },
  roomIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(116, 177, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(116, 177, 255, 0.15)',
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.titleLg,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    marginBottom: 2,
  },
  roomDeviceCount: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  roomCardRight: {
    opacity: 0.5,
  },

  // ── Add Room ──
  addRoomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
    borderStyle: 'dashed',
  },
  addIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(116, 177, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(116, 177, 255, 0.1)',
  },
  addRoomText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    fontWeight: Typography.weights.medium,
    color: Colors.onSurfaceVariant,
  },

  // ── Modal ──
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surfaceContainer,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing['2xl'],
    paddingBottom: Spacing['4xl'],
    borderTopWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  modalTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.headlineMd,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
  },
  modalCloseBtn: {
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radii.full,
  },

  // ── Form Fields ──
  fieldLabel: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  nameInput: {
    backgroundColor: Colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.3)',
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurface,
  },

  // ── Icon Picker ──
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing['2xl'],
  },
  iconOption: {
    width: '22%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
    gap: Spacing.xs,
  },
  iconOptionSelected: {
    backgroundColor: 'rgba(116, 177, 255, 0.15)',
    borderColor: Colors.primary,
  },
  iconLabel: {
    fontFamily: Typography.families.label,
    fontSize: 9,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  iconLabelSelected: {
    color: Colors.primary,
  },

  // ── Buttons ──
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    paddingVertical: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  saveBtnDisabled: {
    opacity: 0.4,
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
    paddingVertical: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(215, 56, 59, 0.3)',
    marginTop: Spacing.md,
  },
  deleteBtnText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelMd,
    fontWeight: Typography.weights.bold,
    color: Colors.error,
    letterSpacing: 2,
  },
});
