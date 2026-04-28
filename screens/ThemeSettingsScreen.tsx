import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const THEMES = [
  { id: '1', title: 'Deep Obsidian', desc: 'The Luminous Void (Default)', color: Colors.primary },
  { id: '2', title: 'Neon Pulse', desc: 'High Contrast Cyber', color: Colors.tertiary },
  { id: '3', title: 'Crystal Glass', desc: 'Light & Refractive', color: Colors.onSurface },
];

export default function ThemeSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [active, setActive] = useState('1');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>INTERFACE THEME</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headline}>Select Your Aesthetic</Text>
        <Text style={styles.subtitle}>Modify the primary ambiance of the Artemis interface.</Text>
        
        <View style={styles.themeList}>
          {THEMES.map(theme => (
            <TouchableOpacity 
              key={theme.id} 
              style={[styles.themeCard, active === theme.id && styles.themeCardActive]}
              onPress={() => setActive(theme.id)}
              activeOpacity={0.8}
            >
              <View style={styles.themeLeft}>
                <View style={[styles.colorPreview, { backgroundColor: theme.color }]} />
                <View>
                  <Text style={styles.themeTitle}>{theme.title}</Text>
                  <Text style={styles.themeDesc}>{theme.desc}</Text>
                </View>
              </View>
              {active === theme.id && <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />}
            </TouchableOpacity>
          ))}
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
  scrollContent: { paddingHorizontal: Spacing['2xl'], paddingTop: Spacing.xl },
  headline: {
    fontFamily: Typography.families.headline, fontSize: Typography.sizes.displaySm,
    fontWeight: Typography.weights.bold, color: Colors.onSurface, marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Typography.families.body, fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurfaceVariant, marginBottom: Spacing['3xl'],
  },
  themeList: { gap: Spacing.xl },
  themeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing['2xl'], backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  themeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(116, 177, 255, 0.05)',
  },
  themeLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl },
  colorPreview: { width: 40, height: 40, borderRadius: 20 },
  themeTitle: { fontFamily: Typography.families.headline, fontSize: Typography.sizes.titleMd, fontWeight: Typography.weights.bold, color: Colors.onSurface },
  themeDesc: { fontFamily: Typography.families.body, fontSize: Typography.sizes.bodySm, color: Colors.onSurfaceVariant, marginTop: 4 },
});
