import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

export default function Bill() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bill estimate</Text>
      <Text style={styles.message}>
        Bill estimates are not available yet. The backend does not currently
        provide a billing endpoint or an electricity tariff, so this screen does
        not display an invented amount.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {padding: 20},
  title: {fontSize: 24, fontWeight: '700', marginBottom: 12},
  message: {color: '#444', fontSize: 16, lineHeight: 24},
});
