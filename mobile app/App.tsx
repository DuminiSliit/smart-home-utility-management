import React from 'react';
import {Ionicons} from '@expo/vector-icons';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {NavigationContainer} from '@react-navigation/native';

import Bill from './Screens/Bill';
import Home from './Screens/Home';
import Settings from './Screens/Settings';
import Statistics from './Screens/Statistics';

const Tab = createBottomTabNavigator(); 

type TabIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

function HomeTabIcon({focused, color, size}: TabIconProps) {
  return <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />; 
}

function StatisticsTabIcon({focused, color, size}: TabIconProps) {
  return <Ionicons name={focused ? 'list' : 'list-outline'} size={size} color={color} />;
}

function BillTabIcon({focused, color, size}: TabIconProps) {
  return <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={size} color={color} />;
}

function SettingsTabIcon({focused, color, size}: TabIconProps) {
  return <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />;
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{
          tabBarActiveTintColor: 'green',
          tabBarInactiveTintColor: 'grey',
          tabBarLabelStyle: {paddingBottom: 10, fontSize: 10}, 
          tabBarStyle: {padding: 10, height: 70},
        }}>
        <Tab.Screen name="Home" component={Home} options={{tabBarIcon: HomeTabIcon}} />
        <Tab.Screen name="Statistics" component={Statistics} options={{tabBarIcon: StatisticsTabIcon}} />
        <Tab.Screen name="Bill" component={Bill} options={{tabBarIcon: BillTabIcon}} />
        <Tab.Screen name="Settings" component={Settings} options={{tabBarIcon: SettingsTabIcon}} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
