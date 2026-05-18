import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import { Colors, Radii } from '../../../constants/theme';

interface Props {
  value: number;
  /** Inclusive range (defaults 0–100). */
  min?: number;
  max?: number;
  onChange?: (val: number) => void;
  trackColor?: string;
  fillColor?: string;
  disabled?: boolean;
}

export function SliderControl({ 
  value, 
  min = 0,
  max = 100,
  onChange, 
  trackColor = Colors.surfaceContainerHighest, 
  fillColor = Colors.primary,
  disabled = false,
}: Props) {
  const trackWidth = useRef(0);
  const trackX = useRef(0); // Absolute X of the track's left edge on screen
  const [localValue, setLocalValue] = React.useState(value);

  // Keep local value in sync when prop changes externally
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const clampAndNotify = useCallback((screenX: number) => {
    if (trackWidth.current === 0 || disabled) return;
    const relativeX = screenX - trackX.current;
    const pct = Math.max(0, Math.min(1, relativeX / trackWidth.current));
    const newVal = Math.round(min + pct * (max - min));
    setLocalValue(newVal);
    onChange?.(newVal);
  }, [disabled, min, max, onChange]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (evt) => {
        clampAndNotify(evt.nativeEvent.pageX);
      },
      onPanResponderMove: (evt) => {
        clampAndNotify(evt.nativeEvent.pageX);
      },
    })
  ).current;

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    trackWidth.current = width;
  };

  // Measure absolute position of the track on screen
  const trackRef = useRef<View>(null);
  const handleTrackLayout = () => {
    trackRef.current?.measure((_x, _y, _w, _h, pageX) => {
      trackX.current = pageX;
    });
  };

  const span = max - min || 1;
  const pct = Math.max(0, Math.min(100, ((localValue - min) / span) * 100));

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      <View
        ref={trackRef}
        style={[styles.track, { backgroundColor: trackColor }]}
        onLayout={handleTrackLayout}
      >
        <View
          style={[styles.fill, { width: `${pct}%`, backgroundColor: fillColor }]}
        />
      </View>
      <View style={[styles.thumb, { left: `${pct}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 28,
    justifyContent: 'center',
    marginVertical: 8,
  },
  track: {
    height: 8,
    borderRadius: Radii.full,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radii.full,
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.onSurface,
    top: 3,
    marginLeft: -11, // Center thumb over value position
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
});
