import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
};

type Props = {
  message: ChatMessage;
};

export default function ChatBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {!isUser && (
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={['rgba(116, 177, 255, 0.25)', 'rgba(116, 177, 255, 0.05)']}
            style={styles.assistantAvatarGlow}
          >
            <Ionicons name="planet" size={14} color={Colors.primary} />
          </LinearGradient>
        </View>
      )}

      <View style={[styles.bubbleContainer, isUser ? styles.containerUser : styles.containerAssistant]}>
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
          ]}
        >
          <Text style={[styles.text, isUser && styles.textUser]}>
            {message.text}
          </Text>
        </View>
        <Text style={[styles.timestamp, isUser ? styles.tsRight : styles.tsLeft]}>
          {message.timestamp}
        </Text>
      </View>

      {isUser && (
        <View style={styles.avatarContainer}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={12} color="rgba(255, 255, 255, 0.5)" />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },

  avatarContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 22,
  },
  assistantAvatarGlow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(116, 177, 255, 0.3)',
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },

  bubbleContainer: {
    maxWidth: '76%',
  },
  containerUser: {
    marginRight: Spacing.sm,
    alignItems: 'flex-end',
  },
  containerAssistant: {
    marginLeft: Spacing.sm,
    alignItems: 'flex-start',
  },

  bubble: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  bubbleUser: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: Radii.xl,
    borderBottomRightRadius: Radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bubbleAssistant: {
    backgroundColor: 'rgba(116, 177, 255, 0.05)',
    borderRadius: Radii.xl,
    borderBottomLeftRadius: Radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(116, 177, 255, 0.15)',
  },

  text: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 22,
  },
  textUser: {
    color: '#ffffff',
  },

  timestamp: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelXs,
    color: 'rgba(255, 255, 255, 0.25)',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  tsRight: { alignSelf: 'flex-end' },
  tsLeft: { alignSelf: 'flex-start' },
});
