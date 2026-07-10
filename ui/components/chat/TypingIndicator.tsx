import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors, Radii } from '../../constants/theme';

const DOT_SIZE = 7;
const DOT_SPACING = 5;

function Dot({ delay, isUser }: { delay: number, isUser?: boolean }) {
  const opacity = useRef(new Animated.Value(0.25)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.35,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.25,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.8,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
        // Wait for remaining dots before repeating
        Animated.delay(700 - delay),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [delay, opacity, scale]);

  return (
    <Animated.View
      style={[
        styles.dot,
        isUser && styles.userDot,
        { opacity, transform: [{ scale }] },
      ]}
    />
  );
}

export default function TypingIndicator({ isUser }: { isUser?: boolean }) {
  return (
    <View style={[styles.wrapper, isUser && styles.userWrapper]}>
      <View style={[styles.bubble, isUser && styles.userBubble]}>
        <Dot delay={0} isUser={isUser} />
        <Dot delay={180} isUser={isUser} />
        <Dot delay={360} isUser={isUser} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  userWrapper: {
    alignSelf: 'flex-end',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DOT_SPACING,
    backgroundColor: 'rgba(116, 177, 255, 0.08)',
    borderRadius: Radii.lg,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(116, 177, 255, 0.12)',
  },
  userBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: 4,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: Colors.primary,
  },
  userDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
});
