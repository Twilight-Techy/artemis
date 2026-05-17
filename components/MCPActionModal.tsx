import React from 'react';
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

/** Shape mirrors the `ProactiveActionResponse` Pydantic model from the backend. */
export interface ProactiveAction {
  action_id: string;
  action_type: string;
  payload: Record<string, any>;
  reasoning: string;
  reasoning_trace?: string | null;
}

interface MCPActionModalProps {
  visible: boolean;
  onClose: () => void;
  onExecute: () => void;
  /** Live data from the /mcp/chat response. When null the modal stays hidden. */
  proactiveAction: ProactiveAction | null;
}

export default function MCPActionModal({ visible, onClose, onExecute, proactiveAction }: MCPActionModalProps) {
  const insets = useSafeAreaInsets();

  // ── Derive display values from live backend data ──────────────────────────
  const intentText = proactiveAction?.reasoning
    ?? 'I have a suggestion for you. Would you like me to proceed?';

  const targetLabel = proactiveAction?.target_name ?? 'Unknown Device';

  // Derive a human-readable action label from the action_type snake_case identifier
  const getActionLabel = (type: string | undefined) => type
    ? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Action';

  const actions = proactiveAction?.payload?.actions || [{
    tool_name: proactiveAction?.action_type,
    args: { device_name: proactiveAction?.target_name }
  }];

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

            {/* ═══ Natural Language Intent (dynamic) ═══ */}
            <View style={styles.intentContainer}>
              <Text style={styles.naturalLanguageText}>{intentText}</Text>
            </View>

            {/* ═══ Tool/Device Selection (dynamic) ═══ */}
            {actions.map((action: any, index: number) => {
              const actionLabel = getActionLabel(action.tool_name);
              const target = action.args?.device_name || action.args?.function_name || 'Unknown Device';
              return (
                <View key={index} style={[styles.hardwareBadge, { marginTop: index > 0 ? Spacing.sm : 0 }]}>
                  <View style={styles.badgeLeft}>
                    <Ionicons 
                      name={action.tool_name === 'execute_function' ? 'flash-outline' : 'hardware-chip-outline'} 
                      size={18} 
                      color={Colors.secondary} 
                    />
                    <Text style={styles.badgeLabel}>
                      {action.tool_name === 'execute_function' ? 'FUNCTION' : actionLabel}
                    </Text>
                  </View>
                  <Text style={styles.badgeValue} numberOfLines={1}>{target}</Text>
                </View>
              );
            })}

            {/* ═══ Reasoning Trace (dynamic) ═══ */}
            {proactiveAction?.reasoning_trace ? (
              <View style={styles.traceContainer}>
                <Ionicons name="git-branch-outline" size={14} color={Colors.primary} style={styles.traceIcon} />
                <Text style={styles.traceText}>{proactiveAction.reasoning_trace}</Text>
              </View>
            ) : null}


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

  /* ── Reasoning Trace ── */
  traceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(116, 177, 255, 0.05)',
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    marginBottom: Spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(116, 177, 255, 0.1)',
  },
  traceIcon: {
    marginTop: 2,
    marginRight: Spacing.sm,
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
