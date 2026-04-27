import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Radii } from '../constants/theme';

interface CommandBarProps {
  onSend?: (message: string) => void;
  isSending?: boolean;
}

export default function CommandBar({ onSend, isSending }: CommandBarProps) {
  const [text, setText] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.micWrapper}>
        <Ionicons name="mic-outline" size={24} color={Colors.primary} />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Ask Artemis..."
        placeholderTextColor="rgba(173, 170, 173, 0.4)"
        value={text}
        onChangeText={setText}
        selectionColor={Colors.primary}
        editable={!isSending}
      />
      <Pressable
        style={({ pressed }) => [pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }, isSending && { opacity: 0.5 }]}
        disabled={isSending || !text.trim()}
        onPress={() => {
          if (text.trim() && onSend) {
            onSend(text.trim());
            setText('');
          }
        }}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sendButton}
        >
          <Text style={styles.sendText}>SEND</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(38, 37, 41, 0.2)',
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    paddingVertical: 6,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 12,
  },
  micWrapper: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurface,
    paddingVertical: 14,
  },
  sendButton: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.bodySm,
    fontWeight: Typography.weights.bold,
    color: Colors.onPrimary,
    letterSpacing: 3,
  },
});
