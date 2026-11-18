/**
 * Typing Indicator Component
 * 
 * Displays an animated typing indicator when the other user is typing.
 * Shows three animated dots to indicate active typing.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface TypingIndicatorProps {
  userName?: string;
  showUserName?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  userName = 'User',
  showUserName = true,
}) => {
  // Animation values for three dots
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Create staggered animation for dots
    const animateDot = (dotOpacity: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dotOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dotOpacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    // Start animations with staggered delays
    const animation1 = animateDot(dot1Opacity, 0);
    const animation2 = animateDot(dot2Opacity, 200);
    const animation3 = animateDot(dot3Opacity, 400);

    animation1.start();
    animation2.start();
    animation3.start();

    // Cleanup
    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        {showUserName && (
          <Text style={styles.userName}>{userName} is typing</Text>
        )}
        <View style={styles.dotsContainer}>
          <Animated.View
            style={[styles.dot, { opacity: dot1Opacity }]}
          />
          <Animated.View
            style={[styles.dot, { opacity: dot2Opacity }]}
          />
          <Animated.View
            style={[styles.dot, { opacity: dot3Opacity }]}
          />
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 12,
    alignSelf: 'flex-start',
  },
  bubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userName: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginRight: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10284C',
    marginHorizontal: 2,
  },
});

export default TypingIndicator;
