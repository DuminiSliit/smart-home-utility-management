import React from 'react';
import {ScrollView, StyleSheet} from 'react-native';
import StatisticsData from './Components/StatisticsData';

export default function Statistics() {
  return (
    <ScrollView contentContainerStyle={styles.container}> 
      <StatisticsData />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {paddingVertical: 16},
});
