import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { artemisApi } from '../api/artemisClient';
import { useArtemisAlert } from '../components/ArtemisAlert';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const alert = useArtemisAlert();

  React.useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const token = await SecureStore.getItemAsync('biometric_token');
    if (token) {
      setHasBiometric(true);
    }
  };

  const handleBiometricLogin = async () => {
    const biometricToken = await SecureStore.getItemAsync('biometric_token');
    if (!biometricToken) return;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to log in',
      fallbackLabel: 'Use Password',
      disableDeviceFallback: true,
    });

    if (!result.success) return;

    setIsLoading(true);
    try {
      // Validate the stored token is still accepted by the server
      // before committing it to auth state (avoids 401 → auto-logout loop)
      const res = await fetch(
        `${require('../api/artemisClient').BACKEND_URL}/auth/me`,
        { headers: { Authorization: `Bearer ${biometricToken}` } }
      );

      if (res.status === 401) {
        // Token has expired on the server — clear stale biometric credential
        await SecureStore.deleteItemAsync('biometric_token');
        setHasBiometric(false);
        alert.show({
          title: 'Session Expired',
          message: 'Your saved session has expired. Please log in with your password to re-enable fingerprint login.',
          variant: 'warning',
        });
        return;
      }

      if (!res.ok) {
        alert.show({ title: 'Error', message: 'Could not verify session. Please try again.', variant: 'error' });
        return;
      }

      // Token is still valid — complete login
      await login(biometricToken);
    } catch (error) {
      alert.show({ title: 'Error', message: 'Failed to connect to server. Check your network connection.', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      alert.show({ title: 'Error', message: 'Please enter both email and password.', variant: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const data = await artemisApi.login({ email, password });
      if (data.access_token) {
        await login(data.access_token);
      }
    } catch (error) {
      alert.show({ title: 'Login Failed', message: 'Invalid credentials or server error.', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    {alert.alertNode}
    <KeyboardAvoidingView 
      style={[styles.root, { paddingTop: insets.top }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.contentContainer} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerBox}>
          <LinearGradient colors={[Colors.primary, Colors.secondary]} style={styles.orb}>
            <View style={styles.orbInner}>
              <Ionicons name="planet" size={40} color={Colors.primary} />
            </View>
          </LinearGradient>
          <Text style={styles.title}>ARTEMIS</Text>
          <Text style={styles.subtitle}>SECURE PORTAL</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.textInput}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="admin@artemis.local"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>PASSWORD</Text>
          <TextInput
            style={styles.textInput}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />
        </View>

        <TouchableOpacity 
          style={styles.loginBtn} 
          activeOpacity={0.8} 
          disabled={isLoading}
          onPress={handleLogin}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <Text style={styles.loginBtnText}>AUTHENTICATE</Text>
          )}
        </TouchableOpacity>

        {hasBiometric && (
          <TouchableOpacity 
            style={styles.biometricBtn} 
            activeOpacity={0.8} 
            disabled={isLoading}
            onPress={handleBiometricLogin}
          >
            <Ionicons name="finger-print" size={24} color={Colors.primary} />
            <Text style={styles.biometricBtnText}>LOG IN WITH FINGERPRINT</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerText}>UNREGISTERED? INITIALIZE NEW ID</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  contentContainer: { paddingHorizontal: Spacing['2xl'], flexGrow: 1, justifyContent: 'center' },
  headerBox: { alignItems: 'center', marginBottom: Spacing['4xl'] },
  orb: { width: 90, height: 90, borderRadius: 45, padding: 3, marginBottom: Spacing.xl },
  orbInner: { flex: 1, backgroundColor: Colors.background, borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: Typography.families.headline, fontSize: Typography.sizes.displaySm, fontWeight: Typography.weights.bold, color: Colors.onSurface, letterSpacing: 8 },
  subtitle: { fontFamily: Typography.families.label, fontSize: Typography.sizes.labelSm, color: Colors.primary, letterSpacing: 4, marginTop: 4 },
  formContainer: { marginBottom: Spacing['3xl'] },
  fieldLabel: { fontFamily: Typography.families.label, fontSize: Typography.sizes.labelSm, fontWeight: Typography.weights.bold, color: Colors.onSurfaceVariant, letterSpacing: 2, marginBottom: Spacing.sm },
  textInput: { backgroundColor: Colors.surfaceContainerLow, borderRadius: Radii.lg, padding: Spacing.xl, fontFamily: Typography.families.body, fontSize: Typography.sizes.bodyLg, color: Colors.onSurface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  loginBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelMd,
    fontWeight: Typography.weights.bold,
    color: Colors.onPrimary,
    letterSpacing: 2,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(116, 177, 255, 0.1)',
    borderRadius: Radii.full,
    paddingVertical: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(116, 177, 255, 0.3)',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  biometricBtnText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelMd,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    letterSpacing: 1,
  },
  registerLink: {
    marginTop: Spacing['2xl'],
    alignItems: 'center',
  },
  registerText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
  },
});
