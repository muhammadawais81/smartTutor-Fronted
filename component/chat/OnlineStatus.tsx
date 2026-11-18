/**
 * Online Status Component
 * 
 * Displays online/offline status indicator with optional text.
 * Can be used standalone or integrated into other components.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface OnlineStatusProps {
  isOnline: boolean;
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

// ============================================================================
// COMPONENT
// ============================================================================

const OnlineStatus: React.FC<OnlineStatusProps> = ({
  isOnline,
  showText = false,
  size = 'medium',
  style,
}) => {
  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return { width: 8, height: 8, borderRadius: 4 };
      case 'large':
        return { width: 16, height: 16, borderRadius: 8 };
      case 'medium':
      default:
        return { width: 12, height: 12, borderRadius: 6 };
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.indicator,
          getSizeStyle(),
          { backgroundColor: isOnline ? '#22C55E' : '#999' },
        ]}
      />
      {showText && (
        <Text style={[
          styles.text,
          { color: isOnline ? '#22C55E' : '#999' },
        ]}>
          {isOnline ? 'Online' : 'Offline'}
        </Text>
      )}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    // Size set dynamically
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
});

export default OnlineStatus;
