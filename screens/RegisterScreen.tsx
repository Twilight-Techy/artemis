import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { artemisApi } from '../api/artemisClient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert('Error', 'Please fill the required identifiers.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await artemisApi.register({ username, email, password, display_name: displayName });
      if (data.access_token) {
        await login(data.access_token);
      }
    } catch (error) {
      Alert.alert('Registration Failed', 'Could not establish new identity.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBox}>
          <Text style={styles.title}>INITIALIZE</Text>
          <Text style={styles.subtitle}>NEW ADMIN NODE</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.fieldLabel}>USERNAME</Text>
          <TextInput
            style={styles.textInput}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="sysadmin"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>DISPLAY NAME</Text>
          <TextInput
            style={styles.textInput}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Agent Zero"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.textInput}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="admin@artemis.local"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>MASTER PASSWORD</Text>
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
          onPress={handleRegister}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <Text style={styles.loginBtnText}>ESTABLISH CONNECTION</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.registerLink} onPress={() => navigation.goBack()}>
          <Text style={styles.registerText}>RETURN TO LOGIN</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  contentContainer: { paddingHorizontal: Spacing['2xl'], paddingTop: Spacing['4xl'] },
  headerBox: { marginBottom: Spacing['3xl'] },
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
