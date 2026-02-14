import React from 'react';
import { Text, View } from 'react-native';

export default function Menu() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#000' }}>Welcome!</Text>
    </View>
  );
}