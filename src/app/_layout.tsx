import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';
import { AppProvider } from '@/state/app-context';

const cyberTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: AppColors.mint,
    background: AppColors.ink,
    card: AppColors.inkElevated,
    text: AppColors.text,
    border: AppColors.border,
    notification: AppColors.amber,
  },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={cyberTheme}>
          <AppProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: AppColors.ink } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
              <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
              <Stack.Screen name="tutor" options={{ presentation: 'modal' }} />
              <Stack.Screen name="voice-tutor" options={{ presentation: 'modal' }} />
              <Stack.Screen name="provider-settings" />
              <Stack.Screen name="scenario/[id]" />
              <Stack.Screen name="lesson/[id]" />
              <Stack.Screen name="role/[id]" />
            </Stack>
          </AppProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
