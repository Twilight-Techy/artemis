import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import { artemisApi } from '../api/artemisClient';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width } = Dimensions.get('window');

const PROTOCOL_CHIPS = ['ZIGBEE', 'MATTER', 'WIFI'];

export default function AddDeviceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [manualAddress, setManualAddress] = useState('');
  
  const [isScanning, setIsScanning] = useState(true);
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);

  useEffect(() => {
    const runScan = async () => {
      try {
        setIsScanning(true);
        const results = await artemisApi.discoverDevices();
        setDiscoveredDevices(results);
      } catch (e) {
        console.warn("Scan failed", e);
      } finally {
        setIsScanning(false);
      }
    };
    runScan();
  }, []);

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
        <Text style={styles.headerTitle}>ADD DEVICE</Text>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ Scanning Radar Visual ═══ */}
        <View style={styles.radarContainer}>
          {/* Outer ring */}
          <View style={[styles.radarRing, styles.radarRingOuter]} />
          {/* Middle ring */}
          <View style={[styles.radarRing, styles.radarRingMid]} />
          {/* Inner ring */}
          <View style={[styles.radarRing, styles.radarRingInner]} />
          {/* Core orb */}
          <View style={styles.radarCore}>
            <Ionicons name="radio-outline" size={32} color={Colors.background} />
          </View>
        </View>

        {/* ═══ Scanning Label ═══ */}
        <Text style={styles.scanTitle}>Scanning Network</Text>
        <Text style={styles.scanDescription}>
          Looking for compatible hardware protocols. Ensure your devices are powered on and in pairing mode.
        </Text>

        {/* ═══ Protocol Chips ═══ */}
        <View style={styles.chipRow}>
          {PROTOCOL_CHIPS.map((chip) => (
            <View key={chip} style={styles.chip}>
              <Text style={styles.chipText}>{chip}</Text>
            </View>
          ))}
        </View>

        {/* ═══ Discovered Devices ═══ */}
        <Text style={styles.sectionTitle}>Discovered</Text>
        <View style={styles.discoveredList}>
          {isScanning ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: Spacing['2xl'] }} />
          ) : discoveredDevices.length === 0 ? (
            <Text style={{ textAlign: 'center', color: Colors.onSurfaceVariant, marginVertical: Spacing.xl }}>
              No new devices found.
            </Text>
          ) : discoveredDevices.map((device) => {
            const getIcon = (type: string) => {
              if (type === 'light') return 'bulb-outline';
              if (type === 'climate') return 'thermometer-outline';
              return 'hardware-chip-outline';
            };

            return (
              <View key={device.id} style={styles.discoveredCard}>
                {/* Left accent bar */}
                <View style={styles.cardAccentBar} />
                <View style={styles.cardContent}>
                  <View style={styles.cardLeft}>
                    <View style={styles.cardIconCircle}>
                      <Ionicons name={getIcon(device.device_type)} size={22} color={Colors.primary} />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{device.name}</Text>
                      <Text style={styles.cardProtocol}>{device.protocol.toUpperCase()} - {device.endpoint}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.connectBtn} 
                    activeOpacity={0.8}
                    onPress={() => {
                      navigation.navigate('EditDevice', {
                        deviceName: device.name,
                        deviceType: device.device_type,
                        // Could also pass protocol and endpoint if EditDeviceScreen expects them via params, 
                        // but right now EditDevice acts as a "Create from scratch" or "Edit".
                        // By passing name/type, we pre-fill the form!
                      } as never);
                    }}
                  >
                    <Text style={styles.connectBtnText}>CONNECT</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* ═══ Manual Setup ═══ */}
        <View style={styles.manualSection}>
          <View style={styles.manualHeader}>
            <Ionicons name="options-outline" size={24} color={Colors.secondary} />
            <Text style={styles.manualTitle}>Manual Setup</Text>
          </View>
          <Text style={styles.manualDescription}>
            Can't find your device? Enter the IP address or pairing code manually to bypass the auto-discovery process.
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.manualInput}
              placeholder="IP Address or Pairing Code"
              placeholderTextColor="rgba(173, 170, 173, 0.5)"
              value={manualAddress}
              onChangeText={setManualAddress}
            />
            <Ionicons
              name="keypad-outline"
              size={20}
              color="rgba(173, 170, 173, 0.5)"
              style={styles.inputIcon}
            />
          </View>
          <TouchableOpacity 
            style={styles.addManuallyBtn} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('EditDevice' as never)}
          >
            <Ionicons name="link-outline" size={18} color={Colors.onSurface} />
            <Text style={styles.addManuallyText}>ADD MANUALLY</Text>
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

  // ── Radar ──
  radarContainer: {
    width: 220,
    height: 220,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing['3xl'],
    marginBottom: Spacing['2xl'],
  },
  radarRing: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
  },
  radarRingOuter: {
    width: 220,
    height: 220,
    borderColor: 'rgba(129, 236, 255, 0.15)',
  },
  radarRingMid: {
    width: 160,
    height: 160,
    borderColor: 'rgba(129, 236, 255, 0.3)',
  },
  radarRingInner: {
    width: 100,
    height: 100,
    borderColor: 'rgba(129, 236, 255, 0.5)',
  },
  radarCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.tertiary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 8,
  },

  // ── Scanning Info ──
  scanTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.headlineMd,
    color: Colors.tertiary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  scanDescription: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: Spacing['3xl'],
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },

  // ── Protocol Chips ──
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing['3xl'],
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(129, 236, 255, 0.3)',
    backgroundColor: 'rgba(129, 236, 255, 0.05)',
  },
  chipText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: Colors.tertiary,
    letterSpacing: 1.5,
  },

  // ── Discovered ──
  sectionTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.headlineMd,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    paddingHorizontal: Spacing['2xl'],
    marginBottom: Spacing.lg,
  },
  discoveredList: {
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.lg,
    marginBottom: Spacing['3xl'],
  },
  discoveredCard: {
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  cardAccentBar: {
    width: 3,
    backgroundColor: Colors.primary,
    opacity: 0.5,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing['2xl'],
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    flex: 1,
  },
  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(116, 177, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(116, 177, 255, 0.2)',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.titleLg,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    marginBottom: 2,
  },
  cardProtocol: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    color: Colors.onSurfaceVariant,
  },
  connectBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.full,
    overflow: 'hidden',
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  connectBtnText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: Colors.onPrimary,
    letterSpacing: 1.5,
  },

  // ── Manual Setup ──
  manualSection: {
    marginHorizontal: Spacing['2xl'],
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.xl,
    padding: Spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.2)',
    gap: Spacing.lg,
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  manualTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.headlineMd,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
  },
  manualDescription: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  inputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  manualInput: {
    backgroundColor: Colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.3)',
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    color: Colors.onSurface,
  },
  inputIcon: {
    position: 'absolute',
    right: Spacing.lg,
  },
  addManuallyBtn: {
    backgroundColor: Colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.3)',
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  addManuallyText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelMd,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    letterSpacing: 1.5,
  },
});
