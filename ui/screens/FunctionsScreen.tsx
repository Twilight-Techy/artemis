import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, Alert, TextInput, Animated, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ArtemisLoader } from '../components/ArtemisLoader';
import { ArtemisPullLoader } from '../components/ArtemisPullLoader';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import TopNavBar from '../components/TopNavBar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { artemisApi } from '../api/artemisClient';

type FilterCategory = 'All Functions' | 'Hardware' | 'Software' | 'Hybrid';
const CATEGORIES: FilterCategory[] = ['All Functions', 'Hardware', 'Software', 'Hybrid'];

export default function FunctionsScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All Functions');
  
  const [functionsList, setFunctionsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoaded = useRef(false);

  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null);
  const [confirmExecuteId, setConfirmExecuteId] = useState<string | null>(null);
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({});
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = React.useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      if (!hasLoaded.current) {
        fetchFunctions();
      }
    }, [])
  );

  const fetchFunctions = async (isPullRefresh = false) => {
    if (!isPullRefresh) setIsLoading(true);
    try {
      const data = await artemisApi.getFunctions();
      setFunctionsList(data);
      hasLoaded.current = true;
    } catch (e) {
      console.warn("Failed to fetch functions", e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFunctions(true);
  }, []);

  const handleOpenActionModal = (id: string) => {
    setSelectedFunctionId(id);
  };

  const handleCloseActionModal = () => {
    setSelectedFunctionId(null);
  };

  const handleOpenExecuteModal = (id: string) => {
    setConfirmExecuteId(id);
    setParameterValues({});
  };

  const handleCloseExecuteModal = () => {
    setConfirmExecuteId(null);
    setParameterValues({});
  };

  const showToast = (message: string) => {
    toastAnim.setValue(0);
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const executeFunction = async () => {
    if (!confirmExecuteId) return;
    const fnName = confirmExecuteObj?.name || 'Function';
    
    try {
      await artemisApi.executeFunction(confirmExecuteId, parameterValues);
      handleCloseExecuteModal();
      showToast(`${fnName} executed successfully`);
    } catch (e) {
      Alert.alert("Execution Failed", `Could not run ${fnName}`);
      handleCloseExecuteModal();
    }
  };

  const selectedFunctionObj = functionsList.find(f => f.id === selectedFunctionId);
  const confirmExecuteObj = functionsList.find(f => f.id === confirmExecuteId);


  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TopNavBar />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            // Fully hide the native spinner — ArtemisPullLoader provides the visual
            tintColor="transparent"
            colors={['transparent']}
            progressBackgroundColor="transparent"
            progressViewOffset={-100}
          />
        }
      >
        {/* ── Custom pull-to-refresh header ── */}
        {refreshing && (
          <ArtemisPullLoader
            size={10}
            label="Syncing functions…"
            style={styles.pullLoader}
          />
        )}
        {/* ΓòÉΓòÉΓòÉ Header Section ΓòÉΓòÉΓòÉ */}
        <View style={styles.headerSection}>
          <Text style={styles.headline}>Functions</Text>
          <Text style={styles.subtitle}>
            Orchestrate your environment with reactive intelligence macros.
          </Text>

          <TouchableOpacity activeOpacity={0.8} style={styles.addButtonContainer} onPress={() => navigation.navigate('AddEditFunction', { mode: 'add' })}>
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

        {/* ΓòÉΓòÉΓòÉ Filter Chips ΓòÉΓòÉΓòÉ */}
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

        {/* Functions List */}
        <View style={styles.functionsList}>
          {isLoading ? (
            <ArtemisLoader size={72} label="Loading functions..." style={{ marginTop: 40 }} />
          ) : (
            (() => {
              const filtered = functionsList.filter(f => {
                if (activeFilter === 'All Functions') return true;
                return f.function_type.toLowerCase() === activeFilter.toLowerCase();
              });

              if (filtered.length === 0) {
                return (
                  <View style={styles.emptyState}>
                    <Ionicons name="cube-outline" size={48} color="rgba(116, 177, 255, 0.25)" />
                    <Text style={styles.emptyTitle}>
                      {functionsList.length === 0 ? 'No functions yet' : `No ${activeFilter.toLowerCase()} functions`}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                      {functionsList.length === 0
                        ? 'Create your first custom function to begin orchestrating your environment.'
                        : 'Try a different filter or create a new function.'}
                    </Text>
                  </View>
                );
              }

              return filtered.map((fn) => {
                
                // Determine styling based on type
                let icon: string = 'hardware-chip-outline';
                let color: string = Colors.primary;
                let bg: string = 'rgba(116, 177, 255, 0.15)';
                let border: string = 'rgba(116, 177, 255, 0.3)';
                let typeLabel: string = "Hardware";

                const typeLower = (fn.function_type || '').toLowerCase();
                if (typeLower === 'software') {
                  icon = 'cloud-outline';
                  color = Colors.tertiary;
                  bg = 'rgba(129, 236, 255, 0.15)';
                  border = 'rgba(129, 236, 255, 0.3)';
                  typeLabel = "Software";
                } else if (typeLower === 'hybrid') {
                  icon = 'git-merge-outline';
                  color = Colors.secondary;
                  bg = 'rgba(184, 132, 255, 0.15)';
                  border = 'rgba(184, 132, 255, 0.3)';
                  typeLabel = "Hybrid";
                }

                return (
                  <TouchableOpacity 
                    key={fn.id} 
                    activeOpacity={0.8} 
                    onPress={() => handleOpenActionModal(fn.id)} 
                    onLongPress={() => navigation.navigate('AddEditFunction', { mode: 'edit', functionName: fn.name })}
                    style={[styles.card]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={[styles.tag, { backgroundColor: bg, borderColor: border }]}>
                        <View style={[styles.tagDot, { backgroundColor: color }]} />
                        <Text style={[styles.tagText, { color: color }]}>{typeLabel} Function</Text>
                      </View>
                      <Ionicons name={icon as any} size={24} color={color} />
                    </View>
                    <Text style={styles.cardTitle}>{fn.name}</Text>
                    {fn.description ? (
                      <Text style={styles.cardDescription}>{fn.description}</Text>
                    ) : null}
                    
                    <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
                      {fn.url && (
                        <View style={styles.deviceRow}>
                          <View style={styles.deviceCircle}>
                            <Ionicons name="cloud-outline" size={16} color={Colors.onSurface} />
                          </View>
                          <Text style={styles.deviceText}>{fn.method} {fn.url}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              });
            })()
          )}



        </View>
      </ScrollView>

      {/* ΓòÉΓòÉΓòÉ Action Modal ΓòÉΓòÉΓòÉ */}
      <Modal
        visible={!!selectedFunctionId}
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
                <Text style={styles.modalTitle}>{selectedFunctionObj?.name}</Text>
                <Text style={styles.modalSubtitle}>Manage your function</Text>
                
                <TouchableOpacity style={styles.modalActionRow} onPress={() => {
                  handleCloseActionModal();
                  navigation.navigate('AddEditFunction', { mode: 'edit', functionName: selectedFunctionObj?.name || '' });
                }}>
                  <View style={[styles.modalActionIcon, { backgroundColor: 'rgba(116, 177, 255, 0.15)' }]}>
                    <Ionicons name="create-outline" size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.modalActionText}>Edit Function Structure</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceVariant} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalActionRow} onPress={() => {
                  handleCloseActionModal();
                  navigation.navigate('AddEditFunction', { mode: 'edit', functionName: selectedFunctionObj?.name || '' });
                }}>
                  <View style={[styles.modalActionIcon, { backgroundColor: 'rgba(116, 177, 255, 0.15)' }]}>
                    <Ionicons name="options-outline" size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.modalActionText}>Modify Triggers / Conditions</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceVariant} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalActionRow} onPress={() => {
                  const id = selectedFunctionId;
                  handleCloseActionModal();
                  if (id) handleOpenExecuteModal(id);
                }}>
                  <View style={[styles.modalActionIcon, { backgroundColor: 'rgba(129, 236, 255, 0.15)' }]}>
                    <Ionicons name="play-circle" size={20} color={Colors.tertiary} />
                  </View>
                  <Text style={styles.modalActionText}>Execute Function</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceVariant} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionButton, { marginTop: Spacing.xl }]} onPress={handleCloseActionModal}>
                  <Text style={styles.actionButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ΓòÉΓòÉΓòÉ Execute Confirmation Modal ΓòÉΓòÉΓòÉ */}
      <Modal
        visible={!!confirmExecuteId}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseExecuteModal}
      >
        <TouchableWithoutFeedback onPress={handleCloseExecuteModal}>
          <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { marginTop: 0, paddingBottom: Spacing.xl, borderRadius: Radii.xl, marginHorizontal: Spacing['2xl'] }]}>
                
                <View style={{ alignItems: 'center', marginBottom: Spacing.xl, paddingTop: Spacing.lg }}>
                  <View style={[styles.modalActionIcon, { backgroundColor: 'rgba(129, 236, 255, 0.15)', width: 64, height: 64, borderRadius: 32, marginBottom: Spacing.md }]}>
                    <Ionicons name="play" size={32} color={Colors.tertiary} />
                  </View>
                  <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Execute Function</Text>
                  <Text style={[styles.modalSubtitle, { textAlign: 'center', marginHorizontal: Spacing.xl, marginTop: Spacing.xs }]}>
                    Are you sure you want to manually trigger "{confirmExecuteObj?.name}"?
                  </Text>
                </View>

                {confirmExecuteObj?.parameters && confirmExecuteObj.parameters.length > 0 && (
                  <View style={{ marginBottom: Spacing.xl, width: '100%', paddingHorizontal: Spacing.xl }}>
                    <Text style={{ fontFamily: Typography.families.label, fontSize: 10, color: Colors.onSurfaceVariant, marginBottom: Spacing.sm, letterSpacing: 1 }}>REQUIRED PARAMETERS</Text>
                    {confirmExecuteObj.parameters.map((param: string) => (
                      <View key={param} style={{ marginBottom: Spacing.md }}>
                        <Text style={{ fontFamily: Typography.families.body, fontSize: Typography.sizes.bodySm, color: Colors.onSurface, marginBottom: 4 }}>{param}</Text>
                        <TextInput
                          style={[styles.textInput, { backgroundColor: Colors.surfaceContainerHighest, borderRadius: Radii.lg, padding: Spacing.md, color: Colors.onSurface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }]}
                          value={parameterValues[param] || ''}
                          onChangeText={(val) => setParameterValues(prev => ({ ...prev, [param]: val }))}
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          placeholder={`Enter ${param}...`}
                          autoCapitalize="none"
                        />
                      </View>
                    ))}
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl }}>
                  <TouchableOpacity 
                    style={[styles.actionButton, { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)' }]} 
                    onPress={handleCloseExecuteModal}
                  >
                    <Text style={styles.actionButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, { flex: 1, backgroundColor: Colors.tertiary }]} 
                    onPress={executeFunction}
                  >
                    <Text style={[styles.actionButtonText, { color: Colors.background }]}>Execute</Text>
                  </TouchableOpacity>
                </View>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ΓòÉΓòÉΓòÉ Custom Animated Toast ΓòÉΓòÉΓòÉ */}
      <Animated.View 
        style={[
          styles.toastContainer, 
          { 
            opacity: toastAnim, 
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] 
          }
        ]}
        pointerEvents="none"
      >
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <Ionicons name="checkmark-circle" size={24} color={Colors.tertiary} />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 140, // Ensure content isn't hidden by bottom nav
  },
  pullLoader: {
    paddingVertical: Spacing.lg,
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
  textInput: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
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
  neuralCoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing['3xl'],
    marginBottom: Spacing['2xl'],
  },
  neuralRing: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(129, 236, 255, 0.08)',
  },
  neuralRingOuter: {
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  neuralRingInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderColor: 'rgba(129, 236, 255, 0.15)',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 120, // Far enough to clear tab bar safely
    alignSelf: 'center',
    maxWidth: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(129, 236, 255, 0.4)',
    backgroundColor: 'rgba(14, 14, 16, 0.95)',
    gap: Spacing.sm,
    shadowColor: Colors.tertiary,
    shadowOpacity: 0.5,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
    zIndex: 9999,
    elevation: 20,
  },
  toastText: {
    flexShrink: 1,
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelLg,
    color: Colors.onSurface,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.md,
  },
  emptyTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.titleLg,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '80%',
  },
});
