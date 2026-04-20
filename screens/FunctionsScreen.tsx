import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import TopNavBar from '../components/TopNavBar';

type FilterCategory = 'All Actions' | 'Daily Routine' | 'Security' | 'Energy Saving';
const CATEGORIES: FilterCategory[] = ['All Actions', 'Daily Routine', 'Security', 'Energy Saving'];

export default function FunctionsScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All Actions');
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);

  const handleOpenActionModal = (functionName: string) => {
    setSelectedFunction(functionName);
  };

  const handleCloseActionModal = () => {
    setSelectedFunction(null);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TopNavBar />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ═══ Header Section ═══ */}
        <View style={styles.headerSection}>
          <Text style={styles.headline}>Functions</Text>
          <Text style={styles.subtitle}>
            Orchestrate your environment with reactive intelligence macros.
          </Text>

          <TouchableOpacity activeOpacity={0.8} style={styles.addButtonContainer}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryContainer]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addButton}
            >
              <Ionicons name="add" size={20} color={Colors.onPrimary} />
              <Text style={styles.addButtonText}>Add Custom Function</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ═══ Filter Chips ═══ */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeFilter === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ═══ Functions List ═══ */}
        <View style={styles.functionsList}>
          
          {/* Card 1: Solar Awakening */}
          <TouchableOpacity activeOpacity={0.8} onPress={() => handleOpenActionModal('Solar Awakening')} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.tag, { backgroundColor: 'rgba(129, 236, 255, 0.15)', borderColor: 'rgba(129, 236, 255, 0.3)' }]}>
                <View style={[styles.tagDot, { backgroundColor: Colors.tertiary }]} />
                <Text style={[styles.tagText, { color: Colors.tertiary }]}>Daily Routine</Text>
              </View>
              <MaterialCommunityIcons name="weather-sunny" size={24} color={Colors.tertiary} />
            </View>
            <Text style={styles.cardTitle}>Solar Awakening</Text>
            <Text style={styles.cardDescription}>
              Gradual light increase, temperature adjustment, and coffee initiation sequence.
            </Text>
            <View style={styles.deviceRow}>
              <View style={styles.deviceCircle}>
                <MaterialCommunityIcons name="lightbulb-outline" size={16} color={Colors.onSurface} />
              </View>
              <View style={styles.deviceCircle}>
                <MaterialCommunityIcons name="thermometer" size={16} color={Colors.onSurface} />
              </View>
              <View style={styles.deviceCircle}>
                <MaterialCommunityIcons name="coffee-outline" size={16} color={Colors.onSurface} />
              </View>
              <Text style={styles.deviceText}>3 Connected Devices</Text>
            </View>
          </TouchableOpacity>

          {/* Card 2: Deep Shield */}
          <TouchableOpacity activeOpacity={0.8} onPress={() => handleOpenActionModal('Deep Shield')} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.tag, { backgroundColor: 'rgba(255, 113, 108, 0.15)', borderColor: 'rgba(255, 113, 108, 0.3)' }]}>
                <View style={[styles.tagDot, { backgroundColor: Colors.error }]} />
                <Text style={[styles.tagText, { color: Colors.error }]}>Security</Text>
              </View>
              <View style={styles.activeStatus}>
                <Text style={styles.activeText}>Active</Text>
                <MaterialCommunityIcons name="shield-lock-outline" size={24} color={Colors.error} />
              </View>
            </View>
            <Text style={styles.cardTitle}>Deep Shield</Text>
            <Text style={styles.cardDescription}>
              Lock all entry points, arm perimeter sensors, and close blinds.
            </Text>
          </TouchableOpacity>

          {/* Card 3: Eco Flow */}
          <TouchableOpacity activeOpacity={0.8} onPress={() => handleOpenActionModal('Eco Flow')} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.tag, { backgroundColor: 'rgba(184, 132, 255, 0.15)', borderColor: 'rgba(184, 132, 255, 0.3)' }]}>
                <View style={[styles.tagDot, { backgroundColor: Colors.secondary }]} />
                <Text style={[styles.tagText, { color: Colors.secondary }]}>Energy Saving</Text>
              </View>
              <MaterialCommunityIcons name="leaf" size={24} color={Colors.secondary} />
            </View>
            <Text style={styles.cardTitle}>Eco Flow</Text>
            <Text style={styles.cardDescription}>
              Optimizes HVAC usage based on room occupancy and external temperature.
            </Text>
            <View style={styles.savingsBox}>
              <Text style={styles.savingsLabel}>Today's Saving</Text>
              <Text style={styles.savingsValue}>4.2 kWh</Text>
            </View>
          </TouchableOpacity>

          {/* Card 4: Neural Presence Sync */}
          <TouchableOpacity activeOpacity={0.8} onPress={() => handleOpenActionModal('Neural Presence Sync')} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.tag, { backgroundColor: 'rgba(129, 236, 255, 0.15)', borderColor: 'rgba(129, 236, 255, 0.3)' }]}>
                <View style={[styles.tagDot, { backgroundColor: Colors.tertiary }]} />
                <Text style={[styles.tagText, { color: Colors.tertiary }]}>Beta Function</Text>
              </View>
              <MaterialCommunityIcons name="brain" size={24} color={Colors.tertiary} />
            </View>
            <Text style={styles.cardTitle}>Neural Presence Sync</Text>
            <Text style={styles.cardDescription}>
              Adapts lighting temperature and acoustic profile to individual bio-rhythms.
            </Text>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Configure Biometrics</Text>
            </TouchableOpacity>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* ═══ Action Modal ═══ */}
      <Modal
        visible={!!selectedFunction}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseActionModal}
      >
        <TouchableWithoutFeedback onPress={handleCloseActionModal}>
          <View style={styles.modalOverlay}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>{selectedFunction}</Text>
                <Text style={styles.modalSubtitle}>Manage your automation</Text>
                
                <TouchableOpacity style={styles.modalActionRow}>
                  <View style={[styles.modalActionIcon, { backgroundColor: 'rgba(116, 177, 255, 0.15)' }]}>
                    <Ionicons name="create-outline" size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.modalActionText}>Edit Function Structure</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceVariant} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalActionRow}>
                  <View style={[styles.modalActionIcon, { backgroundColor: 'rgba(184, 132, 255, 0.15)' }]}>
                    <Ionicons name="options-outline" size={20} color={Colors.secondary} />
                  </View>
                  <Text style={styles.modalActionText}>Modify Triggers / Conditions</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceVariant} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalActionRow}>
                  <View style={[styles.modalActionIcon, { backgroundColor: 'rgba(255, 113, 108, 0.15)' }]}>
                    <Ionicons name="pause-circle-outline" size={20} color={Colors.error} />
                  </View>
                  <Text style={[styles.modalActionText, { color: Colors.error }]}>Pause Automation</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionButton, { marginTop: Spacing.xl }]} onPress={handleCloseActionModal}>
                  <Text style={styles.actionButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  addButtonContainer: {
    alignSelf: 'stretch',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.full,
    gap: Spacing.sm,
  },
  addButtonText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelLg,
    fontWeight: Typography.weights.bold,
    color: Colors.onPrimary,
  },
  filterBar: {
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  filterChip: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.surfaceTint,
    borderColor: Colors.primaryFixed,
  },
  filterText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelLg,
    fontWeight: Typography.weights.medium,
    color: Colors.onSurfaceVariant,
  },
  filterTextActive: {
    color: Colors.onPrimary,
    fontWeight: Typography.weights.bold,
  },
  functionsList: {
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing['2xl'],
  },
  card: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.xl,
    padding: Spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
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
  activeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  activeText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: Colors.error,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.headlineSm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
  },
  cardDescription: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -8,
    borderWidth: 2,
    borderColor: Colors.surfaceContainerLow,
  },
  deviceText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelMd,
    color: Colors.onSurfaceVariant,
    marginLeft: 16,
  },
  savingsBox: {
    backgroundColor: 'rgba(184, 132, 255, 0.1)',
    borderRadius: Radii.md,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(184, 132, 255, 0.2)',
  },
  savingsLabel: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelMd,
    color: Colors.onSurfaceVariant,
  },
  savingsValue: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.titleLg,
    fontWeight: Typography.weights.bold,
    color: Colors.secondary,
  },
  actionButton: {
    backgroundColor: Colors.surfaceContainerHighest,
    paddingVertical: Spacing.md,
    borderRadius: Radii.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
  },
  actionButtonText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelLg,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing['2xl'],
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)',
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.surfaceTint,
    borderRadius: Radii.full,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.headlineSm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing['2xl'],
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  modalActionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActionText: {
    flex: 1,
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelLg,
    color: Colors.onSurface,
  },
});
