import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/cyber/ui';
import { AppColors, Spacing } from '@/constants/theme';
import { useApp } from '@/state/app-context';

export default function EntryScreen() {
  const { ready, profile } = useApp();

  if (!ready) {
    return (
      <View style={styles.loading}>
        <BrandMark />
        <ActivityIndicator color={AppColors.mint} />
      </View>
    );
  }

  return <Redirect href={profile.onboarded ? '/(tabs)' : '/onboarding'} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: AppColors.ink, gap: Spacing.xl },
});

