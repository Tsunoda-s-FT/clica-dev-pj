import React from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text } from 'react-native';

interface LoadingIndicatorProps {
  message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message = 'Loading...' }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      {message && <Text style={styles.text}>{message}</Text>}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 10,
    color: '#333',
  },
});

export default LoadingIndicator;