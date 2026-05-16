import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import { artemisApi } from '../api/artemisClient';
import { ArtemisLoader } from '../components/ArtemisLoader';
import { ArtemisPullLoader } from '../components/ArtemisPullLoader';
import ConfirmModal from '../components/ConfirmModal';
import { useHistory } from '../contexts/HistoryContext';

type HistoryCategory = 'All' | 'Command' | 'Suggestion' | 'Automation';
const CATEGORIES: HistoryCategory[] = ['All', 'Command', 'Suggestion', 'Automation'];

type HistoryEntry = {
  id: string;
  title: string;
  time: string;
  date?: string;
  category: Exclude<HistoryCategory, 'All'>;
  icon: string;
  color: string;
  description?: string;
  systemContext?: string | null;
};

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { logs: historyLogs, isLoading, isRefreshing, refresh, clearLogs } = useHistory();
  const [activeFilter, setActiveFilter] = useState<HistoryCategory>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleClearHistory = useCallback(() => {
    setShowClearModal(true);
  }, []);

  const confirmClearHistory = useCallback(async () => {
    setShowClearModal(false);
    try {
      await artemisApi.clearHistory();
      clearLogs(); // optimistic local update via context
    } catch (err) {
      console.error('Failed to clear action history', err);
    }
  }, [clearLogs]);

  const formattedLogs = historyLogs.map(log => {
      let mappedCategory: Exclude<HistoryCategory, 'All'> = 'Command';
      let icon = 'bulb-outline';
      let color: string = Colors.secondary;

      if (log.action_type === 'automation_run' || log.triggered_by === 'automation') {
          mappedCategory = 'Automation';
          icon = 'flash';
          color = Colors.primary;
      } else if (log.action_type === 'mcp_suggestion' || log.action_type === 'control_device' || log.action_type === 'execute_function') {
          if (log.triggered_by === 'automation') {
              mappedCategory = 'Automation';
              icon = 'flash';
              color = Colors.primary;
          } else {
              mappedCategory = 'Suggestion';
              icon = 'chatbubble-outline';
              color = Colors.tertiary;
          }
      }

      let timeStr = 'Now';
      let dateStr = '';
      if (log.executed_at) {
          const dt = new Date(log.executed_at + 'Z');
          timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          dateStr = dt.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      }

      // Build rich description lines from actual log data
      const descLines: string[] = [];
      const req = log.request_payload || {};
      const res = log.response_payload || {};

      const actionTypeLabel = log.action_type?.replace(/_/g, ' ') ?? 'unknown action';
      const triggeredByLabel = log.triggered_by === 'automation' ? 'Triggered by automation rule' :
                               log.triggered_by === 'user' ? 'Triggered by user command' :
                               `Triggered by ${log.triggered_by ?? 'system'}`;
      descLines.push(triggeredByLabel);

      if (req._user_message) descLines.push(`Prompt: "${req._user_message}"`);

      // Args passed to the action (device name, capability, function name, etc.)
      const argLines = Object.entries(req)
          .filter(([k]) => !k.startsWith('_'))
          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`);
      if (argLines.length > 0) descLines.push(...argLines);

      // Status
      const statusLabel = log.status === 'success' ? '✓ Executed successfully' :
                          log.status === 'pending' ? '⏳ Pending user approval' :
                          log.status === 'declined' ? '✗ Declined by user' :
                          log.status === 'failed' ? '✗ Execution failed' : `Status: ${log.status}`;
      descLines.push(statusLabel);

      // System context if available
      const systemContext = res.reasoning ?? res.context ?? req._event_reason ?? null;

      return {
          id: log.id,
          title: log.target_name || actionTypeLabel || 'System Action',
          time: timeStr,
          date: dateStr,
          category: mappedCategory,
          icon,
          color,
          description: descLines.join('\n'),
          systemContext,
      };
  });

  const filteredEntries =
    activeFilter === 'All'
      ? formattedLogs
      : formattedLogs.filter(e => e.category === activeFilter);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

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
        <Text style={styles.headerTitle}>ARTEMIS</Text>
        {historyLogs.length > 0 ? (
          <TouchableOpacity
            onPress={handleClearHistory}
            style={styles.clearButton}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* ═══ Title Section ═══ */}
      <View style={styles.titleSection}>
        <Text style={styles.label}>System Logs</Text>
        <Text style={styles.headline}>Action History</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ArtemisLoader size={72} label="Loading history..." />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="transparent"
              colors={['transparent']}
              progressBackgroundColor="transparent"
              progressViewOffset={-100}
            />
          }
        >
          {/* ── Custom pull-to-refresh header ── */}
          {isRefreshing && (
            <ArtemisPullLoader
              size={10}
              label="Refreshing history…"
              style={styles.pullLoader}
            />
          )}

          {/* ═══ Filter Chips ═══ */}
          <View style={styles.filterBarWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterBar}
            >
              {CATEGORIES.map(cat => {
                const isActive = activeFilter === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setActiveFilter(cat)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        isActive && styles.filterTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ═══ Timeline ═══ */}
          <View style={styles.timeline}>
            {/* Timeline vertical line */}
            <View style={styles.timelineLine} />

            {filteredEntries.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="time-outline" size={48} color={Colors.onSurfaceVariant} style={{ opacity: 0.4 }} />
                <Text style={styles.emptyText}>
                  {activeFilter === 'All' ? 'No history yet' : `No ${activeFilter} entries`}
                </Text>
                <Text style={styles.emptySubText}>
                  {activeFilter === 'All'
                    ? 'Actions and automations will appear here once Artemis gets to work.'
                    : `Try switching to "All" to see the full log.`}
                </Text>
              </View>
            ) : (
              filteredEntries.map((entry) => {
                const isExpanded = expandedId === entry.id;
                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={styles.timelineEntry}
                    activeOpacity={0.8}
                    onPress={() => toggleExpand(entry.id)}
                  >
                  {/* Timeline dot */}
                  <View style={styles.timelineDotOuter}>
                    <View
                      style={[
                        styles.timelineDotRing,
                        {
                          borderColor: isExpanded
                            ? entry.color
                            : `${entry.color}66`,
                        },
                        isExpanded && {
                          shadowColor: entry.color,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.5,
                          shadowRadius: 10,
                          elevation: 6,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.timelineDotInner,
                          {
                            backgroundColor: isExpanded
                              ? entry.color
                              : `${entry.color}66`,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Entry card */}
                  <View
                    style={[
                      styles.entryCard,
                      isExpanded && {
                        borderColor: `${entry.color}4D`,
                      },
                    ]}
                  >
                    <View style={styles.entryHeader}>
                      <View style={styles.entryTitleGroup}>
                        <View style={styles.entryTitleRow}>
                          <Ionicons
                            name={entry.icon as any}
                            size={16}
                            color={entry.color}
                          />
                          <Text style={styles.entryTitle}>{entry.title}</Text>
                        </View>
                        <Text style={styles.entryMeta}>
                          {entry.date ? `${entry.date} · ` : ''}{entry.time} · {entry.category.toUpperCase()}
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={isExpanded ? entry.color : 'rgba(255, 255, 255, 0.15)'}
                      />
                    </View>

                    {/* Expanded content — always shown when expanded */}
                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        {entry.description && entry.description.split('\n').map((line, i) => (
                          <View key={i} style={styles.descLine}>
                            <View style={[styles.descDot, { backgroundColor: entry.color }]} />
                            <Text style={styles.entryDescription}>{line}</Text>
                          </View>
                        ))}
                        {entry.systemContext && (
                          <View style={styles.contextBox}>
                            <Text style={styles.contextLabel}>
                              Artemis Reasoning
                            </Text>
                            <View style={styles.contextRow}>
                              <View style={styles.contextIcon}>
                                <Ionicons
                                  name="sparkles"
                                  size={14}
                                  color={Colors.primary}
                                />
                              </View>
                              <Text style={styles.contextText}>
                                {entry.systemContext}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
            )}
          </View>

          {/* ═══ End Marker ═══ */}
          <View style={styles.endMarker}>
            <Text style={styles.endMarkerText}>End of Transmission</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
      {/* ═══ Clear History Confirmation Modal ═══ */}
      <ConfirmModal
        visible={showClearModal}
        icon="trash-outline"
        iconColor={Colors.error}
        title="Clear Action History"
        message="This will permanently delete all action and execution logs. This cannot be undone."
        confirmLabel="Clear"
        cancelLabel="Keep It"
        destructive
        onConfirm={confirmClearHistory}
        onCancel={() => setShowClearModal(false)}
      />
    </View>
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
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 113, 108, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 113, 108, 0.18)',
  },
  headerTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.titleLg,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    letterSpacing: 6,
    textShadowColor: 'rgba(116, 177, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: 80,
  },
  pullLoader: {
    paddingVertical: Spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: 40,
    flexGrow: 1,
  },
  titleSection: {
    paddingHorizontal: Spacing['2xl'],
    marginBottom: Spacing['2xl'],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.headlineMd,
    color: Colors.onSurface,
    marginTop: Spacing.md,
  },
  emptySubText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
  },
  label: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelXs,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 5,
    marginBottom: Spacing.sm,
  },
  headline: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.displaySm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    letterSpacing: -1,
  },
  filterBarWrapper: {
    height: 44,
    marginBottom: Spacing['3xl'],
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(38, 37, 41, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
  },
  filterChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: 'transparent',
  },
  filterText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  filterTextActive: {
    color: Colors.onPrimaryContainer,
  },
  timeline: {
    position: 'relative',
    paddingLeft: Spacing.md,
  },
  timelineLine: {
    position: 'absolute',
    left: Spacing.md + 11,
    top: 16,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(116, 177, 255, 0.15)',
  },
  timelineEntry: {
    flexDirection: 'row',
    marginBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  timelineDotOuter: {
    width: 24,
    paddingTop: 4,
    alignItems: 'center',
  },
  timelineDotRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entryCard: {
    flex: 1,
    backgroundColor: 'rgba(38, 37, 41, 0.2)',
    borderRadius: Radii.lg,
    padding: Spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.1)',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  entryTitleGroup: {
    flex: 1,
    marginRight: Spacing.md,
  },
  entryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  entryTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.bodyLg,
    fontWeight: Typography.weights.semibold,
    color: Colors.onSurface,
  },
  entryMeta: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelXs,
    fontWeight: Typography.weights.bold,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  expandedContent: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(72, 71, 74, 0.1)',
    gap: Spacing.sm,
  },
  descLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  descDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 8,
    opacity: 0.7,
    flexShrink: 0,
  },
  entryDescription: {
    flex: 1,
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 22,
  },
  contextBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(116, 177, 255, 0.5)',
  },
  contextLabel: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelXs,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  contextRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  contextIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(116, 177, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextText: {
    flex: 1,
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  endMarker: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  endMarkerText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelXs,
    fontWeight: Typography.weights.bold,
    color: 'rgba(255, 255, 255, 0.15)',
    textTransform: 'uppercase',
    letterSpacing: 8,
  },
});
