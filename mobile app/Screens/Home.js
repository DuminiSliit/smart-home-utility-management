import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {getJson} from './api';

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    let refreshing = false;
    const refresh = async () => {
      if (refreshing) {
        return;
      }
      refreshing = true;
      try {
        const result = await getJson('/api/live'); 
        if (mounted) {
          setData(result);
          setError('');
        }
      } catch (requestError) {
        if (mounted) {
          setError(requestError.message);
        }
      } finally {
        refreshing = false;
      }
    };

    refresh();
    const interval = setInterval(refresh, 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{data?.deviceName || 'Device'}</Text>
      <Text style={[styles.status, data?.status === 'online' ? styles.online : styles.offline]}>
        {data?.status === 'online' ? 'Online' : 'Offline'}
      </Text>
      {error ? (
        <Text style={styles.error}>Could not refresh live reading: {error}</Text>
      ) : null}
      {!data && !error ? (
        <ActivityIndicator accessibilityLabel="Loading live readings" />
      ) : null}
      {data ? (
        <View style={styles.cards}>
          <MetricCard label="Current" value={data.currentA} unit="A" /> 
          <MetricCard label="Voltage" value={data.voltageV} unit="V" />  
          <MetricCard label="Power" value={data.powerW} unit="W" />
          <MetricCard label="Energy" value={data.energyWh} unit="Wh" />
          <MetricCard label="Frequency" value={data.frequencyHz} unit="Hz" />
          <MetricCard label="Power factor" value={data.powerFactor} />
        </View>
      ) : null}
      <Text style={styles.note}>
        Current is measured by the connected current sensor. Other values need a
        voltage and power meter; they are not estimated. 
      </Text>
      {data?.lastSeenMs ? (
        <Text style={styles.updated}>
          Last reading: {new Date(data.lastSeenMs).toLocaleTimeString()}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function MetricCard({label, value, unit}) {
  const displayedValue = value == null ? '—' : `${Number(value).toFixed(2)}${unit ? ` ${unit}` : ''}`;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{displayedValue}</Text> 
      {value == null ? <Text style={styles.unavailable}>Not measured</Text> : null}
    </View> 
  );
}

const styles = StyleSheet.create({
  container: {padding: 20},
  title: {fontSize: 24, fontWeight: '700'},
  status: {fontSize: 15, fontWeight: '700', marginTop: 6, marginBottom: 18},
  online: {color: '#176b36'},
  offline: {color: '#a12622'},
  cards: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  card: {backgroundColor: '#eef7f0', borderRadius: 10, padding: 16, flexBasis: '47%', flexGrow: 1},
  label: {color: '#344b3b', fontSize: 15},
  value: {color: '#176b36', fontSize: 22, fontWeight: '700', marginTop: 6},
  unavailable: {color: '#666', fontSize: 12, marginTop: 4},
  note: {color: '#555', lineHeight: 20, marginTop: 18},
  updated: {color: '#666', marginTop: 10},
  error: {color: '#a12622', marginBottom: 12},
});
