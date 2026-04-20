import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';

/* ────────────────────── Log Data ────────────────────── */
const SYSTEM_LOGS = [
  { time: 'T+0.04s', text: 'Request intercepted', color: Colors.tertiary },
  { time: 'T+0.12s', text: 'Logic sequence primed', color: Colors.tertiary },
  { time: 'T+0.45s', text: 'Output generated', color: Colors.secondary },
];

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

export default function MCPOverlayScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ═══ Header ═══ */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerOrb} />
          <Text style={styles.headerTitle}>ARTEMIS_OS</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ═══ Drag Handle + Status ═══ */}
      <View style={styles.handleSection}>
        <View style={styles.dragHandle} />
        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <View style={styles.statusPing} />
            <Text style={styles.statusText}>Thinking</Text>
          </View>
          <View style={styles.dividerLine} />
          <Text style={styles.nodeId}>NODE_ID: LLM-7B-QUANTUM-04</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ Intent Detection Card ═══ */}
        <View style={styles.intentCard}>
          <Text style={styles.cardLabel}>Intent Detected</Text>
          <View style={styles.intentRow}>
            <Ionicons name="locate-outline" size={32} color={Colors.primary} />
            <View style={styles.intentBody}>
              <Text style={styles.intentTitle}>
                "Turn on the studio fan"
              </Text>
              <Text style={styles.intentConfidence}>
                Confidence Score:{' '}
                <Text style={{ color: Colors.tertiary, fontFamily: 'Manrope-Bold' }}>
                  0.9984
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {/* ═══ Bento: Context + Tool Selection ═══ */}
        <View style={styles.bentoRow}>
          {/* Context Card */}
          <View style={styles.bentoCard}>
            <View style={styles.bentoHeader}>
              <Ionicons name="thermometer-outline" size={14} color={Colors.tertiary} />
              <Text style={styles.bentoLabel}>Context Evaluated</Text>
            </View>
            <View style={styles.bentoBody}>
              <View style={styles.contextRow}>
                <Text style={styles.contextKey}>Ambient Temp</Text>
                <Text style={styles.contextValue}>29.4°C</Text>
              </View>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={['rgba(129,236,255,0.2)', Colors.tertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: '75%' }]}
                />
              </View>
              <View style={styles.contextRow}>
                <Text style={styles.contextKey}>Studio Occupancy</Text>
                <Text style={styles.contextValueDetected}>DETECTED</Text>
              </View>
            </View>
          </View>

          {/* Tool Selection Card */}
          <View style={styles.bentoCard}>
            <View style={styles.bentoHeader}>
              <Ionicons name="construct-outline" size={14} color={Colors.secondary} />
              <Text style={styles.bentoLabel}>Tool Selection</Text>
            </View>
            <View style={styles.bentoBody}>
              <View style={styles.toolBadge}>
                <Ionicons name="hardware-chip-outline" size={18} color={Colors.secondary} />
                <Text style={styles.toolName}>Arduino_Executor.v2</Text>
              </View>
              <Text style={styles.toolEndpoint}>
                Executing endpoint:{'\n'}/api/v1/relays/studio_fan/state/ON
              </Text>
            </View>
          </View>
        </View>

        {/* ═══ Neural Logic Reasoning ═══ */}
        <View style={styles.reasoningCard}>
          <Text style={styles.cardLabelAlt}>Neural Logic Reasoning</Text>
          <View style={styles.reasoningBody}>
            {REASONING_LINES.map((line, i) => (
              <View key={i} style={styles.reasoningRow}>
                <Text style={styles.reasoningPrompt}>{'>'}</Text>
                <Text style={styles.reasoningText}>
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
        </View>

        {/* ═══ Visualization + Stats ═══ */}
        <View style={styles.vizCard}>
          {/* Abstract background glows */}
          <View style={styles.vizGlowPrimary} />
          <View style={styles.vizGlowSecondary} />

          {/* Concentric rings */}
          <View style={styles.vizCenter}>
            <View style={styles.vizRingOuter}>
              <View style={styles.vizRingInner}>
                <LinearGradient
                  colors={[Colors.primary, Colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.vizCore}
                />
              </View>
            </View>
          </View>

          {/* Stats overlay */}
          <View style={styles.vizStats}>
            <View style={styles.vizStat}>
              <Text style={styles.vizStatValue}>42ms</Text>
              <Text style={styles.vizStatLabel}>LATENCY</Text>
            </View>
            <View style={styles.vizStat}>
              <Text style={styles.vizStatValue}>0.024</Text>
              <Text style={styles.vizStatLabel}>LOSS</Text>
            </View>
            <View style={styles.vizStat}>
              <Text style={styles.vizStatValue}>124k</Text>
              <Text style={styles.vizStatLabel}>TOKENS</Text>
            </View>
          </View>
        </View>

        {/* ═══ System Logs ═══ */}
        <View style={styles.logsCard}>
          <View style={styles.logsHeader}>
            <Text style={styles.bentoLabel}>System Logs</Text>
            <Ionicons name="server-outline" size={14} color="rgba(255,255,255,0.2)" />
          </View>
          {SYSTEM_LOGS.map((log, i) => (
            <View key={i} style={styles.logRow}>
              <View style={[styles.logDot, { backgroundColor: log.color }]} />
              <Text style={[styles.logText, i === SYSTEM_LOGS.length - 1 && { color: log.color }]}>
                {log.time}: {log.text}
              </Text>
            </View>
          ))}
        </View>

        {/* ═══ Execute Button ═══ */}
        <TouchableOpacity activeOpacity={0.8} style={styles.executeWrapper}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.executeButton}
          >
            <Text style={styles.executeText}>Execute Logic Process</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

/* ────────────────────── Styles ────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
  },
  headerOrb: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 6,
  },
  headerTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.titleLg,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    letterSpacing: 4,
    textShadowColor: 'rgba(116,177,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  /* ── Handle + Status ── */
  handleSection: {
    alignItems: 'center',
    paddingBottom: Spacing.lg,
  },
  dragHandle: {
    width: 48, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: Spacing.xl,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    width: '100%',
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(184,132,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(184,132,255,0.2)',
  },
  statusPing: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.secondary,
  },
  statusText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelXs,
    color: Colors.secondary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  dividerLine: {
    flex: 1, height: 1,
    backgroundColor: 'rgba(184,132,255,0.15)',
  },
  nodeId: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.labelXs,
    color: 'rgba(255,255,255,0.4)',
  },

  scrollContent: { paddingHorizontal: Spacing['2xl'], paddingTop: Spacing.lg },

  /* ── Intent Card ── */
  intentCard: {
    padding: Spacing['2xl'],
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
  cardLabel: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelXs,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: Spacing.lg,
  },
  intentRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg,
  },
  intentBody: { flex: 1 },
  intentTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.headlineMd,
    fontWeight: Typography.weights.medium,
    color: Colors.onSurface,
  },
  intentConfidence: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },

  /* ── Bento Grid ── */
  bentoRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  bentoCard: {
    flex: 1,
    padding: Spacing.xl,
    borderRadius: Radii.lg,
    backgroundColor: 'rgba(38,37,41,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  bentoHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: Spacing.lg,
  },
  bentoLabel: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelXs,
    fontWeight: Typography.weights.bold,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  bentoBody: { gap: Spacing.md },
  contextRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  contextKey: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.labelSm,
    color: 'rgba(255,255,255,0.6)',
  },
  contextValue: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    fontWeight: Typography.weights.bold,
    color: Colors.tertiary,
  },
  contextValueDetected: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    fontWeight: Typography.weights.bold,
    color: Colors.tertiary,
    letterSpacing: 1,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radii.full,
    overflow: 'hidden',
  },
  progressFill: { height: 3, borderRadius: Radii.full },
  toolBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.lg,
    backgroundColor: 'rgba(184,132,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(184,132,255,0.2)',
  },
  toolName: {
    fontFamily: Typography.families.body,
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    color: Colors.secondary,
  },
  toolEndpoint: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.labelXs,
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic',
    lineHeight: 16,
  },

  /* ── Reasoning ── */
  reasoningCard: {
    padding: Spacing['2xl'],
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: Spacing.lg,
  },
  cardLabelAlt: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelXs,
    fontWeight: Typography.weights.bold,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: Spacing.lg,
  },
  reasoningBody: { gap: Spacing.md },
  reasoningRow: { flexDirection: 'row', gap: Spacing.sm },
  reasoningPrompt: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    color: 'rgba(116,177,255,0.5)',
  },
  reasoningText: {
    flex: 1,
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
  },

  /* ── Visualization ── */
  vizCard: {
    height: 200,
    borderRadius: Radii.xl,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vizGlowPrimary: {
    position: 'absolute',
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(116,177,255,0.08)',
  },
  vizGlowSecondary: {
    position: 'absolute',
    top: 20, left: '15%',
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(184,132,255,0.06)',
  },
  vizCenter: { justifyContent: 'center', alignItems: 'center' },
  vizRingOuter: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vizRingInner: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vizCore: {
    width: 32, height: 32, borderRadius: 16,
  },
  vizStats: {
    position: 'absolute',
    bottom: Spacing.xl, left: Spacing.xl, right: Spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  vizStat: { alignItems: 'center' },
  vizStatValue: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
  },
  vizStatLabel: {
    fontFamily: Typography.families.label,
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  /* ── System Logs ── */
  logsCard: {
    padding: Spacing['2xl'],
    borderRadius: Radii.lg,
    backgroundColor: 'rgba(31,31,34,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: Spacing['2xl'],
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  logDot: {
    width: 6, height: 6, borderRadius: 3,
  },
  logText: {
    fontFamily: Typography.families.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },

  /* ── Execute Button ── */
  executeWrapper: { marginBottom: Spacing.lg },
  executeButton: {
    paddingVertical: Spacing.xl,
    borderRadius: Radii.full,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 8,
  },
  executeText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.bodySm,
    fontWeight: Typography.weights.bold,
    color: Colors.onPrimary,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
});
