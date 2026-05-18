import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const PERSONAS = [
  { id: '1', title: 'Artemis', subtitle: 'Balanced & Professional', color: Colors.primary, icon: 'planet' },
  { id: '2', title: 'Apollo', subtitle: 'Detailed & Analytical', color: Colors.tertiary, icon: 'analytics' },
  { id: '3', title: 'Ares', subtitle: 'Quick & Direct', color: Colors.error, icon: 'flash' },
];

export default function PersonaSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [active, setActive] = useState('1');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI PERSONA</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headline}>Select AI Intelligence</Text>
        <Text style={styles.subtitle}>Choose how your smart home hub communicates and responds.</Text>
        
        <View style={styles.themeList}>
          {PERSONAS.map(persona => (
            <TouchableOpacity 
              key={persona.id} 
              style={[styles.themeCard, active === persona.id && { borderColor: persona.color, backgroundColor: 'rgba(255,255,255,0.05)' }]}
              onPress={() => setActive(persona.id)}
              activeOpacity={0.8}
            >
              <View style={styles.themeLeft}>
                <LinearGradient
                   colors={[persona.color, Colors.surfaceContainerHighest]}
                   style={styles.iconGlow}
                >
                  <View style={styles.iconInner}>
                    <Ionicons name={persona.icon as any} size={20} color={persona.color} />
                  </View>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.themeTitle}>{persona.title}</Text>
                  <Text style={styles.themeDesc}>{persona.subtitle}</Text>
                </View>
              </View>
              {active === persona.id && <Ionicons name="checkmark-circle" size={24} color={persona.color} />}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.saveBtnText}>CONFIRM PERSONA</Text>
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
  scrollContent: { paddingHorizontal: Spacing['2xl'], paddingTop: Spacing.xl },
  headline: {
    fontFamily: Typography.families.headline, fontSize: Typography.sizes.displaySm,
    fontWeight: Typography.weights.bold, color: Colors.onSurface, marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Typography.families.body, fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurfaceVariant, marginBottom: Spacing['3xl'],
  },
  themeList: { gap: Spacing.xl, marginBottom: Spacing['4xl'] },
  themeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing['2xl'], backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  themeLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl, flex: 1 },
  iconGlow: { width: 48, height: 48, borderRadius: 24, padding: 2 },
  iconInner: { flex: 1, backgroundColor: Colors.surfaceContainerLow, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  themeTitle: { fontFamily: Typography.families.headline, fontSize: Typography.sizes.titleMd, fontWeight: Typography.weights.bold, color: Colors.onSurface },
  themeDesc: { fontFamily: Typography.families.body, fontSize: Typography.sizes.bodySm, color: Colors.onSurfaceVariant, marginTop: 4 },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radii.full, paddingVertical: Spacing.lg,
    alignItems: 'center', shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 20, elevation: 6,
  },
  saveBtnText: {
    fontFamily: Typography.families.headline, fontSize: Typography.sizes.labelMd, fontWeight: Typography.weights.bold,
    color: Colors.onPrimary, letterSpacing: 2,
  },
});
