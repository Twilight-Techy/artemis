import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Radii } from '../constants/theme';

interface CommandBarProps {
  onSend?: (message: string) => void;
  isSending?: boolean;
  onStartRecording?: () => void;
  onPauseRecording?: () => void;
  onResumeRecording?: () => void;
  onStopAndSendRecording?: () => void;
  isRecording?: boolean;
  isRecordingPaused?: boolean;
}

export default function CommandBar({ 
  onSend, 
  isSending, 
  onStartRecording, 
  onPauseRecording,
  onResumeRecording,
  onStopAndSendRecording,
  isRecording,
  isRecordingPaused
}: CommandBarProps) {
  const [text, setText] = useState('');

  if (isRecording) {
    return (
      <View style={styles.container}>
        <View style={styles.recordingContainer}>
          <View style={styles.recordingIndicator}>
            <View style={[styles.redDot, isRecordingPaused && { backgroundColor: Colors.onSurfaceVariant }]} />
            <Text style={styles.recordingText}>
              {isRecordingPaused ? 'Paused' : 'Recording...'}
            </Text>
          </View>
          
          <View style={styles.recordingActions}>
            <Pressable
              style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
              onPress={isRecordingPaused ? onResumeRecording : onPauseRecording}
            >
              <Ionicons name={isRecordingPaused ? "play" : "pause"} size={20} color={Colors.onSurface} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.sendIconButton, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }, isSending && { opacity: 0.5 }]}
              disabled={isSending}
              onPress={onStopAndSendRecording}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendIconGradient}
              >
                <Ionicons name="send" size={18} color={Colors.onPrimary} style={{ marginLeft: 2 }} />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Ask Artemis..."
        placeholderTextColor="rgba(173, 170, 173, 0.4)"
        value={text}
        onChangeText={setText}
        selectionColor={Colors.primary}
        editable={!isSending}
      />
      <View style={styles.rightActions}>
        {text.trim().length > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.sendIconButton, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }, isSending && { opacity: 0.5 }]}
            disabled={isSending}
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
              style={styles.sendIconGradient}
            >
              <Ionicons name="send" size={18} color={Colors.onPrimary} style={{ marginLeft: 2 }} />
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.sendIconButton, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }, isSending && { opacity: 0.5 }]}
            disabled={isSending}
            onPress={onStartRecording}
          >
            <LinearGradient
              colors={[Colors.tertiary, '#4fc3f7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendIconGradient}
            >
              <Ionicons name="mic" size={20} color={Colors.background} />
            </LinearGradient>
          </Pressable>
        )}
      </View>
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
    minHeight: 60,
  },
  input: {
    flex: 1,
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurface,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendIconButton: {
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.error,
  },
  recordingText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurface,
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
