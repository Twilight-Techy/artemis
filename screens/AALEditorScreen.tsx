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

/* ────────────────────── AAL Code Model ────────────────────── */
type TokenType = 'keyword' | 'property' | 'operator' | 'value';

type CodeToken = { type: TokenType; text: string };

type CodeLine = { indent?: boolean; tokens: CodeToken[] };

const AAL_CODE: CodeLine[] = [
  {
    tokens: [
      { type: 'keyword', text: 'WHEN' },
      { type: 'property', text: 'system.time' },
      { type: 'operator', text: 'IS' },
      { type: 'value', text: '22:00_PST' },
    ],
  },
  {
    indent: true,
    tokens: [
      { type: 'keyword', text: 'AND' },
      { type: 'property', text: 'environment.security_level' },
      { type: 'operator', text: 'GREATER_THAN' },
      { type: 'value', text: 'LEVEL_04' },
    ],
  },
  {
    tokens: [
      { type: 'keyword', text: 'IF' },
      { type: 'property', text: 'user.location' },
      { type: 'operator', text: 'IN' },
      { type: 'value', text: '"PRIMARY_CHAMBER"' },
    ],
  },
  {
    tokens: [
      { type: 'keyword', text: 'THEN' },
      { type: 'property', text: 'core.initiate_sequence' },
      { type: 'value', text: '"DIM_ALL_LIGHTS"' },
    ],
  },
  {
    indent: true,
    tokens: [
      { type: 'keyword', text: 'SET' },
      { type: 'property', text: 'ambient.noise_cancellation' },
      { type: 'operator', text: 'TO' },
      { type: 'keyword', text: 'MAXIMUM' },
    ],
  },
  {
    tokens: [
      { type: 'keyword', text: 'ELSE' },
      { type: 'property', text: 'system.notify' },
      { type: 'value', text: '"REST_PENDING"' },
    ],
  },
];

const TOKEN_COLORS: Record<TokenType, string> = {
  keyword: Colors.primary,
  property: Colors.onSurface,
  operator: Colors.tertiary,
  value: Colors.secondary,
};

/* ────────────────────── Stats Data ────────────────────── */
const STATS = [
  {
    label: 'Logic Complexity',
    value: 'O(n) Stable',
    icon: 'git-network-outline' as const,
    color: Colors.tertiary,
  },
  {
    label: 'Execution Latency',
    value: '~14ms',
    icon: 'flash-outline' as const,
    color: Colors.secondary,
  },
  {
    label: 'Conflict Risk',
    value: 'Zero Det.',
    icon: 'shield-checkmark-outline' as const,
    color: '#00e3fd',
  },
  {
    label: 'AAL Syntax',
    value: 'Valid v2.4',
    icon: 'checkmark-circle-outline' as const,
    color: Colors.primary,
    accent: true,
  },
];

export default function AALEditorScreen() {
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
          <Ionicons name="terminal-outline" size={18} color={Colors.primary} />
          <Text style={styles.headerTitle}>ARTEMIS_OS</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ Breadcrumb + Title ═══ */}
        <View style={styles.titleSection}>
          <View style={styles.breadcrumb}>
            <Text style={styles.breadcrumbSegment}>Project</Text>
            <Text style={styles.breadcrumbSep}>/</Text>
            <Text style={styles.breadcrumbSegment}>Automations</Text>
            <Text style={styles.breadcrumbSep}>/</Text>
            <Text style={[styles.breadcrumbSegment, { color: Colors.onSurface }]}>
              night_protocol_01
            </Text>
          </View>
          <View style={styles.titleRow}>
            <Text style={styles.headline}>Edit AAL Module</Text>
            <View style={styles.liveDot} />
          </View>
        </View>

        {/* ═══ Action Buttons ═══ */}
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.ghostButton} activeOpacity={0.7}>
            <Ionicons name="play-circle-outline" size={16} color={Colors.onSurface} />
            <Text style={styles.ghostButtonText}>Test Logic</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryContainer]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButton}
            >
              <Ionicons name="save" size={14} color={Colors.onPrimary} />
              <Text style={styles.saveButtonText}>Save Automation</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ═══ Code Editor Card ═══ */}
        <View style={styles.editorCard}>
          {/* Window chrome */}
          <View style={styles.editorChrome}>
            <View style={styles.chromeDots}>
              <View style={[styles.chromeDot, { backgroundColor: 'rgba(255,113,108,0.2)', borderColor: 'rgba(255,113,108,0.3)' }]} />
              <View style={[styles.chromeDot, { backgroundColor: 'rgba(129,236,255,0.2)', borderColor: 'rgba(129,236,255,0.3)' }]} />
              <View style={[styles.chromeDot, { backgroundColor: 'rgba(116,177,255,0.2)', borderColor: 'rgba(116,177,255,0.3)' }]} />
            </View>
            <Text style={styles.chromeFilename}>aal_core_engine_v1.aal</Text>
            <View style={styles.chromeActions}>
              <Ionicons name="copy-outline" size={14} color="rgba(255,255,255,0.2)" />
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.2)" />
            </View>
          </View>

          {/* Code area */}
          <View style={styles.codeArea}>
            {/* Line numbers */}
            <View style={styles.lineNumbers}>
              {AAL_CODE.map((_, i) => (
                <Text key={i} style={styles.lineNumber}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
              ))}
            </View>

            {/* Code tokens */}
            <View style={styles.codeBody}>
              {AAL_CODE.map((line, i) => (
                <View
                  key={i}
                  style={[styles.codeLine, line.indent && { paddingLeft: 32 }]}
                >
                  {line.tokens.map((token, j) => {
                    if (token.type === 'value') {
                      return (
                        <View key={j} style={styles.valueChip}>
                          <Text style={[styles.token, { color: TOKEN_COLORS[token.type] }]}>
                            {token.text}
                          </Text>
                        </View>
                      );
                    }
                    return (
                      <Text
                        key={j}
                        style={[
                          styles.token,
                          { color: TOKEN_COLORS[token.type] },
                          token.type === 'keyword' && styles.keywordToken,
                        ]}
                      >
                        {token.text}
                      </Text>
                    );
                  })}
                </View>
              ))}
              {/* Cursor line */}
              <View style={styles.cursorLine} />
            </View>
          </View>

          {/* ═══ Artemis Interpretation Panel ═══ */}
          <View style={styles.interpretPanel}>
            <View style={styles.interpretIcon}>
              <Ionicons name="sparkles" size={18} color={Colors.secondary} />
            </View>
            <View style={styles.interpretBody}>
              <Text style={styles.interpretLabel}>Artemis Interpretation</Text>
              <Text style={styles.interpretText}>
                "I understand. Every night at 10:00 PM, if security protocols are active
                and you are in the primary chamber, I will create a focused atmosphere by
                dimming lights and enabling full noise suppression. If you are elsewhere,
                I'll just send a reminder that rest mode is pending."
              </Text>
            </View>
          </View>
        </View>

        {/* ═══ Stats Bento Grid ═══ */}
        <View style={styles.statsGrid}>
          {STATS.map(stat => (
            <View
              key={stat.label}
              style={[
                styles.statCard,
                stat.accent && { borderLeftWidth: 2, borderLeftColor: Colors.primary },
              ]}
            >
              <Text style={styles.statLabel}>{stat.label}</Text>
              <View style={styles.statRow}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Ionicons name={stat.icon} size={18} color={stat.color} />
              </View>
            </View>
          ))}
        </View>

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
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
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

  scrollContent: { paddingHorizontal: Spacing['2xl'] },

  /* ── Title ── */
  titleSection: { marginBottom: Spacing.xl },
  breadcrumb: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: Spacing.sm,
  },
  breadcrumbSegment: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelXs,
    color: Colors.tertiary,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  breadcrumbSep: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelXs,
    color: 'rgba(129,236,255,0.3)',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headline: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.displaySm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
  },
  liveDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#00e3fd',
  },

  /* ── Actions ── */
  actionBar: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  ghostButton: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(38,37,41,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  ghostButtonText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.bodySm,
    color: Colors.onSurface,
    letterSpacing: 1,
  },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md,
    borderRadius: Radii.full,
  },
  saveButtonText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.bodySm,
    fontWeight: Typography.weights.bold,
    color: Colors.onPrimary,
    letterSpacing: 1,
  },

  /* ── Editor Card ── */
  editorCard: {
    borderRadius: Radii.lg,
    backgroundColor: 'rgba(38,37,41,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    marginBottom: Spacing['2xl'],
  },
  editorChrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  chromeDots: { flexDirection: 'row', gap: 6 },
  chromeDot: {
    width: 10, height: 10, borderRadius: 5, borderWidth: 1,
  },
  chromeFilename: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelXs,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  chromeActions: { flexDirection: 'row', gap: Spacing.lg },

  /* ── Code Area ── */
  codeArea: {
    flexDirection: 'row',
    paddingVertical: Spacing['2xl'],
  },
  lineNumbers: {
    width: 44,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingVertical: 2,
  },
  lineNumber: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelXs,
    color: 'rgba(255,255,255,0.15)',
    lineHeight: 40,
  },
  codeBody: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
  },
  codeLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 40,
  },
  token: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
  },
  keywordToken: {
    fontFamily: Typography.families.headline,
    fontWeight: Typography.weights.bold,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  valueChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cursorLine: {
    height: 2,
    backgroundColor: 'rgba(116,177,255,0.2)',
    borderRadius: 1,
    marginTop: Spacing.sm,
  },

  /* ── Interpretation ── */
  interpretPanel: {
    flexDirection: 'row',
    gap: Spacing.lg,
    padding: Spacing['2xl'],
    backgroundColor: Colors.surfaceContainer,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  interpretIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.lg,
    backgroundColor: 'rgba(184,132,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(184,132,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  interpretBody: { flex: 1 },
  interpretLabel: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelXs,
    fontWeight: Typography.weights.bold,
    color: Colors.tertiary,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  interpretText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
    fontStyle: 'italic',
  },

  /* ── Stats Grid ── */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(38,37,41,0.2)',
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statLabel: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelXs,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  statValue: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.titleLg,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
  },
});
