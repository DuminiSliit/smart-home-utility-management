import React from 'react';
import {Text, View} from 'react-native';

type Props = {
  label: string;
  value: number;
};

export default function CurrentStatus({label, value}: Props) {
  return (
    <View>
      <Text>{label}</Text>
      <Text>{Number(value).toFixed(2)} Wh</Text>
    </View>
  );
}
