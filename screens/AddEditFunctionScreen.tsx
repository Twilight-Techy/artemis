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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { artemisApi } from '../api/artemisClient';

// ── Types ──
type FunctionType = 'hardware' | 'software' | 'hybrid';

interface ConnectableDevice {
  id: string;
  name: string;
  device_type: string;
  room?: string;
}

interface DeviceAction {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  action: string;
  value?: string;
}

// ── Constants ──
const FUNCTION_TYPES: { id: FunctionType; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { id: 'hardware', label: 'Hardware', icon: 'hardware-chip-outline', desc: 'Controls physical devices' },
  { id: 'software', label: 'Software', icon: 'cloud-outline', desc: 'Calls APIs & services' },
  { id: 'hybrid', label: 'Hybrid', icon: 'git-merge-outline', desc: 'Devices + services' },
];

const getCapabilities = (deviceType: string): { label: string; value: string; hasValue?: boolean; placeholder?: string }[] => {
  switch (deviceType?.toLowerCase()) {
    case 'light': case 'lights':
      return [
        { label: 'Turn On', value: 'turn_on' },
        { label: 'Turn Off', value: 'turn_off' },
        { label: 'Toggle', value: 'toggle' },
        { label: 'Set Brightness', value: 'set_brightness', hasValue: true, placeholder: '0–100' },
      ];
    case 'thermostat': case 'climate': case 'ac':
      return [
        { label: 'Turn On', value: 'turn_on' },
        { label: 'Turn Off', value: 'turn_off' },
        { label: 'Set Temp', value: 'set_temperature', hasValue: true, placeholder: 'e.g. 22°C' },
      ];
    case 'lock': case 'security':
      return [
        { label: 'Lock', value: 'lock' },
        { label: 'Unlock', value: 'unlock' },
      ];
    default:
      return [
        { label: 'Turn On', value: 'turn_on' },
        { label: 'Turn Off', value: 'turn_off' },
        { label: 'Toggle', value: 'toggle' },
      ];
  }
};

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
  const [availableDevices, setAvailableDevices] = useState<ConnectableDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [deviceActions, setDeviceActions] = useState<DeviceAction[]>([]);

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

  const toggleDevice = (device: ConnectableDevice) => {
    setDeviceActions(prev => {
      if (prev.find(da => da.deviceId === device.id)) {
        return prev.filter(da => da.deviceId !== device.id);
      }
      const caps = getCapabilities(device.device_type);
      return [...prev, { deviceId: device.id, deviceName: device.name, deviceType: device.device_type, action: caps[0]?.value ?? 'toggle' }];
    });
  };

  const updateDeviceAction = (deviceId: string, action: string) => {
    setDeviceActions(prev => prev.map(da => da.deviceId === deviceId ? { ...da, action, value: undefined } : da));
  };

  const updateDeviceValue = (deviceId: string, value: string) => {
    setDeviceActions(prev => prev.map(da => da.deviceId === deviceId ? { ...da, value } : da));
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

  const [isLoading, setIsLoading] = useState(false);

  // Fetch initial data if editing
  React.useEffect(() => {
    if (isEdit) {
      const fetchInitial = async () => {
        try {
          const fns = await artemisApi.getFunctions();
          const target = fns.find((f: any) => f.name === initName);
          if (target) {
            setDescription(target.description || '');
            setFunctionType(target.function_type as FunctionType);
            setEndpoint(target.url || '');
            setMethod(target.method || 'POST');
            if (target.parameters) setParameters(target.parameters);
            if (target.device_actions) setDeviceActions(target.device_actions);
          }
        } catch (e) {
          console.warn('Failed to fetch initial function', e);
        }
      };
      fetchInitial();
    }
  }, [isEdit, initName]);

  // Fetch real devices when hardware/hybrid type is selected
  React.useEffect(() => {
    const needsDevices = functionType === 'hardware' || functionType === 'hybrid';
    if (!needsDevices) return;
    setDevicesLoading(true);
    Promise.all([artemisApi.getDevices(), artemisApi.getRooms()])
      .then(([devicesData, roomsData]: [any[], any[]]) => {
        const roomMap: Record<string, string> = {};
        if (Array.isArray(roomsData)) {
          roomsData.forEach((r: any) => { roomMap[r.id] = r.name; });
        }
        setAvailableDevices(
          (Array.isArray(devicesData) ? devicesData : []).map((d: any) => ({
            id: d.id,
            name: d.name,
            device_type: d.device_type ?? 'generic',
            room: roomMap[d.room_id] ?? '',
          }))
        );
      })
      .catch(() => console.warn('Failed to load devices'))
      .finally(() => setDevicesLoading(false));
  }, [functionType]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please give your function a name.');
      return;
    }
    
    setIsLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        function_type: functionType,
        method: method,
        url: functionType !== 'hardware' ? endpoint : undefined,
        parameters: parameters,
        device_actions: deviceActions.map(da => ({
          device_id: da.deviceId,
          action: da.action,
          value: da.value,
        })),
      };

      if (isEdit) {
        // we need the ID of the function we are editing to perform the PUT request. 
        // We'll fetch it by name matching for brevity, but passing the ID down via route params is much better!
        const fns = await artemisApi.getFunctions();
        const target = fns.find((f: any) => f.name === initName);
        if (target) {
          await artemisApi.updateFunction(target.id, payload);
        }
      } else {
        await artemisApi.createFunction(payload);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", "Failed to save the function.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Function',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            setIsLoading(true);
            try {
              const fns = await artemisApi.getFunctions();
              const target = fns.find((f: any) => f.name === initName);
              if (target) {
                await artemisApi.deleteFunction(target.id);
              }
              navigation.goBack();
            } catch (e) {
              Alert.alert("Error", "Failed to delete function.");
            } finally {
              setIsLoading(false);
            }
          } 
        },
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

        {/* ═══ Devices & Actions (Hardware / Hybrid) ═══ */}
        {showDevices && (
          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Ionicons name="hardware-chip-outline" size={20} color={Colors.primaryDim} />
              <Text style={styles.sectionHeading}>Devices & Actions</Text>
            </View>
            <Text style={styles.sectionSubtext}>
              Select a device and configure the action to perform on it.
              {deviceActions.length > 0 ? ` ${deviceActions.length} configured.` : ''}
            </Text>

            {devicesLoading ? (
              <View style={styles.deviceEmptyState}>
                <Text style={styles.deviceEmptyText}>Loading devices...</Text>
              </View>
            ) : availableDevices.length === 0 ? (
              <View style={styles.deviceEmptyState}>
                <Ionicons name="hardware-chip-outline" size={32} color={Colors.onSurfaceVariant} style={{ opacity: 0.3 }} />
                <Text style={[styles.deviceEmptyText, { marginTop: Spacing.sm }]}>
                  No devices found. Add devices first from the Devices tab.
                </Text>
              </View>
            ) : (
              <View style={styles.deviceList}>
                {(() => {
                  const rooms = Array.from(
                    new Set(availableDevices.map(d => d.room || 'No Room'))
                  );
                  return rooms.map(room => {
                    const roomDevices = availableDevices.filter(
                      d => (d.room || 'No Room') === room
                    );
                    return (
                      <View key={room}>
                        {/* Room header */}
                        <Text style={styles.roomHeader}>{room.toUpperCase()}</Text>

                        {roomDevices.map(device => {
                          const da = deviceActions.find(a => a.deviceId === device.id);
                          const isSelected = !!da;
                          const caps = getCapabilities(device.device_type);
                          const selectedCap = caps.find(c => c.value === da?.action);
                          return (
                            <View key={device.id} style={styles.deviceItem}>
                              <TouchableOpacity
                                style={[styles.deviceRow, isSelected && styles.deviceRowSelected]}
                                onPress={() => toggleDevice(device)}
                                activeOpacity={0.7}
                              >
                                <View style={[styles.deviceRowCheck, isSelected && styles.deviceRowCheckActive]}>
                                  {isSelected && <Ionicons name="checkmark" size={11} color={Colors.onPrimary} />}
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.deviceRowName, isSelected && { color: Colors.onSurface }]}>
                                    {device.name}
                                  </Text>
                                  <Text style={styles.deviceRowMeta}>{device.device_type}</Text>
                                </View>
                                <Ionicons
                                  name={isSelected ? 'chevron-up' : 'chevron-down'}
                                  size={16}
                                  color={isSelected ? Colors.primary : Colors.onSurfaceVariant}
                                />
                              </TouchableOpacity>

                              {isSelected && (
                                <View style={styles.deviceActionPanel}>
                                  <Text style={styles.deviceActionLabel}>ACTION</Text>
                                  <View style={styles.actionPillRow}>
                                    {caps.map(cap => (
                                      <TouchableOpacity
                                        key={cap.value}
                                        style={[styles.actionPill, da?.action === cap.value && styles.actionPillActive]}
                                        onPress={() => updateDeviceAction(device.id, cap.value)}
                                        activeOpacity={0.7}
                                      >
                                        <Text style={[styles.actionPillText, da?.action === cap.value && styles.actionPillTextActive]}>
                                          {cap.label}
                                        </Text>
                                      </TouchableOpacity>
                                    ))}
                                  </View>
                                  {selectedCap?.hasValue && (
                                    <TextInput
                                      style={[styles.textInput, { marginTop: Spacing.md }]}
                                      value={da?.value ?? ''}
                                      onChangeText={val => updateDeviceValue(device.id, val)}
                                      placeholder={selectedCap.placeholder ?? 'Enter value'}
                                      placeholderTextColor="rgba(173,170,173,0.5)"
                                      keyboardType="numeric"
                                    />
                                  )}
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    );
                  });
                })()}
              </View>
            )}
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
  deviceEmptyState: {
    padding: Spacing['2xl'],
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
  },
  deviceEmptyText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  deviceList: {
    gap: Spacing.md,
  },
  roomHeader: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelXs,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    letterSpacing: 3,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
    opacity: 0.8,
  },
  deviceItem: {
    marginBottom: Spacing.xs,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
    backgroundColor: Colors.surfaceContainerHigh,
  },
  deviceRowSelected: {
    backgroundColor: 'rgba(116, 177, 255, 0.08)',
    borderColor: 'rgba(116, 177, 255, 0.25)',
  },
  deviceRowCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceRowCheckActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  deviceRowName: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    fontWeight: Typography.weights.medium,
    color: Colors.onSurfaceVariant,
  },
  deviceRowMeta: {
    fontFamily: Typography.families.label,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    opacity: 0.6,
    marginTop: 1,
  },
  deviceActionPanel: {
    backgroundColor: 'rgba(116, 177, 255, 0.04)',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(116, 177, 255, 0.15)',
    borderBottomLeftRadius: Radii.lg,
    borderBottomRightRadius: Radii.lg,
    padding: Spacing.lg,
  },
  deviceActionLabel: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelXs,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurfaceVariant,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  actionPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.3)',
    backgroundColor: Colors.surfaceContainerLow,
  },
  actionPillActive: {
    backgroundColor: 'rgba(116, 177, 255, 0.15)',
    borderColor: Colors.primary,
  },
  actionPillText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  actionPillTextActive: {
    color: Colors.primary,
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
