import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';

// ── Types ──
type Category = 'Daily Routine' | 'Security' | 'Energy Saving' | 'Custom';

type TriggerType = 'time' | 'sensor' | 'manual' | 'presence';

interface ConnectableDevice {
  id: string;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

// ── Constants ──
const CATEGORIES: { id: Category; label: string; color: string; bgColor: string }[] = [
  { id: 'Daily Routine', label: 'Daily Routine', color: Colors.tertiary, bgColor: 'rgba(129, 236, 255, 0.15)' },
  { id: 'Security', label: 'Security', color: Colors.error, bgColor: 'rgba(255, 113, 108, 0.15)' },
  { id: 'Energy Saving', label: 'Energy Saving', color: Colors.primary, bgColor: 'rgba(116, 177, 255, 0.15)' },
  { id: 'Custom', label: 'Custom', color: Colors.onSurfaceVariant, bgColor: 'rgba(72, 71, 74, 0.15)' },
];

const TRIGGER_TYPES: { id: TriggerType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'time', label: 'Time', icon: 'time-outline' },
  { id: 'sensor', label: 'Sensor', icon: 'pulse-outline' },
  { id: 'manual', label: 'Manual', icon: 'hand-left-outline' },
  { id: 'presence', label: 'Presence', icon: 'person-outline' },
];

const AVAILABLE_DEVICES: ConnectableDevice[] = [
  { id: '1', name: 'Main Lights', icon: 'lightbulb-outline' },
  { id: '2', name: 'AC Unit', icon: 'air-conditioner' },
  { id: '3', name: 'Blinds', icon: 'blinds' },
  { id: '4', name: 'Coffee Maker', icon: 'coffee-outline' },
  { id: '5', name: 'Door Lock', icon: 'lock-outline' },
  { id: '6', name: 'Speakers', icon: 'speaker' },
  { id: '7', name: 'Thermostat', icon: 'thermometer' },
  { id: '8', name: 'Camera', icon: 'cctv' },
];

type AddEditFunctionRouteParams = {
  AddEditFunction: {
    mode: 'add' | 'edit';
    functionName?: string;
    functionCategory?: Category;
    functionDescription?: string;
  };
};

export default function AddEditFunctionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<AddEditFunctionRouteParams, 'AddEditFunction'>>();

  const { mode = 'add', functionName: initName, functionCategory: initCategory, functionDescription: initDesc } = route.params ?? {};
  const isEdit = mode === 'edit';

  const [name, setName] = useState(initName || '');
  const [description, setDescription] = useState(initDesc || '');
  const [category, setCategory] = useState<Category>(initCategory || 'Daily Routine');
  const [triggerType, setTriggerType] = useState<TriggerType>('manual');
  const [triggerValue, setTriggerValue] = useState('');
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());

  const toggleDevice = (id: string) => {
    setSelectedDevices(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please give your function a name.');
      return;
    }
    // In production, would persist the function here
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Function',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  const activeCategoryColor = CATEGORIES.find(c => c.id === category)?.color || Colors.primary;

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
        <Text style={styles.headerTitle}>{isEdit ? 'EDIT FUNCTION' : 'NEW FUNCTION'}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ Identity ═══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="flash-outline" size={20} color={Colors.primaryDim} />
            <Text style={styles.sectionHeading}>Identity</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>FUNCTION NAME</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Solar Awakening"
              placeholderTextColor="rgba(173,170,173,0.5)"
            />

            <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>DESCRIPTION</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="What does this function do?"
              placeholderTextColor="rgba(173,170,173,0.5)"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* ═══ Category ═══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="pricetag-outline" size={20} color={Colors.primaryDim} />
            <Text style={styles.sectionHeading}>Category</Text>
          </View>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryPill,
                    isSelected && { backgroundColor: cat.bgColor, borderColor: cat.color },
                  ]}
                  onPress={() => setCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.categoryDot, { backgroundColor: isSelected ? cat.color : Colors.onSurfaceVariant }]} />
                  <Text style={[styles.categoryText, isSelected && { color: cat.color }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ═══ Trigger ═══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="git-branch-outline" size={20} color={Colors.primaryDim} />
            <Text style={styles.sectionHeading}>Trigger</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>TRIGGER TYPE</Text>
            <View style={styles.triggerRow}>
              {TRIGGER_TYPES.map((t) => {
                const isSelected = triggerType === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.triggerChip, isSelected && styles.triggerChipActive]}
                    onPress={() => setTriggerType(t.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={t.icon}
                      size={16}
                      color={isSelected ? Colors.primary : Colors.onSurfaceVariant}
                    />
                    <Text style={[styles.triggerText, isSelected && styles.triggerTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>CONDITION</Text>
            <TextInput
              style={styles.textInput}
              value={triggerValue}
              onChangeText={setTriggerValue}
              placeholder={
                triggerType === 'time' ? 'e.g. 06:30 AM every day' :
                triggerType === 'sensor' ? 'e.g. temperature > 28°C' :
                triggerType === 'presence' ? 'e.g. when someone enters' :
                'Tap to execute manually'
              }
              placeholderTextColor="rgba(173,170,173,0.5)"
              editable={triggerType !== 'manual'}
            />
          </View>
        </View>

        {/* ═══ Devices ═══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="hardware-chip-outline" size={20} color={Colors.primaryDim} />
            <Text style={styles.sectionHeading}>Devices</Text>
          </View>
          <Text style={styles.sectionSubtext}>
            Select which devices this function controls. {selectedDevices.size > 0 ? `${selectedDevices.size} selected.` : ''}
          </Text>
          <View style={styles.devicesGrid}>
            {AVAILABLE_DEVICES.map((device) => {
              const isSelected = selectedDevices.has(device.id);
              return (
                <TouchableOpacity
                  key={device.id}
                  style={[styles.deviceChip, isSelected && styles.deviceChipSelected]}
                  onPress={() => toggleDevice(device.id)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={device.icon}
                    size={18}
                    color={isSelected ? Colors.primary : Colors.onSurfaceVariant}
                  />
                  <Text style={[styles.deviceChipText, isSelected && styles.deviceChipTextSelected]}>
                    {device.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ═══ Actions ═══ */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={!name.trim()}
          >
            <Ionicons name={isEdit ? 'save' : 'add-circle'} size={20} color={Colors.onPrimary} />
            <Text style={styles.saveBtnText}>
              {isEdit ? 'SAVE CHANGES' : 'CREATE FUNCTION'}
            </Text>
          </TouchableOpacity>

          {isEdit && (
            <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.8} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
              <Text style={styles.deleteBtnText}>DELETE FUNCTION</Text>
            </TouchableOpacity>
          )}
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
  sectionSubtext: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.lg,
  },

  // ── Cards ──
  card: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
    padding: Spacing['2xl'],
  },

  // ── Fields ──
  fieldLabel: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  textInput: {
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
  textArea: {
    minHeight: 80,
    paddingTop: Spacing.md + 2,
  },

  // ── Category ──
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryPill: {
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
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    fontWeight: Typography.weights.medium,
    color: Colors.onSurfaceVariant,
  },

  // ── Triggers ──
  triggerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  triggerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.3)',
    backgroundColor: Colors.surfaceContainerLow,
  },
  triggerChipActive: {
    backgroundColor: 'rgba(116, 177, 255, 0.15)',
    borderColor: Colors.primary,
  },
  triggerText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    fontWeight: Typography.weights.medium,
    color: Colors.onSurfaceVariant,
  },
  triggerTextActive: {
    color: Colors.primary,
  },

  // ── Devices ──
  devicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  deviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
    backgroundColor: Colors.surfaceContainerHigh,
  },
  deviceChipSelected: {
    backgroundColor: 'rgba(116, 177, 255, 0.1)',
    borderColor: 'rgba(116, 177, 255, 0.3)',
  },
  deviceChipText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    fontWeight: Typography.weights.medium,
    color: Colors.onSurfaceVariant,
  },
  deviceChipTextSelected: {
    color: Colors.onSurface,
  },

  // ── Actions ──
  actionsSection: {
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.lg,
    marginTop: Spacing.xl,
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
