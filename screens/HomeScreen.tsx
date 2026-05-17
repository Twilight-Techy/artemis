import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  Animated,
  Easing,
  Platform,
  Dimensions,
  DeviceEventEmitter,
} from 'react-native';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import TopNavBar from '../components/TopNavBar';
import OrbEntity, { OrbState } from '../components/OrbEntity';
import StatChip from '../components/StatChip';
import QuickActionCard from '../components/QuickActionCard';
import CommandBar from '../components/CommandBar';
import ChatBubble, { ChatMessage } from '../components/chat/ChatBubble';
import TypingIndicator from '../components/chat/TypingIndicator';
import { ArtemisPullLoader } from '../components/ArtemisPullLoader';
import ConfirmModal from '../components/ConfirmModal';
import { useNetwork } from '../contexts/NetworkContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { artemisApi } from '../api/artemisClient';
import { useMCP } from '../contexts/MCPContext';
import { useProfile } from '../contexts/ProfileContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type HomeMode = 'dashboard' | 'chat';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isOffline } = useNetwork();
  const { displayName } = useProfile();
  const [mode, setMode] = useState<HomeMode>('dashboard');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showClearModal, setShowClearModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshingChat, setIsRefreshingChat] = useState(false);
  const [isRefreshingDashboard, setIsRefreshingDashboard] = useState(false);
  const chatHasLoaded = useRef(false);
  const refreshAvatarRef = useRef<(() => Promise<void>) | null>(null);
  const { setPendingAction, setShowMCPModal } = useMCP();
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const isRecordingRef = useRef(false);

  const loadChatHistory = useCallback(async () => {
    try {
      const data = await artemisApi.getChatHistory();
      if (data.messages) {
        setMessages(data.messages);
      }
      chatHasLoaded.current = true;
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!chatHasLoaded.current) {
        loadChatHistory();
      }
    }, [loadChatHistory])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('mcp_action_executed', () => {
      setMode('chat');
      loadChatHistory();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 250);
    });
    return () => sub.remove();
  }, [loadChatHistory]);

  const handleChatRefresh = useCallback(async () => {
    setIsRefreshingChat(true);
    await loadChatHistory();
    setIsRefreshingChat(false);
  }, [loadChatHistory]);

  const handleDashboardRefresh = useCallback(async () => {
    setIsRefreshingDashboard(true);
    await refreshAvatarRef.current?.();
    setIsRefreshingDashboard(false);
  }, []);

  const handleMicPressIn = async () => {
    try {
      setOrbState('listening');
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (status.granted) {
        await audioRecorder.record();
        isRecordingRef.current = true;
      } else {
        console.warn('Microphone permission denied.');
        setOrbState('idle');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      setOrbState('idle');
    }
  };

  const handleMicPressOut = async () => {
    // Guard: only stop if recording actually started (i.e. permission was granted)
    if (!isRecordingRef.current) {
      setOrbState('idle');
      return;
    }

    setOrbState('processing');
    isRecordingRef.current = false;

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

  const handleSendMessage = async (text: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString() + '_u', role: 'user', text, timestamp }
    ]);
    
    // Switch to chat mode automatically upon message
    setMode('chat');
    setIsSending(true);
    setOrbState('processing');
    
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await artemisApi.chat(text);
      const replyTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (response.requires_approval && response.proactive_action) {
        // Action pending approval: the reasoning question lives in the modal, not in chat.
        setPendingAction({
          ...response.proactive_action,
          reasoning: response.reply, // pass the AI's question to the modal
        });
        setShowMCPModal(true);
      } else if (response.reply) {
        // Normal assistant reply — render as a chat bubble.
        setMessages(prev => [
          ...prev,
          { id: Date.now().toString() + '_a', role: 'assistant', text: response.reply, timestamp: replyTimestamp },
        ]);
      }

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString() + '_e', role: 'system', text: "Error connecting to Artemis MCP Core.", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);
    } finally {
      setIsSending(false);
      setOrbState('idle');
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning, ';
    if (hour < 18) return 'Good Afternoon, ';
    return 'Good Evening, ';
  };

  // ── Clear Chat ─────────────────────────────────────────────────────────────
  const handleClearChat = useCallback(() => {
    setShowClearModal(true);
  }, []);

  const confirmClearChat = useCallback(async () => {
    setShowClearModal(false);
    try {
      await artemisApi.clearChatHistory();
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear chat history', err);
    }
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ═══ Top App Bar ═══ */}
      <TopNavBar onRefreshReady={(fn) => { refreshAvatarRef.current = fn; }} />

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
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <OrbEntity state={orbState} />
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

          {/* Clear chat button — only visible in Chat mode */}
          {mode === 'chat' && messages.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClearChat}
              style={styles.clearChatBtn}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>

        {/* ═══ Middle Content (switches based on mode) ═══ */}
        <View style={styles.middleContent}>
          {mode === 'dashboard' ? (
            <ScrollView
              contentContainerStyle={styles.dashboardContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshingDashboard}
                  onRefresh={handleDashboardRefresh}
                  // Fully hide the native spinner — ArtemisPullLoader provides the visual
                  tintColor="transparent"
                  colors={['transparent']}
                  progressBackgroundColor="transparent"
                  progressViewOffset={-100}
                />
              }
            >
              {isRefreshingDashboard && (
                <ArtemisPullLoader size={10} label="Refreshing profile…" style={{ marginBottom: 8 }} />
              )}
              {/* Greeting */}
              <View style={styles.greetingSection}>
                <View style={styles.headlineRow}>
                  <Text style={styles.headline}>{getGreeting()}</Text>
                  <Text style={styles.headlineGradient}>{displayName || 'User'}</Text>
                </View>
              </View>

              {/* Quick Action Cards */}
              <View style={styles.cardsSection}>
                <QuickActionCard
                  icon="hardware-chip-outline"
                  iconColor={Colors.primary}
                  title="Devices"
                  onPress={() => navigation.navigate('Devices')}
                />
                <QuickActionCard
                  icon="code-working-outline"
                  iconColor={Colors.secondary}
                  title="Functions"
                  onPress={() => navigation.navigate('Functions')}
                />
                <QuickActionCard
                  icon="git-network-outline"
                  iconColor={Colors.tertiary}
                  title="Automations"
                  onPress={() => navigation.navigate('Automations')}
                />
              </View>
            </ScrollView>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ChatBubble message={item} />}
              contentContainerStyle={[styles.chatContent, messages.length === 0 && !isSending && { flex: 1, justifyContent: 'center' }]}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshingChat}
                  onRefresh={handleChatRefresh}
                  // Fully hide the native spinner — ArtemisPullLoader provides the visual
                  tintColor="transparent"
                  colors={['transparent']}
                  progressBackgroundColor="transparent"
                  progressViewOffset={-100}
                />
              }
              ListHeaderComponent={
                isRefreshingChat ? (
                  <ArtemisPullLoader size={10} label="Reloading chat…" style={{ marginBottom: 8 }} />
                ) : null
              }
              ListFooterComponent={
                isSending ? <TypingIndicator /> : null
              }
              ListEmptyComponent={
                !isRefreshingChat && !isSending ? (
                  <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
                    <Ionicons name="chatbubble-ellipses-outline" size={48} color="rgba(116, 177, 255, 0.3)" />
                    <Text style={{ fontFamily: Typography.families.headline, fontSize: Typography.sizes.headlineSm, color: Colors.onSurfaceVariant, marginTop: 16, textAlign: 'center' }}>
                      No conversation yet
                    </Text>
                    <Text style={{ fontFamily: Typography.families.body, fontSize: Typography.sizes.bodySm, color: 'rgba(255,255,255,0.35)', marginTop: 8, textAlign: 'center' }}>
                      Tap the mic or type a message to begin speaking with Artemis.
                    </Text>
                  </View>
                ) : null
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

      {/* ═══ Clear Chat Confirmation Modal ═══ */}
      <ConfirmModal
        visible={showClearModal}
        icon="trash-outline"
        iconColor={Colors.error}
        title="Clear Conversation"
        message="This will permanently delete your entire chat history. This cannot be undone."
        confirmLabel="Clear"
        cancelLabel="Keep It"
        destructive
        onConfirm={confirmClearChat}
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
  // ── Mode Toggle ──
  toggleBar: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
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
  clearChatBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 113, 108, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 113, 108, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
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
