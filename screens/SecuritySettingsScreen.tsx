import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../contexts/AuthContext';

export default function SecuritySettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { token } = useAuth();
  const [fingerprintEnabled, setFingerprintEnabled] = useState(false);

  React.useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    const savedToken = await SecureStore.getItemAsync('biometric_token');
    setFingerprintEnabled(!!savedToken);
  };

  const toggleFingerprint = async (value: boolean) => {
    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // Here you would normally show a modal if no biometrics are set up
        console.warn("Biometrics not available or not enrolled");
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable Fingerprint Lock',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: true,
      });

      if (result.success && token) {
        await SecureStore.setItemAsync('biometric_token', token);
        setFingerprintEnabled(true);
      }
    } else {
      await SecureStore.deleteItemAsync('biometric_token');
      setFingerprintEnabled(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SECURITY</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconHeader}>
          <Ionicons name="finger-print" size={64} color={Colors.primary} />
          <Text style={styles.headline}>Biometric Lock</Text>
          <Text style={styles.subtitle}>Protect local access to your smart home controls.</Text>
        </View>

        <View style={styles.settingsGroup}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>Require Fingerprint</Text>
              <Text style={styles.rowDesc}>Unlock Artemis upon opening</Text>
            </View>
            <Switch
              value={fingerprintEnabled} onValueChange={toggleFingerprint}
              trackColor={{ false: Colors.surfaceContainerHighest, true: Colors.primary }}
              thumbColor={Colors.onSurface}
            />
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={[styles.row, { paddingVertical: Spacing.xl }]}>
            <Text style={[styles.rowTitle, { color: Colors.error }]}>Reset Security Credentials</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.lg,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    fontFamily: Typography.families.headline, fontSize: Typography.sizes.titleLg,
    fontWeight: Typography.weights.bold, color: Colors.onSurface, letterSpacing: 4,
  },
  scrollContent: { paddingHorizontal: Spacing['2xl'], paddingTop: Spacing['3xl'] },
  iconHeader: { alignItems: 'center', marginBottom: Spacing['4xl'] },
  headline: {
    fontFamily: Typography.families.headline, fontSize: Typography.sizes.displaySm,
    fontWeight: Typography.weights.bold, color: Colors.onSurface, marginTop: Spacing.xl, marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Typography.families.body, fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurfaceVariant, textAlign: 'center',
  },
  settingsGroup: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radii.xl, paddingHorizontal: Spacing['2xl'],
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing['2xl'] },
  rowTitle: { fontFamily: Typography.families.headline, fontSize: Typography.sizes.bodyLg, fontWeight: Typography.weights.medium, color: Colors.onSurface, marginBottom: 4 },
  rowDesc: { fontFamily: Typography.families.body, fontSize: Typography.sizes.bodySm, color: Colors.onSurfaceVariant },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' }
});
