import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {API_BASE_URL} from './api';

export default function Settings() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.label}>Backend API</Text>
      <Text selectable style={styles.value}>
        {API_BASE_URL}
      </Text>
      <Text style={styles.note}>
        For a physical phone, set the API host to your computer&apos;s LAN IP
        address in Screens/api.js. Both devices must be on the same network.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {padding: 20},
  title: {fontSize: 24, fontWeight: '700', marginBottom: 20},
  label: {fontWeight: '600'},
  value: {color: '#176b36', marginTop: 6},
  note: {color: '#555', lineHeight: 22, marginTop: 16},
});
