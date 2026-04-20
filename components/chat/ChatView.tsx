import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';
import ChatBubble, { ChatMessage } from './ChatBubble';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    text: "Good evening, Alex. All systems are nominal. Your home is currently at 72°F with 3 active devices.",
    timestamp: '9:38 PM',
  },
  {
    id: '2',
    role: 'user',
    text: "It's getting late, turn off the lights.",
    timestamp: '9:40 PM',
  },
  {
    id: '3',
    role: 'assistant',
    text: "Certainly. I'm turning off the Living Room lights. Would you also like me to set the alarm for 7:00 AM?",
    timestamp: '9:40 PM',
  },
  {
    id: '4',
    role: 'user',
    text: 'Yes please!',
    timestamp: '9:40 PM',
  },
  {
    id: '5',
    role: 'assistant',
    text: "Done. Living Room lights are off, and your alarm is set for 7:00 AM tomorrow.",
    timestamp: '9:41 PM',
  },
];

type Props = {
  bottomInset?: number;
};

export default function ChatView({ bottomInset = 0 }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // ── Orb ambient pulse ──
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const orbGlowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });
  const orbScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const handleSend = () => {
    if (!inputText.trim()) return;
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');

    // Simulate assistant reply
    setTimeout(() => {
      const reply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: "I've noted your request. Let me process that for you.",
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, reply]);
    }, 1200);
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Mini Orb */}
      <View style={styles.orbContainer}>
        <Animated.View
          style={[
            styles.orbGlow,
            { opacity: orbGlowOpacity, transform: [{ scale: orbScale }] },
          ]}
        />
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDim, Colors.secondaryDim]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.orbCore}
        >
          <View style={styles.orbInner}>
            <View style={styles.orbDot} />
          </View>
        </LinearGradient>
      </View>

      {/* State label */}
      <View style={styles.stateLabel}>
        <View style={styles.stateDot} />
        <Text style={styles.stateText}>Listening</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {/* ── Input Bar ── */}
      <View style={[styles.inputArea, { paddingBottom: Math.max(bottomInset, Spacing.sm) }]}>
        {/* Voice waveform accent line */}
        <View style={styles.waveformRow}>
          {Array.from({ length: 28 }).map((_, i) => {
            const h = Math.random() * 12 + 3;
            return (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: h,
                    backgroundColor:
                      i > 10 && i < 18
                        ? Colors.primary
                        : 'rgba(116, 177, 255, 0.2)',
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.micButton} activeOpacity={0.7}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryContainer]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.micGradient}
            >
              <Ionicons name="mic" size={22} color={Colors.onPrimary} />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.textInputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message Artemis..."
              placeholderTextColor="rgba(255, 255, 255, 0.25)"
              selectionColor={Colors.primary}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
          </View>

          {inputText.length > 0 && (
            <TouchableOpacity onPress={handleSend} activeOpacity={0.7}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendButton}
              >
                <Ionicons name="arrow-up" size={20} color={Colors.onPrimary} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const MINI_ORB = 90;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.lg,
  },

  // ── Header / Orb ──
  headerSection: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    marginBottom: Spacing.md,
  },
  orbContainer: {
    width: MINI_ORB,
    height: MINI_ORB,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  orbGlow: {
    position: 'absolute',
    width: MINI_ORB * 1.8,
    height: MINI_ORB * 1.8,
    borderRadius: MINI_ORB,
    backgroundColor: 'rgba(116, 177, 255, 0.15)',
  },
  orbCore: {
    width: MINI_ORB,
    height: MINI_ORB,
    borderRadius: MINI_ORB / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbInner: {
    width: MINI_ORB * 0.7,
    height: MINI_ORB * 0.7,
    borderRadius: (MINI_ORB * 0.7) / 2,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  orbDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },

  stateLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(116, 177, 255, 0.08)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
  },
  stateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.tertiary,
    shadowColor: Colors.tertiary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  stateText: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.medium,
    color: Colors.tertiary,
    letterSpacing: 1,
  },

  // ── Input Area ──
  inputArea: {
    backgroundColor: 'rgba(14, 14, 16, 0.95)',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.5,
    marginBottom: Spacing.md,
    height: 18,
  },
  waveBar: {
    width: 2.5,
    borderRadius: 2,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  micButton: {},
  micGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  textInputWrapper: {
    flex: 1,
    backgroundColor: 'rgba(38, 37, 41, 0.3)',
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: Spacing.lg,
  },
  textInput: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    color: Colors.onSurface,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
