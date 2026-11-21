import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { colors, type IconName } from '@/components/ui';

const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: any; size: number }) {
    return <Ionicons name={name} size={size} color={color} />;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerTitleStyle: { fontWeight: '700', color: colors.text },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false, tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance', tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen name="timetable" options={{ title: 'Timetable', tabBarIcon: icon('time-outline') }} />
      <Tabs.Screen name="fees" options={{ title: 'Fees', tabBarIcon: icon('wallet-outline') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('grid-outline') }} />
    </Tabs>
  );
}
