import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import TopNavBar from '../components/TopNavBar';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function AutomationsScreen() {
  const insets = useSafeAreaInsets();
  const [aalInput, setAalInput] = useState('');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TopNavBar />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ═══ Header Section ═══ */}
        <View style={styles.headerSection}>
          <Text style={styles.headline}>Automations</Text>
          <Text style={styles.subtitle}>
            Define autonomous behavioral flows using AAL (Artemis Automation Language).
          </Text>
        </View>

        {/* ═══ AAL Input ═══ */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>CREATE AUTOMATION</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. WHEN temperature > 28°C IF someone is in the room THEN turn on the fan..."
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              value={aalInput}
              onChangeText={setAalInput}
              multiline
              textAlignVertical="top"
            />
            {aalInput.length > 0 && (
              <TouchableOpacity style={styles.submitButton}>
                <Ionicons name="sparkles" size={16} color={Colors.background} />
                <Text style={styles.submitButtonText}>Generate</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ═══ Active Rules ═══ */}
        <View style={styles.rulesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Protocols</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AALEditor')}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.codeLabButton}
              >
                <Ionicons name="terminal-outline" size={14} color={Colors.onPrimary} />
                <Text style={styles.codeLabText}>Code Lab</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Rule 1 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.tag, { backgroundColor: 'rgba(129, 236, 255, 0.15)', borderColor: 'rgba(129, 236, 255, 0.3)' }]}>
                <View style={[styles.tagDot, { backgroundColor: Colors.tertiary }]} />
                <Text style={[styles.tagText, { color: Colors.tertiary }]}>Climate Control</Text>
              </View>
              <TouchableOpacity>
                <MaterialCommunityIcons name="dots-vertical" size={24} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <View style={styles.aalBlock}>
              <Text style={styles.aalText}>
                <Text style={styles.aalKeyword}>WHEN </Text>temperature {'>'} 28°C{'\n'}
                <Text style={styles.aalKeyword}>IF </Text>someone is in the living room{'\n'}
                <Text style={styles.aalKeyword}>THEN </Text>turn on the AC to 22°C
              </Text>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.footerText}>Triggered 2h ago</Text>
              <View style={styles.activeStatus}>
                <Text style={styles.activeText}>Active</Text>
                <View style={styles.activeDot} />
              </View>
            </View>
          </View>

          {/* Rule 2 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.tag, { backgroundColor: 'rgba(255, 113, 108, 0.15)', borderColor: 'rgba(255, 113, 108, 0.3)' }]}>
                <View style={[styles.tagDot, { backgroundColor: Colors.error }]} />
                <Text style={[styles.tagText, { color: Colors.error }]}>Security Routine</Text>
              </View>
              <TouchableOpacity>
                <MaterialCommunityIcons name="dots-vertical" size={24} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <View style={styles.aalBlock}>
              <Text style={styles.aalText}>
                <Text style={styles.aalKeyword}>WHEN </Text>time == 23:00{'\n'}
                <Text style={styles.aalKeyword}>IF </Text>no motion detected for 30m{'\n'}
                <Text style={styles.aalKeyword}>THEN </Text>lock all doors and arm system
              </Text>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.footerText}>Runs daily</Text>
              <View style={styles.activeStatus}>
                <Text style={styles.activeText}>Active</Text>
                <View style={[styles.activeDot, { backgroundColor: Colors.error }]} />
              </View>
            </View>
          </View>

          {/* Rule 3 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.tag, { backgroundColor: 'rgba(184, 132, 255, 0.15)', borderColor: 'rgba(184, 132, 255, 0.3)' }]}>
                <View style={[styles.tagDot, { backgroundColor: Colors.secondary }]} />
                <Text style={[styles.tagText, { color: Colors.secondary }]}>Lighting</Text>
              </View>
              <TouchableOpacity>
                <MaterialCommunityIcons name="dots-vertical" size={24} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <View style={styles.aalBlock}>
              <Text style={styles.aalText}>
                <Text style={styles.aalKeyword}>WHEN </Text>movie mode activates{'\n'}
                <Text style={styles.aalKeyword}>IF </Text>time {'>'} sunset{'\n'}
                <Text style={styles.aalKeyword}>THEN </Text>dim lights to 10% and set warm glow
              </Text>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.footerText}>Triggered yesterday</Text>
              <View style={styles.activeStatus}>
                <Text style={[styles.activeText, { color: Colors.onSurfaceVariant }]}>Paused</Text>
                <View style={[styles.activeDot, { backgroundColor: Colors.onSurfaceVariant }]} />
              </View>
            </View>
          </View>

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
  scrollContent: {
    paddingBottom: Spacing['4xl'],
  },
  headerSection: {
    paddingHorizontal: Spacing['2xl'],
    marginBottom: Spacing.xl,
  },
  headline: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.displaySm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
    lineHeight: 24,
  },
  inputContainer: {
    paddingHorizontal: Spacing['2xl'],
    marginBottom: Spacing['2xl'],
  },
  inputLabel: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: Colors.tertiary,
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  inputWrapper: {
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
    minHeight: 120,
  },
  textInput: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurface,
    minHeight: 80,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: Colors.tertiary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    gap: Spacing.xs,
  },
  submitButtonText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelMd,
    fontWeight: Typography.weights.bold,
    color: Colors.background,
  },
  rulesSection: {
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.headlineSm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
  },
  codeLabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
  },
  codeLabText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: Colors.onPrimary,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.xl,
    padding: Spacing['xl'],
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    textTransform: 'uppercase',
  },
  aalBlock: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  aalText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    color: Colors.onSurfaceVariant,
    lineHeight: 24,
  },
  aalKeyword: {
    fontFamily: Typography.families.headline,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.medium,
    color: Colors.onSurfaceVariant,
  },
  activeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  activeText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: Colors.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.tertiary,
  },
});
