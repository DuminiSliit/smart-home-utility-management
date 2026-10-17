import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native'; 
import {LineChart} from 'react-native-chart-kit';
import {getJson} from '../api';

type UsagePoint = {
  DateTime: string | number;
  'Watt-Hour': number;
};

const chartWidth = Dimensions.get('window').width - 32;

export default function StatisticsData() {
  const [series, setSeries] = useState<UsagePoint[][] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getJson('/Hourdata'),
      getJson('/DayData'),
      getJson('/MonthData'),
    ])
      .then(results => {
        if (mounted) {
          setSeries(results);
        }
      })
      .catch(requestError => {
        if (mounted) {
          setError(requestError.message);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return <Text style={styles.error}>Could not load statistics: {error}</Text>;
  }
  if (!series) {
    return <ActivityIndicator accessibilityLabel="Loading statistics" />;
  }

  return (
    <View>
      <Text style={styles.title}>Usage statistics</Text>
      {series.map((points, index) => (
        <UsageChart
          key={index}
          title={['Last hour', 'Last 24 hours', 'Last 30 days'][index]}
          points={points}
        />
      ))}
    </View>
  );
}

function UsageChart({title, points}: {title: string; points: UsagePoint[]}) {
  if (points.length === 0) {
    return <Text style={styles.empty}>{title}: no readings available.</Text>;
  }

  const data = points.map(point => Number(point['Watt-Hour']) || 0);
  return (
    <View style={styles.chartSection}>
      <Text style={styles.subtitle}>{title}</Text>
      <LineChart
        data={{
          labels: points.map(point => formatDate(point.DateTime)),
          datasets: [{data}],
        }}
        width={chartWidth}
        height={210}
        yAxisSuffix=" Wh"
        fromZero
        withDots={false}
        withVerticalLabels={false} 
        chartConfig={{
          backgroundColor: '#f3f7f4',
          backgroundGradientFrom: '#f3f7f4', 
          backgroundGradientTo: '#e5f1e8',
          decimalPlaces: 1,
          color: opacity => `rgba(23, 107, 54, ${opacity})`,
          labelColor: opacity => `rgba(35, 50, 40, ${opacity})`,
          propsForBackgroundLines: {stroke: '#d6e2d9'},
        }}
        bezier
      />
    </View>
  );
}

function formatDate(value: string | number) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString();
}

const styles = StyleSheet.create({ 
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  subtitle: {fontSize: 17, fontWeight: '600', marginBottom: 8},
  chartSection: {marginBottom: 20, marginHorizontal: 16},
  error: {color: '#a12622', margin: 16}, 
  empty: {color: '#555', margin: 16},
});
