import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import { DeviceType, parseDeviceType } from '../components/devices/types';
import {
  mergeCapabilitySpecs,
  persistedCapabilitiesForDeviceType,
  defaultDeviceStateForDeviceType,
} from '../components/devices/capabilities';
import { RootStackParamList } from '../navigation/AppNavigator';
import { artemisApi } from '../api/artemisClient';

type RoomOption = { id: string; name: string };
type CapSpec = Record<string, unknown>;

const ALL_DEVICE_TYPES: { id: DeviceType; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: 'light', label: 'Light', icon: 'lightbulb-outline' },
  { id: 'climate', label: 'Climate', icon: 'ac-unit' },
  { id: 'fan', label: 'Fan', icon: 'air' },
  { id: 'media', label: 'Media', icon: 'speaker' },
  { id: 'sensor', label: 'Sensor', icon: 'sensors' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'switch', label: 'Switch', icon: 'power' },
  { id: 'other', label: 'Other', icon: 'device-unknown' },
];

export default function EditDeviceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'EditDevice'>>();

  const { deviceId, deviceName: initialName, roomId: initialRoom, deviceType: initialType, endpoint: paramEndpoint, protocol: paramProtocol } =
    route.params || {};

  const isEditing = !!deviceId;

  const [deviceName, setDeviceName] = useState(initialName || '');
  const [deviceType, setDeviceType] = useState<DeviceType>(() => parseDeviceType(initialType));
  const [selectedRoom, setSelectedRoom] = useState(initialRoom || '');
  const [protocol, setProtocol] = useState<'mqtt' | 'http'>(() =>
    paramProtocol === 'mqtt' ? 'mqtt' : 'http',
  );
  const [brokerAddress, setBrokerAddress] = useState(paramEndpoint || 'http://192.168...');
  const [topic, setTopic] = useState('');

  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingDevice, setIsLoadingDevice] = useState(!!deviceId);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [savedType, setSavedType] = useState<DeviceType | null>(null);
  const [loadedCaps, setLoadedCaps] = useState<Record<string, unknown> | null>(null);
  const [loadedState, setLoadedState] = useState<Record<string, unknown> | null>(null);
  const [capOverrides, setCapOverrides] = useState<CapSpec | null>(null);

  const loadDevice = useCallback(async () => {
    if (!deviceId) return;
    setIsLoadingDevice(true);
    try {
      const raw = await artemisApi.getDevice(deviceId);
      setDeviceName(raw.name);
      const t = parseDeviceType(raw.device_type);
      setDeviceType(t);
      setSavedType(t);
      setSelectedRoom(raw.room_id);
      setProtocol('mqtt');
      setBrokerAddress('Artemis Hardware Bridge (MQTT)');
      setTopic('room/command');
      setLoadedCaps(raw.capabilities ?? null);
      setLoadedState(raw.state ?? null);
      setCapOverrides(raw.capabilities ?? null);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not load device.');
    } finally {
      setIsLoadingDevice(false);
    }
  }, [deviceId]);

  useEffect(() => {
    loadDevice();
  }, [loadDevice]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const fetchedRooms = await artemisApi.getRooms();
        setRooms(fetchedRooms.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })));
        if (!initialRoom && !deviceId && fetchedRooms.length > 0) {
          setSelectedRoom(fetchedRooms[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
      } finally {
        setIsLoadingRooms(false);
      }
    };
    fetchRooms();
  }, [deviceId, initialRoom]);

  useEffect(() => {
    if (initialName) setDeviceName(initialName);
    if (initialType) setDeviceType(parseDeviceType(initialType));
    if (initialRoom) setSelectedRoom(initialRoom);
    if (paramEndpoint) setBrokerAddress(paramEndpoint);
    if (paramProtocol === 'mqtt' || paramProtocol === 'http') setProtocol(paramProtocol);
  }, [initialName, initialType, initialRoom, paramEndpoint, paramProtocol]);

  // When type changes in add-mode (or before device loads), start from defaults.
  useEffect(() => {
    if (isEditing) return;
    setCapOverrides(persistedCapabilitiesForDeviceType(deviceType));
  }, [deviceType, isEditing]);

  const buildCapabilitiesForSave = (): Record<string, unknown> => {
    const base = capOverrides ?? (isEditing ? loadedCaps ?? {} : {});
    return mergeCapabilitySpecs(deviceType, base);
  };

  const buildStateForSave = (): Record<string, unknown> => {
    if (isEditing && savedType !== null && deviceType === savedType && loadedState) {
      return { ...loadedState };
    }
    const next = defaultDeviceStateForDeviceType(deviceType);
    if (isEditing && loadedState && typeof loadedState.is_on === 'boolean') {
      next.is_on = loadedState.is_on;
    }
    return next;
  };

  // Keep the in-memory state coherent when changing type (used for new devices)
  useEffect(() => {
    if (isEditing) return;
    setLoadedState((prev) => {
      const prevOn = typeof prev?.is_on === 'boolean' ? prev.is_on : false;
      const next = defaultDeviceStateForDeviceType(deviceType);
      next.is_on = prevOn;
      return next;
    });
  }, [deviceType, isEditing]);

  const handleSave = async () => {
    if (!deviceName || !selectedRoom) {
      Alert.alert('Error', 'Please enter a name and select a room.');
      return;
    }

    setIsSaving(true);
    try {
      const capabilities = buildCapabilitiesForSave();
      const state = buildStateForSave();
      const payload = {
        name: deviceName.trim(),
        device_type: deviceType,
        room_id: selectedRoom,
        protocol,
        endpoint: brokerAddress.trim() || undefined,
        capabilities,
        state,
      };

      if (isEditing && deviceId) {
        await artemisApi.updateDevice(deviceId, payload);
      } else {
        await artemisApi.createDevice(payload);
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save the device configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this device? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!isEditing || !deviceId) return;
          setIsDeleting(true);
          try {
            await artemisApi.deleteDevice(deviceId);
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Failed to delete the device');
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  const typeChangedWhileEditing = isEditing && savedType !== null && deviceType !== savedType;

  const setCap = (patch: Record<string, unknown>) => {
    setCapOverrides((prev) => ({ ...(prev ?? {}), ...patch }));
  };

  const brightnessMode = (() => {
    const merged = mergeCapabilitySpecs(deviceType, capOverrides ?? {});
    const b = merged.brightness;
    if (b === false) return 'off';
    if (b === true) return 'percentage';
    if (typeof b === 'object' && b !== null && (b as any).mode === 'steps') return 'steps';
    return 'percentage';
  })();

  const brightnessSteps = (() => {
    const merged = mergeCapabilitySpecs(deviceType, capOverrides ?? {});
    const b = merged.brightness;
    if (typeof b === 'object' && b !== null && (b as any).mode === 'steps') return String((b as any).count ?? 3);
    return '3';
  })();

  const brightnessLabels = (() => {
    const merged = mergeCapabilitySpecs(deviceType, capOverrides ?? {});
    const b = merged.brightness;
    if (typeof b === 'object' && b !== null && Array.isArray((b as any).labels)) return ((b as any).labels as string[]).join(', ');
    return '';
  })();

  const rgbEnabled = (() => {
    const merged = mergeCapabilitySpecs(deviceType, capOverrides ?? {});
    return merged.rgb_color === true;
  })();

  const colorTempEnabled = (() => {
    const merged = mergeCapabilitySpecs(deviceType, capOverrides ?? {});
    return merged.color_temp === true || (typeof merged.color_temp === 'object' && merged.color_temp !== null);
  })();

  const fanSpeedMode = (() => {
    const merged = mergeCapabilitySpecs(deviceType, capOverrides ?? {});
    const s = merged.speed;
    if (s === false) return 'off';
    if (typeof s === 'object' && s !== null && (s as any).mode === 'percentage') return 'percentage';
    return 'steps';
  })();

  const fanSpeedSteps = (() => {
    const merged = mergeCapabilitySpecs(deviceType, capOverrides ?? {});
    const s = merged.speed;
    if (typeof s === 'object' && s !== null && (s as any).mode === 'steps') return String((s as any).count ?? 3);
    if (typeof merged.speed_steps === 'number') return String(merged.speed_steps);
    return '3';
  })();

  const fanSpeedLabels = (() => {
    const merged = mergeCapabilitySpecs(deviceType, capOverrides ?? {});
    const s = merged.speed;
    if (typeof s === 'object' && s !== null && Array.isArray((s as any).labels)) return ((s as any).labels as string[]).join(', ');
    return '';
  })();

  const climateTempSpec = (() => {
    const merged = mergeCapabilitySpecs(deviceType, capOverrides ?? {});
    const t = merged.temperature;
    if (typeof t === 'object' && t !== null) return t as Record<string, unknown>;
    return { min: 16, max: 30, step: 1 };
  })();
  const climateMin = String((climateTempSpec as any).min ?? 16);
  const climateMax = String((climateTempSpec as any).max ?? 30);
  const climateStep = String((climateTempSpec as any).step ?? 1);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'EDIT DEVICE' : 'ADD DEVICE'}</Text>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </View>

      {isLoadingDevice ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Ionicons name="finger-print-outline" size={20} color={Colors.primaryDim} />
              <Text style={styles.sectionHeading}>Identity</Text>
            </View>
            <View style={styles.identityCard}>
              <Text style={styles.fieldLabel}>DEVICE NAME</Text>
              <View style={styles.nameInputRow}>
                <MaterialIcons
                  name={ALL_DEVICE_TYPES.find((t) => t.id === deviceType)?.icon || 'device-unknown'}
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
                {ALL_DEVICE_TYPES.map((type) => {
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

              {typeChangedWhileEditing && (
                <Text style={styles.typeHint}>
                  Changing type will replace capability controls with defaults for the new type. Power state is kept.
                </Text>
              )}
            </View>
          </View>

          {/* ═══ Capabilities Section ═══ */}
          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Ionicons name="sparkles-outline" size={20} color={Colors.primaryDim} />
              <Text style={styles.sectionHeading}>Capabilities</Text>
            </View>
            <View style={styles.techCard}>
              {deviceType === 'light' && (
                <>
                  <Text style={styles.fieldLabel}>BRIGHTNESS</Text>
                  <View style={styles.inlinePillsRow}>
                    {(['percentage', 'steps', 'off'] as const).map((m) => {
                      const active = brightnessMode === m;
                      return (
                        <TouchableOpacity
                          key={m}
                          style={[styles.inlinePill, active && styles.inlinePillActive]}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (m === 'off') setCap({ brightness: false });
                            else if (m === 'percentage') setCap({ brightness: { mode: 'percentage', min: 0, max: 100 } });
                            else setCap({ brightness: { mode: 'steps', count: 3 } });
                          }}
                        >
                          <Text style={[styles.inlinePillText, active && styles.inlinePillTextActive]}>{m.toUpperCase()}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {brightnessMode === 'steps' && (
                    <>
                      <Text style={styles.fieldLabel}>STEPS</Text>
                      <TextInput
                        style={styles.monoInput}
                        value={brightnessSteps}
                        keyboardType="number-pad"
                        onChangeText={(txt) => {
                          const n = Math.max(2, Math.min(12, Number(txt) || 3));
                          setCap({ brightness: { mode: 'steps', count: n, labels: brightnessLabels ? brightnessLabels.split(',').map((x) => x.trim()).filter(Boolean) : undefined } });
                        }}
                      />
                      <Text style={styles.fieldLabel}>STEP LABELS (Optional)</Text>
                      <TextInput
                        style={styles.monoInput}
                        value={brightnessLabels}
                        onChangeText={(txt) => {
                          const labels = txt.split(',').map((x) => x.trim()).filter(Boolean);
                          const n = Math.max(2, Math.min(12, Number(brightnessSteps) || 3));
                          setCap({ brightness: { mode: 'steps', count: n, labels: labels.length ? labels : undefined } });
                        }}
                        placeholderTextColor="rgba(173,170,173,0.5)"
                        placeholder="Low, Med, High"
                      />
                    </>
                  )}

                  <Text style={styles.fieldLabel}>RGB COLOR</Text>
                  <View style={styles.inlinePillsRow}>
                    {(['on', 'off'] as const).map((v) => {
                      const active = (v === 'on') === rgbEnabled;
                      return (
                        <TouchableOpacity
                          key={v}
                          style={[styles.inlinePill, active && styles.inlinePillActive]}
                          activeOpacity={0.7}
                          onPress={() => setCap({ rgb_color: v === 'on' })}
                        >
                          <Text style={[styles.inlinePillText, active && styles.inlinePillTextActive]}>{v.toUpperCase()}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.fieldLabel}>COLOR TEMPERATURE</Text>
                  <View style={styles.inlinePillsRow}>
                    {(['on', 'off'] as const).map((v) => {
                      const active = (v === 'on') === colorTempEnabled;
                      return (
                        <TouchableOpacity
                          key={v}
                          style={[styles.inlinePill, active && styles.inlinePillActive]}
                          activeOpacity={0.7}
                          onPress={() => setCap({ color_temp: v === 'on' })}
                        >
                          <Text style={[styles.inlinePillText, active && styles.inlinePillTextActive]}>{v.toUpperCase()}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {deviceType === 'fan' && (
                <>
                  <Text style={styles.fieldLabel}>SPEED</Text>
                  <View style={styles.inlinePillsRow}>
                    {(['steps', 'percentage', 'off'] as const).map((m) => {
                      const active = fanSpeedMode === m;
                      return (
                        <TouchableOpacity
                          key={m}
                          style={[styles.inlinePill, active && styles.inlinePillActive]}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (m === 'off') setCap({ speed: false });
                            else if (m === 'percentage') setCap({ speed: { mode: 'percentage', min: 0, max: 100 } });
                            else setCap({ speed: { mode: 'steps', count: 3 } });
                          }}
                        >
                          <Text style={[styles.inlinePillText, active && styles.inlinePillTextActive]}>{m.toUpperCase()}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {fanSpeedMode === 'steps' && (
                    <>
                      <Text style={styles.fieldLabel}>STEPS</Text>
                      <TextInput
                        style={styles.monoInput}
                        value={fanSpeedSteps}
                        keyboardType="number-pad"
                        onChangeText={(txt) => {
                          const n = Math.max(2, Math.min(12, Number(txt) || 3));
                          setCap({ speed: { mode: 'steps', count: n, labels: fanSpeedLabels ? fanSpeedLabels.split(',').map((x) => x.trim()).filter(Boolean) : undefined } });
                        }}
                      />
                      <Text style={styles.fieldLabel}>STEP LABELS (Optional)</Text>
                      <TextInput
                        style={styles.monoInput}
                        value={fanSpeedLabels}
                        onChangeText={(txt) => {
                          const labels = txt.split(',').map((x) => x.trim()).filter(Boolean);
                          const n = Math.max(2, Math.min(12, Number(fanSpeedSteps) || 3));
                          setCap({ speed: { mode: 'steps', count: n, labels: labels.length ? labels : undefined } });
                        }}
                        placeholderTextColor="rgba(173,170,173,0.5)"
                        placeholder="Low, Med, High"
                      />
                    </>
                  )}
                </>
              )}

              {deviceType === 'media' && (
                <>
                  <Text style={styles.fieldLabel}>VOLUME</Text>
                  <View style={styles.inlinePillsRow}>
                    {(['on', 'off'] as const).map((v) => {
                      const merged = mergeCapabilitySpecs(deviceType, capOverrides ?? {});
                      const enabled = merged.volume !== false && merged.volume != null;
                      const active = (v === 'on') === enabled;
                      return (
                        <TouchableOpacity
                          key={v}
                          style={[styles.inlinePill, active && styles.inlinePillActive]}
                          activeOpacity={0.7}
                          onPress={() => setCap({ volume: v === 'on' ? { mode: 'percentage', min: 0, max: 100 } : false })}
                        >
                          <Text style={[styles.inlinePillText, active && styles.inlinePillTextActive]}>{v.toUpperCase()}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {deviceType === 'climate' && (
                <>
                  <Text style={styles.fieldLabel}>TEMPERATURE</Text>
                  <Text style={styles.typeHint}>
                    Climate devices always expose a temperature setpoint. Adjust the allowed range below.
                  </Text>

                  <Text style={styles.fieldLabel}>MIN (°C)</Text>
                  <TextInput
                    style={styles.monoInput}
                    value={climateMin}
                    keyboardType="number-pad"
                    onChangeText={(txt) => {
                      const min = Number(txt);
                      const max = Number(climateMax);
                      const step = Number(climateStep);
                      const safeMin = Number.isFinite(min) ? min : 16;
                      const safeMax = Number.isFinite(max) ? max : 30;
                      const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
                      setCap({ temperature: { min: Math.min(safeMin, safeMax - safeStep), max: safeMax, step: safeStep } });
                    }}
                  />

                  <Text style={styles.fieldLabel}>MAX (°C)</Text>
                  <TextInput
                    style={styles.monoInput}
                    value={climateMax}
                    keyboardType="number-pad"
                    onChangeText={(txt) => {
                      const min = Number(climateMin);
                      const max = Number(txt);
                      const step = Number(climateStep);
                      const safeMin = Number.isFinite(min) ? min : 16;
                      const safeMax = Number.isFinite(max) ? max : 30;
                      const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
                      setCap({ temperature: { min: safeMin, max: Math.max(safeMax, safeMin + safeStep), step: safeStep } });
                    }}
                  />

                  <Text style={styles.fieldLabel}>STEP (°C)</Text>
                  <TextInput
                    style={styles.monoInput}
                    value={climateStep}
                    keyboardType="number-pad"
                    onChangeText={(txt) => {
                      const min = Number(climateMin);
                      const max = Number(climateMax);
                      const step = Number(txt);
                      const safeMin = Number.isFinite(min) ? min : 16;
                      const safeMax = Number.isFinite(max) ? max : 30;
                      const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
                      setCap({ temperature: { min: safeMin, max: Math.max(safeMax, safeMin + safeStep), step: safeStep } });
                    }}
                  />
                </>
              )}

              {(deviceType === 'sensor' || deviceType === 'security' || deviceType === 'switch' || deviceType === 'other') && (
                <Text style={styles.typeHint}>
                  This device type uses default capability behavior. (You can still change the type above.)
                </Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Ionicons name="location-outline" size={20} color={Colors.primaryDim} />
              <Text style={styles.sectionHeading}>Location</Text>
            </View>
            <View style={styles.roomGrid}>
              {isLoadingRooms ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                rooms.map((room) => {
                  const isSelected = selectedRoom === room.id;
                  return (
                    <TouchableOpacity
                      key={room.id}
                      style={[styles.roomCard, isSelected && styles.roomCardSelected]}
                      activeOpacity={0.7}
                      onPress={() => setSelectedRoom(room.id)}
                    >
                      <Ionicons
                        name="tv-outline"
                        size={24}
                        color={isSelected ? Colors.primary : Colors.onSurfaceVariant}
                      />
                      <Text style={[styles.roomLabel, isSelected && styles.roomLabelSelected]}>{room.name.toUpperCase()}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
              <TouchableOpacity style={styles.newRoomCard} activeOpacity={0.7} onPress={() => navigation.navigate('ManageRooms')}>
                <Ionicons name="add" size={24} color={Colors.onSurfaceVariant} />
                <Text style={styles.roomLabel}>NEW ROOM</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Ionicons name="code-slash-outline" size={20} color={Colors.primaryDim} />
              <Text style={styles.sectionHeading}>Configuration</Text>
            </View>

            <View style={[styles.techCard, { opacity: 0.6 }]} pointerEvents="none">
              <Text style={styles.fieldLabel}>PROTOCOL (Managed via Hardware Bridge)</Text>
              <View style={styles.protocolRow}>
                <TouchableOpacity
                  style={[styles.protocolPill, protocol === 'mqtt' && styles.protocolPillActive]}
                  onPress={() => setProtocol('mqtt')}
                  activeOpacity={0.7}
                  disabled={true}
                >
                  {protocol === 'mqtt' && <View style={styles.protocolDot} />}
                  <Text style={[styles.protocolText, protocol === 'mqtt' && styles.protocolTextActive]}>MQTT</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.protocolPill, protocol === 'http' && styles.protocolPillActive]}
                  onPress={() => setProtocol('http')}
                  activeOpacity={0.7}
                  disabled={true}
                >
                  {protocol === 'http' && <View style={styles.protocolDot} />}
                  <Text style={[styles.protocolText, protocol === 'http' && styles.protocolTextActive]}>HTTP REST</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.techDivider} />

              <Text style={styles.fieldLabel}>BROKER / ENDPOINT</Text>
              <TextInput
                style={styles.monoInput}
                value={brokerAddress}
                onChangeText={setBrokerAddress}
                placeholderTextColor="rgba(173,170,173,0.5)"
                placeholder="http://..."
                editable={false}
              />

              <Text style={styles.fieldLabel}>TOPIC (Optional)</Text>
              <TextInput
                style={[styles.monoInput, { color: Colors.secondaryFixed }]}
                value={topic}
                onChangeText={setTopic}
                editable={false}
              />
            </View>
          </View>

          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8} onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color={Colors.onPrimary} />
              ) : (
                <>
                  <Ionicons name="save" size={20} color={Colors.onSurface} />
                  <Text style={styles.saveBtnText}>SAVE CONFIGURATION</Text>
                </>
              )}
            </TouchableOpacity>

            {isEditing && (
              <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.8} onPress={handleDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <ActivityIndicator color={Colors.error} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    <Text style={styles.deleteBtnText}>DELETE DEVICE</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
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
  identityCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
    padding: Spacing['2xl'],
  },
  typeHint: {
    marginTop: Spacing.md,
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
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
  techCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
    padding: Spacing['2xl'],
    gap: Spacing.lg,
  },
  inlinePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  inlinePill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.3)',
    backgroundColor: Colors.surfaceContainerLow,
  },
  inlinePillActive: {
    backgroundColor: 'rgba(116, 177, 255, 0.15)',
    borderColor: Colors.primary,
  },
  inlinePillText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.2,
  },
  inlinePillTextActive: {
    color: Colors.primary,
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
