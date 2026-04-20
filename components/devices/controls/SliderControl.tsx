import React from 'react';
import { View, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import { Colors, Radii } from '../../../constants/theme';

interface Props {
  value: number; // 0 to 100
  onChange?: (val: number) => void;
  trackColor?: string;
  fillColor?: string;
  disabled?: boolean;
}

export function SliderControl({ 
  value, 
  onChange, 
  trackColor = Colors.surfaceContainerHighest, 
  fillColor = Colors.primary,
  disabled = false
}: Props) {
  const [width, setWidth] = React.useState(0);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderMove: (evt, gestureState) => {
        if (!disabled && width > 0 && onChange) {
          // calculate value based on touch position
          const newX = gestureState.moveX; // This is a simplistic approximation without proper inner layout measurements
          // In a real scenario we'd track the touch localized to the view
        }
      },
    })
  ).current;

  const handleLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const fillWidth = `${Math.max(0, Math.min(100, value))}%`;

  return (
    <View style={styles.container} onLayout={handleLayout} {...panResponder.panHandlers}>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <View style={[styles.fill, { width: fillWidth as any, backgroundColor: fillColor }]} />
      </View>
      <View style={[styles.thumb, { left: fillWidth as any }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 24,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.onSurface,
    top: 2, // 24 height / 2 = 12, thumb is 20, so offset is (24 - 20)/2 = 2
    marginLeft: -10, // Center thumb over value
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
});
