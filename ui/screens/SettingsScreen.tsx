import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Switch,
  Platform,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import { useNetwork } from '../contexts/NetworkContext';
import { useAuth } from '../contexts/AuthContext';

type SettingsItem = {
  icon: string;
  iconLib: 'ionicons' | 'material';
  label: string;
  subtitle: string;
  color: string;
  glowColor: string;
  type: 'navigate' | 'toggle';
  target?: string;
  defaultValue?: boolean;
};

const SECTIONS: { title: string; items: SettingsItem[] }[] = [
  {
    title: 'Account',
    items: [
      {
        icon: 'person-outline',
        iconLib: 'ionicons',
        label: 'Personal Information',
        subtitle: 'Manage your profile and ID',
        color: Colors.primary,
        glowColor: 'rgba(116, 177, 255, 0.15)',
        type: 'navigate',
        target: 'ProfileSettings',
      },
      {
        icon: 'cloud-done-outline',
        iconLib: 'ionicons',
        label: 'Cloud Sync',
        subtitle: 'Keep data updated across devices',
        color: Colors.secondary,
        glowColor: 'rgba(184, 132, 255, 0.15)',
        type: 'toggle',
        defaultValue: true,
      },
    ],
  },
  {
    title: 'System Configuration',
    items: [
      {
        icon: 'color-palette-outline',
        iconLib: 'ionicons',
        label: 'Interface Theme',
        subtitle: 'Dark obsidian is currently active',
        color: Colors.tertiary,
        glowColor: 'rgba(129, 236, 255, 0.15)',
        type: 'navigate',
        target: 'ThemeSettings',
      },
      {
        icon: 'notifications-outline',
        iconLib: 'ionicons',
        label: 'Critical Alerts',
        subtitle: 'Immediate haptic feedback',
        color: Colors.error,
        glowColor: 'rgba(255, 113, 108, 0.15)',
        type: 'toggle',
        defaultValue: true,
      },
    ],
  },
  {
    title: 'Privacy & Security',
    items: [
      {
        icon: 'lock-closed-outline',
        iconLib: 'ionicons',
        label: 'Biometric Lock',
        subtitle: 'Face ID and Fingerprint enabled',
        color: Colors.primary,
        glowColor: 'rgba(116, 177, 255, 0.15)',
        type: 'navigate',
        target: 'SecuritySettings',
      },
      {
        icon: 'eye-off-outline',
        iconLib: 'ionicons',
        label: 'Ghost Mode',
        subtitle: 'Mask location and presence',
        color: Colors.onSurface,
        glowColor: 'rgba(255, 255, 255, 0.05)',
        type: 'toggle',
        defaultValue: false,
      },
    ],
  },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isOffline, toggleOfflineSimulation } = useNetwork();
  const { logout } = useAuth();
  
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    SECTIONS.forEach(section =>
      section.items.forEach(item => {
        if (item.type === 'toggle') {
          initial[item.label] = item.defaultValue ?? false;
        }
      }),
    );
    return initial;
  });

  const handleToggle = (label: string) => {
    setToggleStates(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const [pitchValue, setPitchValue] = useState(0.6); // 0 to 1
  const pitchValueRef = React.useRef(0.6);
  const startPitchRef = React.useRef(0.6);
  const trackWidthRef = React.useRef(1);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // We do NOT snap to locationX, we just lock the current reference
        startPitchRef.current = pitchValueRef.current;
      },
      onPanResponderMove: (evt, gestureState) => {
        // Smooth scaling entirely via delta X from screen touch
        const deltaPercentage = gestureState.dx / trackWidthRef.current;
        const newValue = Math.min(Math.max(startPitchRef.current + deltaPercentage, 0), 1);
        setPitchValue(newValue);
        pitchValueRef.current = newValue;
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // Determine label based on pitch
  let pitchLabel = 'Optimal';
  let pitchColor: string = Colors.secondary;
  if (pitchValue < 0.3) {
    pitchLabel = 'Deep / Bass';
    pitchColor = Colors.primary;
  } else if (pitchValue > 0.7) {
    pitchLabel = 'High / Crisp';
    pitchColor = Colors.tertiary;
  }

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
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ Setting Sections ═══ */}
        {SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCards}>
              {section.items.map(item => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.settingRow}
                  activeOpacity={item.type === 'navigate' ? 0.7 : 1}
                  onPress={item.type === 'navigate' && item.target ? () => (navigation as any).navigate(item.target) : undefined}
                >
                  <View style={styles.settingRowLeft}>
                    <View
                      style={[
                        styles.iconBox,
                        { backgroundColor: item.glowColor },
                      ]}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color={item.color}
                      />
                    </View>
                    <View style={styles.settingTextGroup}>
                      <Text style={styles.settingLabel}>{item.label}</Text>
                      <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                    </View>
                  </View>
                  {item.type === 'navigate' ? (
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="rgba(255,255,255,0.15)"
                    />
                  ) : (
                    <Switch
                      value={toggleStates[item.label]}
                      onValueChange={() => handleToggle(item.label)}
                      trackColor={{
                        false: Colors.surfaceContainerHighest,
                        true: item.color,
                      }}
                      thumbColor={Colors.onSurface}
                      ios_backgroundColor={Colors.surfaceContainerHighest}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* ═══ Voice & Language Section ═══ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice & Language</Text>
          <View style={styles.voiceCard}>
            {/* Persona Header */}
            <View style={styles.personaHeader}>
              <View style={styles.personaLeft}>
                <LinearGradient
                  colors={[Colors.secondary, Colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.personaOrbOuter}
                >
                  <View style={styles.personaOrbInner}>
                    <Ionicons name="mic" size={20} color={Colors.secondary} />
                  </View>
                </LinearGradient>
                <View style={{ flex: 1, paddingRight: Spacing.md }}>
                  <Text style={styles.personaName}>AI Persona: Artemis</Text>
                  <Text style={styles.personaStyle} numberOfLines={1} ellipsizeMode="tail">Balanced & Professional</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.changeButton} activeOpacity={0.7} onPress={() => (navigation as any).navigate('PersonaSettings')}>
                <Text style={styles.changeButtonText}>CHANGE</Text>
              </TouchableOpacity>
            </View>

            {/* Voice Pitch Slider */}
            <View style={styles.sliderSection}>
              <View style={styles.sliderLabelRow}>
                <Text style={styles.sliderLabel}>Voice Pitch</Text>
                <Text style={[styles.sliderLabel, { color: pitchColor }]}>
                  {pitchLabel}
                </Text>
              </View>
              <View 
                style={styles.sliderTrack} 
                onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width || 1; }}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={[Colors.primary, Colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.sliderFill, { width: `${pitchValue * 100}%` }]}
                />
                <View 
                  pointerEvents="none"
                  style={[
                    styles.sliderThumb, 
                    { left: `${pitchValue * 100}%`, transform: [{ translateX: -8 }] }
                  ]} 
                />
                {/* Touch Overlay */}
                <View 
                  style={{ position: 'absolute', top: -20, bottom: -20, left: 0, right: 0 }}
                  {...panResponder.panHandlers}
                />
              </View>
            </View>

            {/* Language */}
            <View style={styles.languageRow}>
              <View style={styles.languageLeft}>
                <Ionicons name="globe-outline" size={20} color={Colors.tertiary} />
                <Text style={styles.languageText}>Global Communication</Text>
              </View>
              <Text style={styles.languageValue}>English (US)</Text>
            </View>
          </View>
        </View>

        {/* ═══ Developer Diagnostics ═══ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer Diagnostics</Text>
          <View style={styles.sectionCards}>
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={1}
            >
              <View style={styles.settingRowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 113, 108, 0.15)' }]}>
                  <Ionicons name="wifi-outline" size={20} color={Colors.error} />
                </View>
                <View style={styles.settingTextGroup}>
                  <Text style={styles.settingLabel}>Simulate Offline Mode</Text>
                  <Text style={styles.settingSubtitle}>Force Local-Only Hardware Fallback</Text>
                </View>
              </View>
              <Switch
                value={isOffline}
                onValueChange={toggleOfflineSimulation}
                trackColor={{ false: Colors.surfaceContainerHighest, true: Colors.error }}
                thumbColor={Colors.onSurface}
                ios_backgroundColor={Colors.surfaceContainerHighest}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom spacer */}
        <View style={{ marginBottom: Spacing['4xl'] }}>
          <TouchableOpacity 
            style={[styles.saveBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.error }]} 
            activeOpacity={0.7}
            onPress={logout}
          >
            <Text style={[styles.saveBtnText, { color: Colors.error }]}>DISCONNECT (LOGOUT)</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.md,
  },
  section: {
    marginBottom: Spacing['3xl'],
  },
  sectionTitle: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  sectionCards: {
    gap: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(38, 37, 41, 0.2)',
    borderRadius: Radii.lg,
    padding: Spacing.xl,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTextGroup: {
    flex: 1,
  },
  settingLabel: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    fontWeight: Typography.weights.semibold,
    color: Colors.onSurface,
  },
  settingSubtitle: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.labelSm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  voiceCard: {
    backgroundColor: 'rgba(38, 37, 41, 0.2)',
    borderRadius: Radii.xl,
    padding: Spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.1)',
  },
  personaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing['3xl'],
  },
  personaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    flex: 1,
  },
  personaOrbOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    padding: 2,
  },
  personaOrbInner: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personaName: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
  },
  personaStyle: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodySm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  changeButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(116, 177, 255, 0.2)',
  },
  changeButtonText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    shadowColor: Colors.primary,
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
  sliderSection: {
    marginBottom: Spacing['2xl'],
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sliderLabel: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.full,
    position: 'relative',
  },
  sliderFill: {
    height: 4,
    borderRadius: Radii.full,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.onSurface,
    borderWidth: 2,
    borderColor: Colors.secondary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  languageText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    fontWeight: Typography.weights.medium,
    color: Colors.onSurface,
  },
  languageValue: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    color: Colors.onSurfaceVariant,
  },
});
