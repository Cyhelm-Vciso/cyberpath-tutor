import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen, Card, CircleIcon, Pill, SectionHeader, TopBar, Type } from '@/components/cyber/ui';
import { AppColors, Radius, Spacing } from '@/constants/theme';
import { BUILT_IN_OPENAI_AVAILABLE } from '@/services/provider-settings';
import { useApp } from '@/state/app-context';

const roleLabels: Record<string, string> = {
  'soc-analyst': 'SOC Analyst',
  'incident-responder': 'Incident Responder',
  'cybersecurity-engineer': 'Cybersecurity Engineer',
  'junior-penetration-tester': 'Junior Penetration Tester',
  'grc-analyst': 'GRC Analyst',
  ciso: 'Chief Information Security Officer',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, progress, resetLearningData } = useApp();
  const primaryRole = roleLabels[profile.primaryRoleId] ?? 'Cybersecurity professional';

  function confirmReset() {
    Alert.alert('Reset learning data?', 'This removes your local path, progress, and scenario evidence. Provider credentials are managed separately.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => resetLearningData() },
    ]);
  }

  return (
    <AppScreen>
      <TopBar eyebrow="Your learning system" title="Profile" right={<Pill label={`${progress.xp} XP`} tone="mint" icon="sparkles" />} />

      <Card style={styles.identityCard}>
        <View style={styles.avatar}><Ionicons name="person" size={34} color={AppColors.mint} /></View>
        <View style={styles.flex}>
          <Text style={styles.name}>{profile.name || 'Cyber learner'}</Text>
          <Text style={Type.bodyMuted}>Path to {primaryRole}</Text>
          <View style={styles.badges}>
            <Pill label={`${profile.weeklyHours}h / week`} tone="blue" icon="time" />
            <Pill label={profile.experience.replaceAll('-', ' ')} tone="neutral" />
          </View>
        </View>
      </Card>

      <SectionHeader title="AI tutor" />
      <SettingRow
        icon="hardware-chip"
        color={AppColors.mint}
        title="AI provider"
        detail={
          BUILT_IN_OPENAI_AVAILABLE
            ? 'Built-in OpenAI or your own compatible endpoint'
            : 'Built-in OpenAI is unavailable in this public demo; use Local AI or a custom / cloud endpoint'
        }
        badge="Configurable"
        onPress={() => router.push('/provider-settings')}
      />
      <SettingRow
        icon="mic"
        color={AppColors.cyan}
        title="Live voice & interview"
        detail="Talk directly with Maya or Daniel, with captions and an animated avatar"
        badge="New"
        onPress={() => router.push({ pathname: '/voice-tutor', params: { mode: 'tutor', roleId: profile.primaryRoleId } })}
      />

      <SectionHeader title="Learning preferences" />
      <View style={styles.group}>
        <SettingRow icon="flag" color={AppColors.cyan} title="Career goals" detail={`${profile.targetRoleIds.length} target path${profile.targetRoleIds.length === 1 ? '' : 's'} selected`} />
        <SettingRow icon="calendar" color={AppColors.amber} title="Weekly rhythm" detail={`${profile.weeklyHours} focused hours with short daily missions`} />
        <SettingRow icon="chatbubbles" color={AppColors.purple} title="Tutor style" detail="Direct, encouraging, evidence-first" />
        <SettingRow icon="accessibility" color={AppColors.blue} title="Accessibility" detail="System text size, high contrast, reduced motion aware" />
      </View>

      <SectionHeader title="Privacy & control" />
      <View style={styles.group}>
        <SettingRow icon="phone-portrait" color={AppColors.mint} title="Local progress" detail="Profile and progress are stored on this device" badge="On device" />
        <SettingRow icon="cloud-offline" color={AppColors.cyan} title="Offline content" detail="Career maps and lessons remain available without AI" />
        <SettingRow icon="trash" color={AppColors.red} title="Reset learning data" detail="Remove this local learner profile and evidence" onPress={confirmReset} danger />
      </View>

      <Card style={styles.safetyCard}>
        <CircleIcon name="shield-checkmark" color={AppColors.mint} />
        <View style={styles.flex}>
          <Text style={styles.safetyTitle}>Safe practice by design</Text>
          <Text style={Type.bodyMuted}>Fictional organizations, synthetic evidence, authorized methods, and defensive learning boundaries.</Text>
        </View>
      </Card>

      <Text style={styles.version}>CyberPath Tutor · MVP 1.0</Text>
    </AppScreen>
  );
}

function SettingRow({
  icon,
  color,
  title,
  detail,
  badge,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  detail: string;
  badge?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const content = (
    <>
      <CircleIcon name={icon} color={color} />
      <View style={styles.flex}>
        <Text style={[styles.settingTitle, danger && { color: AppColors.red }]}>{title}</Text>
        <Text style={Type.caption}>{detail}</Text>
      </View>
      {badge ? <Pill label={badge} tone="mint" /> : null}
      {onPress ? <Ionicons name="chevron-forward" size={19} color={AppColors.textDim} /> : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }
  return <View style={styles.settingRow}>{content}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  identityCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl },
  avatar: { width: 72, height: 72, borderRadius: 24, backgroundColor: AppColors.mintDark, borderWidth: 1, borderColor: AppColors.borderBright, alignItems: 'center', justifyContent: 'center' },
  name: { color: AppColors.text, fontSize: 21, fontWeight: '900', marginBottom: 3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  group: { borderWidth: 1, borderColor: AppColors.border, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: AppColors.inkElevated },
  settingRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: AppColors.border },
  settingTitle: { color: AppColors.text, fontSize: 14, fontWeight: '800', marginBottom: 4 },
  pressed: { opacity: 0.72 },
  safetyCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, backgroundColor: '#0D2928' },
  safetyTitle: { color: AppColors.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  version: { color: AppColors.textDim, fontSize: 11, textAlign: 'center', letterSpacing: 0.4 },
});
