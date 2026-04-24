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
type FunctionType = 'hardware' | 'software' | 'hybrid';

interface ConnectableDevice {
  id: string;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  room: string;
}

// ── Constants ──
const FUNCTION_TYPES: { id: FunctionType; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { id: 'hardware', label: 'Hardware', icon: 'hardware-chip-outline', desc: 'Controls physical devices' },
  { id: 'software', label: 'Software', icon: 'cloud-outline', desc: 'Calls APIs & services' },
  { id: 'hybrid', label: 'Hybrid', icon: 'git-merge-outline', desc: 'Devices + services' },
];

const AVAILABLE_DEVICES: ConnectableDevice[] = [
  { id: '1', name: 'Main Lights', icon: 'lightbulb-outline', room: 'Living Room' },
  { id: '2', name: 'AC Unit', icon: 'air-conditioner', room: 'Living Room' },
  { id: '3', name: 'Smart Blinds', icon: 'blinds', room: 'Bedroom' },
  { id: '4', name: 'Coffee Maker', icon: 'coffee-outline', room: 'Kitchen' },
  { id: '5', name: 'Door Lock', icon: 'lock-outline', room: 'Entrance' },
  { id: '6', name: 'Speakers', icon: 'speaker', room: 'Living Room' },
  { id: '7', name: 'Thermostat', icon: 'thermometer', room: 'Living Room' },
  { id: '8', name: 'Fireplace', icon: 'fireplace', room: 'Living Room' },
];

type AddEditFunctionRouteParams = {
  AddEditFunction: {
    mode: 'add' | 'edit';
    functionName?: string;
  };
};

export default function AddEditFunctionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<AddEditFunctionRouteParams, 'AddEditFunction'>>();

  const { mode = 'add', functionName: initName } = route.params ?? {};
  const isEdit = mode === 'edit';

  // ── State ──
  const [name, setName] = useState(initName || '');
  const [description, setDescription] = useState('');
  const [functionType, setFunctionType] = useState<FunctionType>('hardware');
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());

  // Triggers — voice phrases the AI listens for
  const [triggers, setTriggers] = useState<string[]>(isEdit ? ['good morning', 'wake up the house'] : []);
  const [triggerInput, setTriggerInput] = useState('');

  // Conditions — contextual hints for AI suggestions
  const [conditions, setConditions] = useState<string[]>(isEdit ? ['temperature falls below 18°C'] : []);
  const [conditionInput, setConditionInput] = useState('');

  // Software config
  const [endpoint, setEndpoint] = useState('');
  const [method, setMethod] = useState('POST');
  const [headers, setHeaders] = useState<string[]>([]);
  const [headerInput, setHeaderInput] = useState('');
  const [body, setBody] = useState('');
  const [parameters, setParameters] = useState<string[]>(isEdit ? ['targetEmail', 'reportDate'] : []);
  const [parameterInput, setParameterInput] = useState('');

  const toggleDevice = (id: string) => {
    setSelectedDevices(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addTrigger = () => {
    const val = triggerInput.trim();
    if (val && !triggers.includes(val)) {
      setTriggers(prev => [...prev, val]);
      setTriggerInput('');
    }
  };

  const removeTrigger = (phrase: string) => {
    setTriggers(prev => prev.filter(t => t !== phrase));
  };

  const addCondition = () => {
    const val = conditionInput.trim();
    if (val && !conditions.includes(val)) {
      setConditions(prev => [...prev, val]);
      setConditionInput('');
    }
  };

  const removeCondition = (cond: string) => {
    setConditions(prev => prev.filter(c => c !== cond));
  };

  const addHeader = () => {
    const val = headerInput.trim();
    if (val && !headers.includes(val)) {
      setHeaders(prev => [...prev, val]);
      setHeaderInput('');
    }
  };

  const removeHeader = (val: string) => {
    setHeaders(prev => prev.filter(t => t !== val));
  };

  const addParameter = () => {
    const val = parameterInput.trim();
    if (val && !parameters.includes(val)) {
      setParameters(prev => [...prev, val]);
      setParameterInput('');
    }
  };

  const removeParameter = (val: string) => {
    setParameters(prev => prev.filter(t => t !== val));
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please give your function a name.');
      return;
    }
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

  const showDevices = functionType === 'hardware' || functionType === 'hybrid';
  const showSoftware = functionType === 'software' || functionType === 'hybrid';

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
              placeholder="e.g. Wake Up Living Room"
              placeholderTextColor="rgba(173,170,173,0.5)"
            />

            <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>DESCRIPTION</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="What does this function do when executed?"
              placeholderTextColor="rgba(173,170,173,0.5)"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* ═══ Function Type ═══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="layers-outline" size={20} color={Colors.primaryDim} />
            <Text style={styles.sectionHeading}>Type</Text>
          </View>
          <View style={styles.typeGrid}>
            {FUNCTION_TYPES.map((ft) => {
              const isSelected = functionType === ft.id;
              return (
                <TouchableOpacity
                  key={ft.id}
                  style={[styles.typeCard, isSelected && styles.typeCardSelected]}
                  onPress={() => setFunctionType(ft.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={ft.icon}
                    size={24}
                    color={isSelected ? Colors.primary : Colors.onSurfaceVariant}
                  />
                  <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>
                    {ft.label}
                  </Text>
                  <Text style={styles.typeDesc}>{ft.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ═══ Devices (Hardware / Hybrid) ═══ */}
        {showDevices && (
          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Ionicons name="hardware-chip-outline" size={20} color={Colors.primaryDim} />
              <Text style={styles.sectionHeading}>Devices</Text>
            </View>
            <Text style={styles.sectionSubtext}>
              Select devices this function will control.
              {selectedDevices.size > 0 ? ` ${selectedDevices.size} selected.` : ''}
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
                    <View style={styles.deviceChipInfo}>
                      <Text style={[styles.deviceChipText, isSelected && styles.deviceChipTextSelected]}>
                        {device.name}
                      </Text>
                      <Text style={styles.deviceChipRoom}>{device.room}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ═══ Protocol (Software / Hybrid) ═══ */}
        {showSoftware && (
          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Ionicons name="cloud-outline" size={20} color={Colors.primaryDim} />
              <Text style={styles.sectionHeading}>Protocol</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>ENDPOINT</Text>
              <TextInput
                style={styles.textInput}
                value={endpoint}
                onChangeText={setEndpoint}
                placeholder="e.g. https://api.example.com/send"
                placeholderTextColor="rgba(173,170,173,0.5)"
                autoCapitalize="none"
              />

              <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>METHOD</Text>
              <View style={styles.methodRow}>
                {['GET', 'POST', 'PUT', 'DELETE'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.methodPill, method === m && styles.methodPillActive]}
                    onPress={() => setMethod(m)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.methodText, method === m && styles.methodTextActive]}>
                       {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>REQUIRED PARAMETERS</Text>
              <Text style={{ fontFamily: Typography.families.body, fontSize: 13, color: Colors.onSurfaceVariant, marginBottom: Spacing.sm }}>
                These will be requested from the user before executing.
              </Text>
              {parameters.length > 0 && (
                <View style={styles.tagList}>
                  {parameters.map((p) => (
                    <View key={p} style={[styles.tag, { backgroundColor: 'rgba(184,132,255,0.1)', borderColor: 'rgba(184,132,255,0.2)' }]}>
                      <Ionicons name="pricetag" size={12} color={Colors.secondary} />
                      <Text style={[styles.tagText, { color: Colors.secondary }]}>{p}</Text>
                      <TouchableOpacity onPress={() => removeParameter(p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={16} color={Colors.onSurfaceVariant} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.addTagRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={parameterInput}
                  onChangeText={setParameterInput}
                  placeholder="e.g. email_address"
                  placeholderTextColor="rgba(173,170,173,0.5)"
                  onSubmitEditing={addParameter}
                  returnKeyType="done"
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.addTagBtn} onPress={addParameter} activeOpacity={0.7}>
                  <Ionicons name="add" size={20} color={Colors.onPrimary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>HEADERS (KEY: VALUE)</Text>
              <Text style={{ fontFamily: Typography.families.body, fontSize: 13, color: Colors.onSurfaceVariant, marginBottom: Spacing.md }}>
                Hint: Inject variables using <Text style={{ color: Colors.secondary }}>{`{{parameterName}}`}</Text>
              </Text>
              {headers.length > 0 && (
                <View style={styles.tagList}>
                  {headers.map((h) => (
                    <View key={h} style={[styles.tag, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
                      <Ionicons name="code" size={12} color={Colors.onSurface} />
                      <Text style={[styles.tagText, { color: Colors.onSurface }]}>{h}</Text>
                      <TouchableOpacity onPress={() => removeHeader(h)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={16} color={Colors.onSurfaceVariant} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.addTagRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={headerInput}
                  onChangeText={setHeaderInput}
                  placeholder='e.g. "Authorization: Bearer {{token}}"'
                  placeholderTextColor="rgba(173,170,173,0.5)"
                  onSubmitEditing={addHeader}
                  returnKeyType="done"
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.addTagBtn} onPress={addHeader} activeOpacity={0.7}>
                  <Ionicons name="add" size={20} color={Colors.onPrimary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>REQUEST BODY</Text>
              <Text style={{ fontFamily: Typography.families.body, fontSize: 13, color: Colors.onSurfaceVariant, marginBottom: Spacing.sm }}>
                Hint: Inject variables using <Text style={{ color: Colors.secondary }}>{`{{parameterName}}`}</Text>
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { fontFamily: 'Courier' }]}
                value={body}
                onChangeText={setBody}
                placeholder={`{\n  "email": "{{email_address}}"\n}`}
                placeholderTextColor="rgba(173,170,173,0.5)"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                autoCapitalize="none"
              />

            </View>
          </View>
        )}

        {/* ═══ Triggers ═══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="mic-outline" size={20} color={Colors.primaryDim} />
            <Text style={styles.sectionHeading}>Triggers</Text>
          </View>
          <Text style={styles.sectionSubtext}>
            Voice phrases the AI listens for. When you say one of these, Artemis will consider executing this function.
          </Text>
          <View style={styles.card}>
            {/* Existing triggers */}
            {triggers.length > 0 && (
              <View style={styles.tagList}>
                {triggers.map((phrase) => (
                  <View key={phrase} style={styles.tag}>
                    <Ionicons name="mic" size={12} color={Colors.tertiary} />
                    <Text style={styles.tagText}>"{phrase}"</Text>
                    <TouchableOpacity onPress={() => removeTrigger(phrase)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={16} color={Colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add trigger input */}
            <View style={styles.addTagRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={triggerInput}
                onChangeText={setTriggerInput}
                placeholder='e.g. "good morning"'
                placeholderTextColor="rgba(173,170,173,0.5)"
                onSubmitEditing={addTrigger}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.addTagBtn}
                onPress={addTrigger}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color={Colors.onPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ═══ Conditions ═══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="bulb-outline" size={20} color={Colors.primaryDim} />
            <Text style={styles.sectionHeading}>Conditions</Text>
          </View>
          <Text style={styles.sectionSubtext}>
            Contextual situations where Artemis will suggest executing this function. It will never auto-execute — only recommend.
          </Text>
          <View style={styles.card}>
            {/* Existing conditions */}
            {conditions.length > 0 && (
              <View style={styles.tagList}>
                {conditions.map((cond) => (
                  <View key={cond} style={[styles.tag, styles.conditionTag]}>
                    <Ionicons name="bulb" size={12} color={Colors.primary} />
                    <Text style={[styles.tagText, { color: Colors.primary }]}>{cond}</Text>
                    <TouchableOpacity onPress={() => removeCondition(cond)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={16} color={Colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add condition input */}
            <View style={styles.addTagRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={conditionInput}
                onChangeText={setConditionInput}
                placeholder='e.g. "temperature falls below 18°C"'
                placeholderTextColor="rgba(173,170,173,0.5)"
                onSubmitEditing={addCondition}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.addTagBtn}
                onPress={addCondition}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color={Colors.onPrimary} />
              </TouchableOpacity>
            </View>
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
    lineHeight: 20,
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

  // ── Function Type ──
  typeGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  typeCard: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  typeCardSelected: {
    backgroundColor: 'rgba(116, 177, 255, 0.1)',
    borderColor: Colors.primary,
  },
  typeLabel: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginTop: Spacing.xs,
  },
  typeLabelSelected: {
    color: Colors.onSurface,
  },
  typeDesc: {
    fontFamily: Typography.families.body,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
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
    width: '48%',
    paddingHorizontal: Spacing.md,
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
  deviceChipInfo: {
    flexShrink: 1,
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
  deviceChipRoom: {
    fontFamily: Typography.families.label,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    opacity: 0.7,
  },

  // ── Method Pills ──
  methodRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  methodPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.3)',
    backgroundColor: Colors.surfaceContainerLow,
  },
  methodPillActive: {
    backgroundColor: 'rgba(116, 177, 255, 0.15)',
    borderColor: Colors.primary,
  },
  methodText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  methodTextActive: {
    color: Colors.primary,
  },

  // ── Tags (Triggers & Conditions) ──
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(129, 236, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(129, 236, 255, 0.2)',
  },
  conditionTag: {
    backgroundColor: 'rgba(116, 177, 255, 0.1)',
    borderColor: 'rgba(116, 177, 255, 0.2)',
  },
  tagText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    color: Colors.tertiary,
  },
  addTagRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  addTagBtn: {
    width: 40,
    height: 40,
    borderRadius: Radii.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
