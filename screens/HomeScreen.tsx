import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import TopNavBar from '../components/TopNavBar';
import OrbEntity from '../components/OrbEntity';
import StatChip from '../components/StatChip';
import QuickActionCard from '../components/QuickActionCard';
import CommandBar from '../components/CommandBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ═══ Top App Bar ═══ */}
      <TopNavBar />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ Central Orb Section ═══ */}
        <View style={styles.orbSection}>
          {/* Atmospheric background glow */}
          <View style={styles.atmosphericGlow} />

          <OrbEntity />

          {/* Floating stat chips */}
          <View style={styles.climateChip}>
            <StatChip
              icon="thermometer-outline"
              iconColor={Colors.secondary}
              label="CLIMATE"
              value="72°F"
            />
          </View>
          <View style={styles.powerChip}>
            <StatChip
              icon="flash"
              iconColor={Colors.tertiary}
              label="POWER"
              value="2.4kW"
            />
          </View>
        </View>

        {/* ═══ Greeting Section ═══ */}
        <View style={styles.greetingSection}>
          <View style={styles.headlineRow}>
            <Text style={styles.headline}>Good Evening, </Text>
            <Text style={styles.headlineGradient}>Alex</Text>
          </View>
        </View>

        {/* ═══ Quick Action Cards ═══ */}
        <View style={styles.cardsSection}>
          <QuickActionCard
            icon="bulb-outline"
            iconColor={Colors.primary}
            title="Lights"
            onPress={() => console.log('Lights tapped')}
          />
          <QuickActionCard
            icon="thermometer-outline"
            iconColor={Colors.secondary}
            title="Climate"
            onPress={() => console.log('Climate tapped')}
          />
          <QuickActionCard
            icon="lock-closed-outline"
            iconColor={Colors.tertiary}
            title="Security"
            onPress={() => console.log('Security tapped')}
          />
        </View>

        {/* ═══ Command Input Bar ═══ */}
        <View style={styles.commandSection}>
          <CommandBar />
        </View>

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing['2xl'],
  },


  // ── Greeting ──
  greetingSection: {
    marginBottom: Spacing['3xl'],
    alignItems: 'center',
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  headline: {
    fontFamily: Typography.families.headline,
    fontSize: 32,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  headlineGradient: {
    fontFamily: Typography.families.headline,
    fontSize: 32,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    letterSpacing: -0.5,
  },

  // ── Orb Section ──
  orbSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    marginBottom: Spacing['3xl'],
    position: 'relative',
  },
  atmosphericGlow: {
    position: 'absolute',
    top: -40,
    right: -60,
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: SCREEN_WIDTH * 0.35,
    backgroundColor: 'rgba(116, 177, 255, 0.06)',
  },
  climateChip: {
    position: 'absolute',
    left: 0,
    top: 40,
  },
  powerChip: {
    position: 'absolute',
    right: 0,
    bottom: 30,
  },

  // ── Cards ──
  cardsSection: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing['3xl'],
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },

  // ── Command ──
  commandSection: {
    marginBottom: Spacing['3xl'],
  },
});
