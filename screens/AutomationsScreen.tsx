import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Switch, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import TopNavBar from '../components/TopNavBar';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width } = Dimensions.get('window');

export default function AutomationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Local state for our mock toggles
  const [activeAmbiance, setActiveAmbiance] = useState(true);
  const [activeGuard, setActiveGuard] = useState(true);
  const [activeEco, setActiveEco] = useState(false);

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

          {/* Automation Card 1: Evening Ambiance */}
          <TouchableOpacity style={styles.card} activeOpacity={0.8} onLongPress={() => navigation.navigate('AALEditor')}>
            <View style={styles.cardHeader}>
              <View style={styles.tagContainer}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(129, 236, 255, 0.1)' }]}>
                  <MaterialIcons name="wb-twilight" size={16} color={Colors.tertiary} />
                </View>
                <Text style={[styles.tagText, { color: Colors.tertiary }]}>ENVIRONMENTAL</Text>
              </View>
              <Switch
                trackColor={{ false: Colors.surfaceContainerHighest, true: Colors.tertiary }}
                thumbColor={Colors.onSurface}
                ios_backgroundColor={Colors.surfaceContainerHighest}
                onValueChange={setActiveAmbiance}
                value={activeAmbiance}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
            <Text style={styles.cardTitle}>Evening Ambiance</Text>
            
            <View style={styles.ruleContainer}>
              <View style={styles.ruleRow}>
                <MaterialIcons name="schedule" size={16} color={Colors.onSurfaceVariant} />
                <Text style={styles.ruleText}>IF <Text style={styles.ruleHighlight}>Sunset</Text></Text>
              </View>
              <View style={styles.ruleRow}>
                <Ionicons name="bulb-outline" size={16} color={Colors.onSurfaceVariant} />
                <Text style={styles.ruleText}>THEN <Text style={styles.ruleHighlight}>Dim lights to 20% & Play Lo-Fi</Text></Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Automation Card 2: Night Guard */}
          <TouchableOpacity style={styles.card} activeOpacity={0.8} onLongPress={() => navigation.navigate('AALEditor')}>
            <View style={styles.cardHeader}>
              <View style={styles.tagContainer}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(184, 132, 255, 0.1)' }]}>
                  <MaterialIcons name="security" size={16} color={Colors.secondary} />
                </View>
                <Text style={[styles.tagText, { color: Colors.secondary }]}>SECURITY</Text>
              </View>
              <Switch
                trackColor={{ false: Colors.surfaceContainerHighest, true: Colors.secondary }}
                thumbColor={Colors.onSurface}
                ios_backgroundColor={Colors.surfaceContainerHighest}
                onValueChange={setActiveGuard}
                value={activeGuard}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
            <Text style={styles.cardTitle}>Night Guard</Text>
            
            <View style={styles.ruleContainer}>
              <View style={styles.ruleRow}>
                <MaterialCommunityIcons name="door-open" size={16} color={Colors.onSurfaceVariant} />
                <Text style={styles.ruleText}>IF <Text style={styles.ruleHighlight}>External Motion</Text> (22:00-06:00)</Text>
              </View>
              <View style={styles.ruleRow}>
                <MaterialIcons name="notifications-active" size={16} color={Colors.onSurfaceVariant} />
                <Text style={styles.ruleText}>THEN <Text style={styles.ruleHighlight}>Activate Perimeter & Notify Admin</Text></Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Automation Card 3: Smart Thermal Optima */}
          <TouchableOpacity style={[styles.card, activeEco ? {} : { opacity: 0.7 }]} activeOpacity={0.8} onLongPress={() => navigation.navigate('AALEditor')}>
            <View style={styles.cardHeader}>
              <View style={styles.tagContainer}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(116, 177, 255, 0.1)' }]}>
                  <MaterialIcons name="eco" size={16} color={Colors.primary} />
                </View>
                <Text style={[styles.tagText, { color: Colors.primary }]}>EFFICIENCY</Text>
              </View>
              <Switch
                trackColor={{ false: Colors.surfaceContainerHighest, true: Colors.primary }}
                thumbColor={Colors.onSurface}
                ios_backgroundColor={Colors.surfaceContainerHighest}
                onValueChange={setActiveEco}
                value={activeEco}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
            <Text style={styles.cardTitle}>Smart Thermal Optima</Text>
            
            <View style={styles.ruleContainer}>
              <View style={styles.ruleRow}>
                <MaterialIcons name="person" size={16} color={Colors.onSurfaceVariant} />
                <Text style={styles.ruleText}>IF <Text style={styles.ruleHighlight}>Room Unoccupied</Text> ({'>'}30m)</Text>
              </View>
              <View style={styles.ruleRow}>
                <MaterialCommunityIcons name="thermostat" size={16} color={Colors.onSurfaceVariant} />
                <Text style={styles.ruleText}>THEN <Text style={styles.ruleHighlight}>Eco-Mode HVAC (-4°)</Text></Text>
              </View>
            </View>
            
            {!activeEco && (
              <Text style={styles.deactivatedText}>DEACTIVATED 2 DAYS AGO</Text>
            )}
          </TouchableOpacity>

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
