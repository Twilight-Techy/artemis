import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  Animated,
  Easing,
  Platform,
  Dimensions,
} from 'react-native';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import TopNavBar from '../components/TopNavBar';
import OrbEntity, { OrbState } from '../components/OrbEntity';
import StatChip from '../components/StatChip';
import QuickActionCard from '../components/QuickActionCard';
import CommandBar from '../components/CommandBar';
import ChatBubble, { ChatMessage } from '../components/chat/ChatBubble';
import MCPActionModal from '../components/MCPActionModal';
import { useNetwork } from '../contexts/NetworkContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { artemisApi } from '../api/artemisClient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type HomeMode = 'dashboard' | 'chat';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isOffline } = useNetwork();
  const [mode, setMode] = useState<HomeMode>('dashboard');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showMCPModal, setShowMCPModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [isSending, setIsSending] = useState(false);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await artemisApi.getChatHistory();
        if (data.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error("Failed to load history:", err);
      }
    };
    loadHistory();
  }, []);

  const handleMicPressIn = async () => {
    try {
      setOrbState('listening');
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (status.granted) {
        audioRecorder.record();
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      setOrbState('idle');
    }
  };

  const handleMicPressOut = async () => {
    setOrbState('processing');
    
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      
      if (uri) {
        const { transcript } = await artemisApi.transcribeAudio(uri);
        if (transcript) {
          handleSendMessage(transcript);
        } else {
          setOrbState('idle');
        }
      } else {
        setOrbState('idle');
      }
    } catch (err) {
      console.error('Failed to stop recording or transcribe', err);
      setOrbState('idle');
    }
  };

  const handleExecuteLogic = async () => {
    if (!pendingAction) return;

    setShowMCPModal(false);
    setMode('chat');
    
    try {
      const response = await artemisApi.approveAction(pendingAction.action_id);
      
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [
        ...prev, 
        {
          id: Date.now().toString() + '_sys',
          role: 'system',
          text: `Action Completed: ${pendingAction.target_name} -> ${pendingAction.payload?.action || 'auto'}`,
          timestamp
        }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setPendingAction(null);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 250);
    }
  };

  const declineAction = async () => {
    if (!pendingAction) return;
    setShowMCPModal(false);
    
    try {
      await artemisApi.declineAction(pendingAction.action_id);
    } catch (err) {
      console.error(err);
    } finally {
      setPendingAction(null);
    }
  };

  const handleSendMessage = async (text: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString() + '_u', role: 'user', text, timestamp }
    ]);
    
    // Switch to chat mode automatically upon message
    setMode('chat');
    setIsSending(true);
    
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await artemisApi.chat(text);
      
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString() + '_a', role: 'assistant', text: response.reply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
      
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

      if (response.requires_approval && response.proactive_action) {
        setPendingAction(response.proactive_action);
        setShowMCPModal(true);
      }
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString() + '_e', role: 'system', text: "Error connecting to Artemis MCP Core.", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const keyboardShift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardShift, {
        toValue: -e.endCoordinates.height,
        duration: e.duration || 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardShift, {
        toValue: 0,
        duration: e.duration || 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardShift]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ═══ Top App Bar ═══ */}
      <TopNavBar />

      <Animated.View
        style={[styles.keyboardAvoidingContainer, { transform: [{ translateY: keyboardShift }] }]}
      >
        {/* ═══ Orb Section (always visible) ═══ */}
        <View style={styles.orbSection}>
          {isOffline && (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={12} color={Colors.error} />
              <Text style={styles.offlineText}>OFFLINE: LOCAL PERSISTENCE MODE</Text>
            </View>
          )}
          <View style={styles.atmosphericGlow} />
          <TouchableOpacity activeOpacity={0.9} onPress={() => setShowMCPModal(true)}>
            <OrbEntity state={orbState} />
          </TouchableOpacity>
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

        {/* ═══ Mode Toggle ═══ */}
        <View style={styles.toggleBar}>
          <View style={styles.togglePill}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setMode('dashboard')}
              style={styles.toggleOption}
            >
              {mode === 'dashboard' ? (
                <LinearGradient
                  colors={['rgba(116, 177, 255, 0.15)', 'rgba(116, 177, 255, 0.05)']}
                  style={styles.toggleGradient}
                >
                  <Ionicons name="grid" size={14} color={Colors.primary} />
                  <Text style={[styles.toggleText, styles.toggleTextActive]}>Dashboard</Text>
                </LinearGradient>
              ) : (
                <View style={styles.toggleInner}>
                  <Ionicons name="grid-outline" size={14} color="rgba(255,255,255,0.35)" />
                  <Text style={styles.toggleText}>Dashboard</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setMode('chat')}
              style={styles.toggleOption}
            >
              {mode === 'chat' ? (
                <LinearGradient
                  colors={['rgba(116, 177, 255, 0.15)', 'rgba(116, 177, 255, 0.05)']}
                  style={styles.toggleGradient}
                >
                  <Ionicons name="chatbubbles" size={14} color={Colors.primary} />
                  <Text style={[styles.toggleText, styles.toggleTextActive]}>Chat</Text>
                </LinearGradient>
              ) : (
                <View style={styles.toggleInner}>
                  <Ionicons name="chatbubbles-outline" size={14} color="rgba(255,255,255,0.35)" />
                  <Text style={styles.toggleText}>Chat</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══ Middle Content (switches based on mode) ═══ */}
        <View style={styles.middleContent}>
          {mode === 'dashboard' ? (
            <ScrollView
              contentContainerStyle={styles.dashboardContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Greeting */}
              <View style={styles.greetingSection}>
                <View style={styles.headlineRow}>
                  <Text style={styles.headline}>Good Evening, </Text>
                  <Text style={styles.headlineGradient}>Alex</Text>
                </View>
              </View>

              {/* Quick Action Cards */}
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
            </ScrollView>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ChatBubble message={item} />}
              contentContainerStyle={[styles.chatContent, messages.length === 0 && { flex: 1, justifyContent: 'center' }]}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
                  <Ionicons name="chatbubble-ellipses-outline" size={48} color="rgba(116, 177, 255, 0.3)" />
                  <Text style={{ fontFamily: Typography.families.headline, fontSize: Typography.sizes.headlineSm, color: Colors.onSurfaceVariant, marginTop: 16, textAlign: 'center' }}>
                    No conversation yet
                  </Text>
                  <Text style={{ fontFamily: Typography.families.body, fontSize: Typography.sizes.bodySm, color: 'rgba(255,255,255,0.35)', marginTop: 8, textAlign: 'center' }}>
                    Tap the mic or type a message to begin speaking with Artemis.
                  </Text>
                </View>
              }
            />
          )}

          {/* ═══ Floating Command Input Bar ═══ */}
          <View style={{ 
            paddingHorizontal: 24, 
            paddingTop: 16, 
            paddingBottom: mode === 'dashboard' ? Math.max(insets.bottom + 90, 110) : Math.max(insets.bottom + 64, 80) 
          }}>
            <CommandBar 
              onSend={handleSendMessage} 
              isSending={isSending} 
              isListening={orbState === 'listening'}
              onMicPressIn={handleMicPressIn}
              onMicPressOut={handleMicPressOut}
            />
          </View>
        </View>
      </Animated.View>

      {/* ═══ MCP Proactive Overlay Modal ═══ */}
      <MCPActionModal 
        visible={showMCPModal} 
        onClose={declineAction}
        onExecute={handleExecuteLogic}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },

  // ── Orb (always visible) ──
  orbSection: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 220,
  },
  offlineBanner: {
    position: 'absolute',
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 113, 108, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 113, 108, 0.3)',
    zIndex: 20,
  },
  offlineText: {
    fontFamily: Typography.families.headline,
    fontSize: 9,
    fontWeight: Typography.weights.bold,
    color: Colors.error,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  atmosphericGlow: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    borderRadius: SCREEN_WIDTH * 0.3,
    backgroundColor: 'rgba(116, 177, 255, 0.06)',
  },
  climateChip: {
    position: 'absolute',
    left: Spacing['2xl'],
    top: 20,
  },
  powerChip: {
    position: 'absolute',
    right: Spacing['2xl'],
    bottom: 15,
  },

  // ── Mode Toggle ──
  toggleBar: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing.md,
    alignItems: 'center',
  },
  togglePill: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.full,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  toggleOption: {
    borderRadius: Radii.full,
    overflow: 'hidden',
  },
  toggleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.full,
  },
  toggleInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  toggleText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.bold,
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  toggleTextActive: {
    color: Colors.primary,
  },

  // ── Middle Content (flex: 1 fills remaining space) ──
  middleContent: {
    flex: 1,
  },

  // ── Dashboard content ──
  dashboardContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing.lg,
    justifyContent: 'center',
  },
  greetingSection: {
    marginBottom: Spacing['2xl'],
    alignItems: 'center',
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontFamily: Typography.families.headline,
    fontSize: 28,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  headlineGradient: {
    fontFamily: Typography.families.headline,
    fontSize: 28,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    letterSpacing: -0.5,
  },

  cardsSection: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },

  // ── Chat content ──
  chatContent: {
    paddingBottom: Spacing.md,
    paddingTop: Spacing.sm,
  },
  chatRoot: {
    flex: 1,
    justifyContent: 'space-between',
  },
});
