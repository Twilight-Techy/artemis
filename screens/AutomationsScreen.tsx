import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Switch, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import TopNavBar from '../components/TopNavBar';
import { RootStackParamList } from '../navigation/AppNavigator';
import { artemisApi } from '../api/artemisClient';

const { width } = Dimensions.get('window');

export default function AutomationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [automations, setAutomations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchAutomations();
    }, [])
  );

  const fetchAutomations = async () => {
    setIsLoading(true);
    try {
      const data = await artemisApi.getAutomations();
      setAutomations(data);
    } catch (error) {
      console.warn('Failed to fetch automations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (id: string, currentValue: boolean) => {
    // Optimistic toggle
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, is_enabled: !currentValue } : a));
    try {
      await artemisApi.toggleAutomation(id);
    } catch (error) {
      console.warn('Failed to toggle automation:', error);
      // Revert optimistic
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, is_enabled: currentValue } : a));
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TopNavBar />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.headline}>Automations</Text>
          <Text style={styles.subtitle}>
            Orchestrate your environment with sentient logic and reactive triggers.
          </Text>
        </View>

        {/* Create New Automation CTA */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => navigation.navigate('AALEditor')}
            style={styles.ctaCard}
          >
            <View style={styles.ctaContentRow}>
              <View style={styles.ctaIconBox}>
                <MaterialIcons name="add-circle" size={32} color={Colors.primary} />
              </View>
              <View style={styles.ctaTextContainer}>
                <Text style={styles.ctaTitle}>Create New Automation</Text>
                <Text style={styles.ctaDesc}>Define custom triggers and intelligent responses.</Text>
              </View>
            </View>
            <View style={styles.ctaArrowRow}>
              <Text style={styles.ctaArrowText}>BEGIN WORKFLOW</Text>
              <MaterialIcons name="arrow-forward" size={16} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Active Automations Matrix */}
        <View style={styles.listContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          ) : (
            automations.map((auto) => {
              // We'll deterministically set icon and color based on ID length or just generic for now
              const isEco = auto.name.toLowerCase().includes('eco') || auto.name.toLowerCase().includes('cooling');
              const isSecurity = auto.name.toLowerCase().includes('guard') || auto.name.toLowerCase().includes('security');
              
              let color: string = Colors.tertiary;
              let iconName: string = 'auto-awesome';
              let tagLabel: string = 'AUTOMATION';
              let bg: string = 'rgba(129, 236, 255, 0.1)';

              if (isEco) {
                 color = Colors.primary;
                 iconName = 'eco';
                 tagLabel = 'EFFICIENCY';
                 bg = 'rgba(116, 177, 255, 0.1)';
              } else if (isSecurity) {
                 color = Colors.secondary;
                 iconName = 'security';
                 tagLabel = 'SECURITY';
                 bg = 'rgba(184, 132, 255, 0.1)';
              }

              return (
                <TouchableOpacity 
                  key={auto.id}
                  style={[styles.card, !auto.is_enabled ? { opacity: 0.7 } : {}]} 
                  activeOpacity={0.8} 
                  onLongPress={() => navigation.navigate('AALEditor', { mode: 'edit', automationId: auto.id })}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.tagContainer}>
                      <View style={[styles.iconWrapper, { backgroundColor: bg }]}>
                        <MaterialIcons name={iconName as any} size={16} color={color} />
                      </View>
                      <Text style={[styles.tagText, { color: color }]}>{tagLabel}</Text>
                    </View>
                    <Switch
                      trackColor={{ false: Colors.surfaceContainerHighest, true: color }}
                      thumbColor={Colors.onSurface}
                      ios_backgroundColor={Colors.surfaceContainerHighest}
                      onValueChange={() => handleToggle(auto.id, auto.is_enabled)}
                      value={auto.is_enabled}
                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                  </View>
                  <Text style={styles.cardTitle}>{auto.name}</Text>
                  
                  <View style={styles.ruleContainer}>
                    <View style={styles.ruleRow}>
                      <MaterialIcons name="schedule" size={16} color={Colors.onSurfaceVariant} />
                      <Text style={styles.ruleText}>WHEN <Text style={styles.ruleHighlight}>{auto.trigger}</Text></Text>
                    </View>
                    {auto.condition && auto.condition !== 'true' && (
                      <View style={styles.ruleRow}>
                        <MaterialIcons name="fact-check" size={16} color={Colors.onSurfaceVariant} />
                        <Text style={styles.ruleText}>IF <Text style={styles.ruleHighlight}>{auto.condition}</Text></Text>
                      </View>
                    )}
                    <View style={styles.ruleRow}>
                      <Ionicons name="flash-outline" size={16} color={Colors.onSurfaceVariant} />
                      <Text style={styles.ruleText}>THEN <Text style={styles.ruleHighlight}>{auto.action}</Text></Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
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
  orbBottomLeft: {
    bottom: '-10%',
    left: '-50%',
  },
  scrollContent: {
    paddingBottom: Spacing['5xl'] * 2,
  },
  headerSection: {
    paddingHorizontal: Spacing['2xl'],
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
  },
  headline: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.displaySm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    letterSpacing: -1,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.titleMd,
    color: Colors.onSurfaceVariant,
    lineHeight: 24,
  },
  ctaContainer: {
    paddingHorizontal: Spacing['2xl'],
    marginBottom: Spacing['3xl'],
  },
  ctaCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 32,
    padding: Spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(116, 177, 255, 0.3)',
  },
  ctaContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  ctaIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(116, 177, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTextContainer: {
    flex: 1,
  },
  ctaTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.headlineSm,
    fontWeight: Typography.weights.semibold,
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  ctaDesc: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurfaceVariant,
  },
  ctaArrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ctaArrowText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    letterSpacing: 1,
  },
  listContainer: {
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.lg,
  },
  card: {
    backgroundColor: 'rgba(38, 37, 41, 0.2)', // mirrors glass-panel with 20% opacity
    borderRadius: 32,
    padding: Spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    minHeight: 220,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrapper: {
    padding: 6,
    borderRadius: Radii.md,
  },
  tagText: {
    fontFamily: Typography.families.label,
    fontSize: 10,
    fontWeight: Typography.weights.black,
    letterSpacing: 2,
  },
  cardTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.titleLg,
    fontWeight: Typography.weights.medium,
    color: Colors.onSurface,
    marginBottom: Spacing.lg,
  },
  ruleContainer: {
    gap: Spacing.md,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ruleText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  ruleHighlight: {
    color: Colors.onSurface,
    fontWeight: Typography.weights.semibold,
  },
  deactivatedText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelXs,
    fontWeight: Typography.weights.bold,
    color: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: 2,
    fontStyle: 'italic',
    marginTop: Spacing.xl,
  },
});
