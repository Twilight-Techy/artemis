import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';

const REASONING_LINES = [
  { text: 'Analyzing environment telemetry...', highlight: null },
  {
    text: 'Threshold (24.0°C) exceeded by ',
    highlight: { text: '5.4°C', color: Colors.error },
  },
  {
    text: 'Cross-referencing power budget: ',
    highlight: { text: 'OPTIMAL', color: Colors.tertiary },
  },
  { text: 'Synthesizing Arduino control signal... _', highlight: null },
];

interface MCPActionModalProps {
  visible: boolean;
  onClose: () => void;
  onExecute: () => void;
}

export default function MCPActionModal({ visible, onClose, onExecute }: MCPActionModalProps) {
  const insets = useSafeAreaInsets();
  const [isTraceExpanded, setIsTraceExpanded] = useState(false);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBg}>
        <View style={[styles.root, { paddingBottom: insets.bottom }]}>
          {/* ═══ Drag Handle ═══ */}
          <View style={styles.handleSection}>
            <View style={styles.dragHandle} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* ═══ Header ═══ */}
            <View style={styles.header}>
              <View style={styles.aiGlow}>
                <Ionicons name="sparkles-outline" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.headerTitle}>Artemis Suggestion</Text>
            </View>

            {/* ═══ Natural Language Intent ═══ */}
            <View style={styles.intentContainer}>
              <Text style={styles.naturalLanguageText}>
                The studio is getting noticeably warm at 29.4°C while you are working. Shall I turn on the fan to cool it down?
              </Text>
            </View>

            {/* ═══ Tool/Device Selection ═══ */}
            <View style={styles.hardwareBadge}>
              <View style={styles.badgeLeft}>
                <Ionicons name="hardware-chip-outline" size={18} color={Colors.secondary} />
                <Text style={styles.badgeLabel}>Target Device</Text>
              </View>
              <Text style={styles.badgeValue}>Studio Fan</Text>
            </View>

            {/* ═══ Expandable Reasoning Trace ═══ */}
            <View style={styles.traceContainer}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsTraceExpanded(!isTraceExpanded)}
                style={styles.traceHeader}
              >
                <Text style={styles.traceLabel}>Diagnostic Trace</Text>
                <Ionicons 
                  name={isTraceExpanded ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color="rgba(255,255,255,0.4)" 
                />
              </TouchableOpacity>
              
              {isTraceExpanded && (
                <View style={styles.traceBody}>
                  {REASONING_LINES.map((line, i) => (
                    <View key={i} style={styles.traceRow}>
                      <Text style={styles.tracePrompt}>{'>'}</Text>
                      <Text style={styles.traceText}>
                        {line.text}
                        {line.highlight && (
                          <Text style={{ color: line.highlight.color }}>
                            {line.highlight.text}
                          </Text>
                        )}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={{ height: Spacing['3xl'] }} />

            {/* ═══ Execute Buttons ═══ */}
            <TouchableOpacity onPress={onExecute} activeOpacity={0.8} style={styles.executeWrapper}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.executeButton}
              >
                <Text style={styles.executeText}>Yes, do that</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={styles.dismissWrapper}>
              <View style={styles.dismissButton}>
                <Text style={styles.dismissText}>Not right now</Text>
              </View>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  root: { 
    height: '75%', 
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radii['3xl'],
    borderTopRightRadius: Radii['3xl'],
    shadowColor: '#000',
    shadowOpacity: 1,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: -10 },
    elevation: 40,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  handleSection: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  dragHandle: {
    width: 48, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  scrollContent: { paddingHorizontal: Spacing['2xl'], paddingTop: Spacing.xl },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  aiGlow: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(116, 177, 255, 0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(116, 177, 255, 0.2)',
  },
  headerTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.headlineSm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
  },

  /* ── Natural Language ── */
  intentContainer: {
    marginBottom: Spacing['2xl'],
  },
  naturalLanguageText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurface,
    lineHeight: 26,
    fontWeight: '500',
  },

  /* ── Tool/Device Badge ── */
  hardwareBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.xl,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: Spacing['2xl'],
  },
  badgeLeft: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
  },
  badgeLabel: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelSm,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  badgeValue: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    fontWeight: Typography.weights.bold,
    color: Colors.secondary,
  },

  /* ── Trace Accordion ── */
  traceContainer: {
    borderRadius: Radii.lg,
    backgroundColor: 'rgba(38, 37, 41, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  traceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  traceLabel: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.labelSm,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  traceBody: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  traceRow: { flexDirection: 'row', gap: Spacing.sm },
  tracePrompt: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    color: 'rgba(116,177,255,0.5)',
  },
  traceText: {
    flex: 1,
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
  },

  /* ── Execute Buttons ── */
  executeWrapper: { marginBottom: Spacing.md },
  executeButton: {
    paddingVertical: Spacing.xl,
    borderRadius: Radii.full,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  executeText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.bodyMd,
    fontWeight: Typography.weights.bold,
    color: Colors.onPrimary,
    letterSpacing: 2,
  },
  dismissWrapper: { 
    alignItems: 'center', 
    paddingVertical: Spacing.md 
  },
  dismissButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: Radii.full,
  },
  dismissText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    fontWeight: Typography.weights.semibold,
    color: Colors.onSurfaceVariant,
  },
});
