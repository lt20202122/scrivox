import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ label }: { label: string }) {
  return <Text style={{ fontSize: 20 }}>{label}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#5c4a1e',
        tabBarInactiveTintColor: '#9e9087',
        tabBarStyle: { backgroundColor: '#F5F0E8', borderTopColor: '#d4c9b8' },
        headerStyle: { backgroundColor: '#F5F0E8' },
        headerTintColor: '#3a2e1e',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: () => <TabIcon label="✍️" />,
        }}
      />
      <Tabs.Screen
        name="fonts"
        options={{
          title: 'Fonts',
          tabBarIcon: () => <TabIcon label="🖋️" />,
        }}
      />
      <Tabs.Screen
        name="ocr"
        options={{
          title: 'Scan',
          tabBarIcon: () => <TabIcon label="📷" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: () => <TabIcon label="⚙️" />,
        }}
      />
    </Tabs>
  );
}
