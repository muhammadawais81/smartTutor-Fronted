import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

type Props = {
  message?: string;
};

const LoadingOverlay: React.FC<Props> = ({message = 'Loading...'}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1E3A8A" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    marginTop: 12,
    color: '#111827',
    fontSize: 16,
  },
});

export default LoadingOverlay;
