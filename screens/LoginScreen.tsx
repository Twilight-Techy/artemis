import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { artemisApi } from '../api/artemisClient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await artemisApi.login({ email, password });
      if (data.access_token) {
        await login(data.access_token);
      }
    } catch (error) {
      Alert.alert('Login Failed', 'Invalid credentials or server error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.content}>
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

        <TouchableOpacity style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerText}>UNREGISTERED? INITIALIZE NEW ID</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing['2xl'] },
  content: { flex: 1, justifyContent: 'center' },
  headerBox: { alignItems: 'center', marginBottom: Spacing['4xl'] },
  orb: { width: 90, height: 90, borderRadius: 45, padding: 3, marginBottom: Spacing.xl },
  orbInner: { flex: 1, backgroundColor: Colors.background, borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: Typography.families.headline, fontSize: Typography.sizes.displaySm, fontWeight: Typography.weights.bold, color: Colors.onSurface, letterSpacing: 8 },
  subtitle: { fontFamily: Typography.families.label, fontSize: Typography.sizes.labelSm, color: Colors.primary, letterSpacing: 4, marginTop: 4 },
  formContainer: { marginBottom: Spacing['3xl'] },
  fieldLabel: { fontFamily: Typography.families.label, fontSize: Typography.sizes.labelSm, fontWeight: Typography.weights.bold, color: Colors.onSurfaceVariant, letterSpacing: 2, marginBottom: Spacing.sm },
  textInput: { backgroundColor: Colors.surfaceContainerLow, borderRadius: Radii.lg, padding: Spacing.xl, fontFamily: Typography.families.body, fontSize: Typography.sizes.bodyLg, color: Colors.onSurface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  loginBtn: { backgroundColor: Colors.primary, borderRadius: Radii.full, paddingVertical: Spacing.lg, alignItems: 'center', shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 20, elevation: 6 },
  loginBtnText: { fontFamily: Typography.families.headline, fontSize: Typography.sizes.labelMd, fontWeight: Typography.weights.bold, color: Colors.onPrimary, letterSpacing: 2 },
  registerLink: { marginTop: Spacing['2xl'], alignItems: 'center' },
  registerText: { fontFamily: Typography.families.label, fontSize: Typography.sizes.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 2 }
});
