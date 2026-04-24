import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';

export default function AALEditorScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [engine, setEngine] = useState<'AAL' | 'PYTHON'>('AAL');
  const [logicAAL, setLogicAAL] = useState('WHEN \nIF \nTHEN ');
  const [logicPython, setLogicPython] = useState('def evaluate(sensor_data):\n    # Write advanced automation script here\n    pass');
  const [requireApproval, setRequireApproval] = useState(true);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        
        {/* ═══ Header ═══ */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Automation</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ═══ Identity ═══ */}
          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Ionicons name="flash-outline" size={20} color={Colors.primaryDim} />
              <Text style={styles.sectionHeading}>Identity</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>AUTOMATION NAME</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Smart Thermal Optima"
                placeholderTextColor="rgba(173,170,173,0.5)"
              />

              <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>DESCRIPTION</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="What does this automation achieve?"
                placeholderTextColor="rgba(173,170,173,0.5)"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ═══ Execution Engine ═══ */}
          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Ionicons name="hardware-chip-outline" size={20} color={Colors.primaryDim} />
              <Text style={styles.sectionHeading}>Execution Engine</Text>
            </View>
            <View style={styles.engineToggleRow}>
              <TouchableOpacity
                style={[styles.enginePill, engine === 'AAL' && styles.enginePillActiveAAL]}
                onPress={() => setEngine('AAL')}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={16} color={engine === 'AAL' ? Colors.primary : Colors.onSurfaceVariant} />
                <Text style={[styles.enginePillText, engine === 'AAL' && styles.enginePillTextActiveAAL]}>AAL Logic</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.enginePill, engine === 'PYTHON' && styles.enginePillActivePython]}
                onPress={() => setEngine('PYTHON')}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="language-python" size={16} color={engine === 'PYTHON' ? Colors.secondary : Colors.onSurfaceVariant} />
                <Text style={[styles.enginePillText, engine === 'PYTHON' && styles.enginePillTextActivePython]}>Python Sandbox</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              {engine === 'AAL' ? (
                <>
                  <Text style={styles.fieldLabel}>ARTEMIS AUTOMATION LANGUAGE</Text>
                  <Text style={styles.contextHint}>Write rules in natural English (WHEN / IF / THEN / ELSE).</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea, styles.codeArea]}
                    value={logicAAL}
                    onChangeText={setLogicAAL}
                    multiline
                    autoCapitalize="sentences"
                    textAlignVertical="top"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>PYTHON SCRIPT</Text>
                  <Text style={styles.contextHint}>Sandboxed environment. Use mcp.requestAction() for execution.</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea, styles.codeArea, styles.pythonCodeArea]}
                    value={logicPython}
                    onChangeText={setLogicPython}
                    multiline
                    autoCapitalize="none"
                    autoCorrect={false}
                    textAlignVertical="top"
                  />
                </>
              )}
            </View>
          </View>

          {/* ═══ Security & Permissions ═══ */}
          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primaryDim} />
              <Text style={styles.sectionHeading}>Semantics & Permissions</Text>
            </View>
            <View style={[styles.card, styles.rowCard]}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>Require User Approval</Text>
                <Text style={styles.rowDescription}>
                  Generate a suggestion card instead of silently executing.
                </Text>
              </View>
              <Switch
                trackColor={{ false: Colors.surfaceContainerHighest, true: Colors.primary }}
                thumbColor={Colors.onSurface}
                ios_backgroundColor={Colors.surfaceContainerHighest}
                onValueChange={setRequireApproval}
                value={requireApproval}
              />
            </View>
          </View>

          {/* ═══ Actions ═══ */}
          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8} onPress={() => navigation.goBack()}>
              <Ionicons name="save-outline" size={20} color={Colors.onPrimary} />
              <Text style={styles.saveBtnText}>SAVE AUTOMATION</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerHighest,
  },
  headerTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.titleLg,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  actionsSection: {
    marginTop: Spacing.sm,
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
  scrollContent: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['5xl'],
    paddingHorizontal: Spacing['2xl'],
  },
  section: {
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
    fontSize: Typography.sizes.titleMd,
    fontWeight: Typography.weights.semibold,
    color: Colors.onSurface,
  },
  card: {
    backgroundColor: 'rgba(38, 37, 41, 0.4)', // surfaceContainerLow equivalent
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  fieldLabel: {
    fontFamily: Typography.families.label,
    fontSize: 10,
    fontWeight: Typography.weights.black,
    color: Colors.onSurfaceVariant,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  textInput: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  textArea: {
    minHeight: 100,
  },
  contextHint: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    color: Colors.onSurfaceVariant,
    opacity: 0.8,
    marginBottom: Spacing.md,
  },
  codeArea: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.bodyLg,
    lineHeight: 28,
  },
  pythonCodeArea: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#00e3fd', // Executor hue
  },
  engineToggleRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  enginePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  enginePillActiveAAL: {
    backgroundColor: 'rgba(116, 177, 255, 0.15)',
    borderColor: Colors.primary,
  },
  enginePillActivePython: {
    backgroundColor: 'rgba(184, 132, 255, 0.15)',
    borderColor: Colors.secondary,
  },
  enginePillText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelLg,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurfaceVariant,
  },
  enginePillTextActiveAAL: {
    color: Colors.primary,
  },
  enginePillTextActivePython: {
    color: Colors.secondary,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowInfo: {
    flex: 1,
    paddingRight: Spacing.lg,
  },
  rowTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.bodyLg,
    fontWeight: Typography.weights.medium,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  rowDescription: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
});
