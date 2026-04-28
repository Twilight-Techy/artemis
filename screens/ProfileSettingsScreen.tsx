import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { artemisApi } from '../api/artemisClient';

export default function ProfileSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [isLoading, setIsLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await artemisApi.getMe();
      setDisplayName(data.display_name || data.username || '');
      setEmail(data.email || '');
    } catch (e) {
      console.warn("Failed to load profile", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await artemisApi.updateMe({ display_name: displayName, email });
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PERSONAL INFO</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarSection}>
          <LinearGradient
            colors={[Colors.primary, Colors.secondary]}
            style={styles.avatarGlow}
          >
            <View style={styles.avatarInner}>
              <Ionicons name="person" size={48} color={Colors.surfaceContainer} />
            </View>
          </LinearGradient>
          <TouchableOpacity style={styles.editAvatarBtn}>
            <Text style={styles.editAvatarText}>CHANGE AVATAR</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
           <ActivityIndicator size="large" color={Colors.primary} />
        ) : (
          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
            <TextInput
              style={styles.textInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
          </View>
        )}

        <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8} onPress={handleSave} disabled={isSaving || isLoading}>
          <Text style={styles.saveBtnText}>{isSaving ? 'SAVING...' : 'UPDATE PROFILE'}</Text>
        </TouchableOpacity>
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
  scrollContent: { paddingHorizontal: Spacing['2xl'], paddingTop: Spacing['2xl'] },
  avatarSection: { alignItems: 'center', marginBottom: Spacing['4xl'] },
  avatarGlow: {
    width: 120, height: 120, borderRadius: 60, padding: 3, justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  avatarInner: {
    flex: 1, width: '100%', backgroundColor: Colors.onSurface, borderRadius: 60,
    justifyContent: 'center', alignItems: 'center',
  },
  editAvatarBtn: { marginTop: Spacing.xl, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl, borderRadius: Radii.full, backgroundColor: 'rgba(255,255,255,0.05)' },
  editAvatarText: { fontFamily: Typography.families.label, fontSize: Typography.sizes.labelSm, fontWeight: Typography.weights.bold, color: Colors.primary },
  formSection: { marginBottom: Spacing['4xl'] },
  fieldLabel: {
    fontFamily: Typography.families.label, fontSize: Typography.sizes.labelSm, fontWeight: Typography.weights.bold,
    color: Colors.onSurfaceVariant, letterSpacing: 2, marginBottom: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radii.lg, padding: Spacing.xl,
    fontFamily: Typography.families.body, fontSize: Typography.sizes.bodyLg, color: Colors.onSurface,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radii.full, paddingVertical: Spacing.lg,
    alignItems: 'center', shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 20, elevation: 6,
  },
  saveBtnText: {
    fontFamily: Typography.families.headline, fontSize: Typography.sizes.labelMd, fontWeight: Typography.weights.bold,
    color: Colors.onPrimary, letterSpacing: 2,
  },
});
