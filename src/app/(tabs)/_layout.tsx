import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { AppColors, Fonts } from '@/constants/theme';

const icons: Record<string, { active: keyof typeof Ionicons.glyphMap; idle: keyof typeof Ionicons.glyphMap }> = {
  index: { active: 'grid', idle: 'grid-outline' },
  path: { active: 'map', idle: 'map-outline' },
  practice: { active: 'flash', idle: 'flash-outline' },
  progress: { active: 'stats-chart', idle: 'stats-chart-outline' },
  profile: { active: 'person', idle: 'person-outline' },
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: AppColors.ink },
        tabBarActiveTintColor: AppColors.mint,
        tabBarInactiveTintColor: AppColors.textDim,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontFamily: Fonts?.rounded,
          fontSize: 10,
          fontWeight: '800',
          marginTop: 2,
        },
        tabBarStyle: {
          position: 'absolute',
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          backgroundColor: '#091B21F5',
          borderTopColor: AppColors.border,
          borderTopWidth: 1,
        },
        tabBarIcon: ({ color, focused, size }) => {
          const pair = icons[route.name] ?? icons.index;
          return <Ionicons name={focused ? pair.active : pair.idle} color={color} size={size} />;
        },
      })}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="path" options={{ title: 'Path' }} />
      <Tabs.Screen name="practice" options={{ title: 'Practice' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

