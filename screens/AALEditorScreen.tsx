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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { artemisApi } from '../api/artemisClient';

type AALEditorRouteParams = {
  AALEditor: {
    mode?: 'add' | 'edit';
    automationId?: string;
  };
};

export default function AALEditorScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<AALEditorRouteParams, 'AALEditor'>>();

  const { mode = 'add', automationId } = route.params || {};
  const isEdit = mode === 'edit';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logicAAL, setLogicAAL] = useState('WHEN \nIF \nTHEN ');
  const [requireApproval, setRequireApproval] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  React.useEffect(() => {
    if (isEdit && automationId) {
      const fetchAuto = async () => {
        try {
          const autos = await artemisApi.getAutomations();
          const target = autos.find((a: any) => a.id === automationId);
          if (target) {
            setName(target.name);
            setRequireApproval(target.action?.indexOf('silently ') === -1);
            let reconstructed = `WHEN ${target.trigger}`;
            if (target.condition && target.condition !== 'true') reconstructed += `\nIF ${target.condition}`;
            reconstructed += `\nTHEN ${target.action}`;
            if (target.fallback) reconstructed += `\nELSE ${target.fallback}`;
            setLogicAAL(reconstructed);
          }
        } catch (e) {
          console.warn('Failed to fetch automation', e);
        }
      };
      fetchAuto();
    }
  }, [isEdit, automationId]);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setIsLoading(true);
    try {
      let payload: any = {
        name: name.trim(),
        is_enabled: true,
      };

      const parsed = await artemisApi.parseAALText(logicAAL);
      let actionStr = parsed.action || 'silently do nothing';

      if (!requireApproval && !actionStr.toLowerCase().startsWith('silently')) {
           actionStr = 'silently ' + actionStr;
      }

      payload.automation_type = 'aal';
      payload.trigger = parsed.trigger || 'manual';
      payload.condition = parsed.condition;
      payload.action = actionStr;
      payload.fallback = parsed.fallback;

      if (isEdit && automationId) {
        await artemisApi.updateAutomation(automationId, payload);
      } else {
        await artemisApi.createAutomation(payload);
      }
      navigation.goBack();
    } catch (e) {
      console.warn('Failed to save automation', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAAL = async () => {
    if (!description.trim()) return;
    setIsGenerating(true);
    try {
      const parsed = await artemisApi.parseAALText(description);
      let reconstructed = `WHEN ${parsed.trigger}`;
      if (parsed.condition && parsed.condition !== 'true') reconstructed += `\nIF ${parsed.condition}`;
      reconstructed += `\nTHEN ${parsed.action}`;
      if (parsed.fallback) reconstructed += `\nELSE ${parsed.fallback}`;
      setLogicAAL(reconstructed);
    } catch (e) {
      console.warn('Failed to generate AAL from description', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async () => {
     if (!automationId) return;
     setIsLoading(true);
     try {
       await artemisApi.deleteAutomation(automationId);
       navigation.goBack();
     } catch (e) {
       console.warn('Failed to delete', e);
     } finally {
       setIsLoading(false);
     }
  };

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
              
              <TouchableOpacity 
                style={styles.generateBtn} 
                activeOpacity={0.8} 
                onPress={handleGenerateAAL} 
                disabled={isGenerating || !description.trim()}
              >
                <Ionicons name="sparkles" size={16} color={Colors.primary} />
                <Text style={styles.generateBtnText}>{isGenerating ? 'GENERATING...' : 'GENERATE AAL LOGIC'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ═══ Execution Engine ═══ */}
          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Ionicons name="hardware-chip-outline" size={20} color={Colors.primaryDim} />
              <Text style={styles.sectionHeading}>Execution Engine</Text>
            </View>

            <View style={styles.card}>
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
            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8} onPress={handleSave} disabled={isLoading}>
              <Ionicons name="save-outline" size={20} color={Colors.onPrimary} />
              <Text style={styles.saveBtnText}>{isEdit ? 'SAVE AUTOMATION' : 'CREATE AUTOMATION'}</Text>
            </TouchableOpacity>

            {isEdit && (
              <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.8} onPress={handleDelete} disabled={isLoading}>
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
                <Text style={styles.deleteBtnText}>DELETE AUTOMATION</Text>
              </TouchableOpacity>
            )}
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
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.full,
    paddingVertical: Spacing.lg + 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.2)',
    marginTop: Spacing.md,
  },
  deleteBtnText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelMd,
    fontWeight: Typography.weights.bold,
    color: Colors.error,
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
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(116, 177, 255, 0.1)',
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(116, 177, 255, 0.25)',
  },
  generateBtnText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelLg,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    letterSpacing: 1,
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
