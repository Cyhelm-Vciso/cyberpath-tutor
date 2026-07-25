import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen, Card, Chip, CircleIcon, Pill, SectionHeader, TopBar, Type } from '@/components/cyber/ui';
import { AppColors, Radius, Spacing } from '@/constants/theme';
import { scenarios } from '@/data/scenarios';
import { ScenarioDifficulty } from '@/domain/types';
import { useApp } from '@/state/app-context';

type Filter = 'all' | ScenarioDifficulty;

const tones: Record<ScenarioDifficulty, 'mint' | 'amber' | 'purple'> = {
  foundation: 'mint',
  intermediate: 'amber',
  advanced: 'purple',
};

export default function PracticeScreen() {
  const router = useRouter();
  const { progress } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const visible = filter === 'all' ? scenarios : scenarios.filter((scenario) => scenario.difficulty === filter);

  return (
    <AppScreen>
      <TopBar eyebrow="Practice under pressure" title="Simulation lab" right={<Pill label="Safe lab" tone="mint" icon="shield-checkmark" />} />

      <Card style={styles.hero}>
        <View style={styles.heroIcon}><Ionicons name="radio" size={27} color={AppColors.ink} /></View>
        <View style={styles.flex}>
          <Text style={styles.heroTitle}>Work the problem, not the quiz.</Text>
          <Text style={Type.bodyMuted}>Review evidence, talk to stakeholders, make decisions, and see the consequences.</Text>
        </View>
      </Card>

      <View style={styles.filters}>
        {(['all', 'foundation', 'intermediate', 'advanced'] as const).map((item) => (
          <Chip key={item} label={item === 'all' ? 'All missions' : item} selected={filter === item} onPress={() => setFilter(item)} />
        ))}
      </View>

      <SectionHeader title="Role-play missions" action={`${visible.length} available`} />
      <View style={styles.list}>
        {visible.map((scenario, index) => {
          const score = progress.scenarioScores[scenario.id];
          const accent = index % 3 === 0 ? AppColors.amber : index % 3 === 1 ? AppColors.cyan : AppColors.purple;
          return (
            <Pressable
              key={scenario.id}
              accessibilityRole="button"
              accessibilityLabel={`Start simulation: ${scenario.title}`}
              onPress={() => router.push({ pathname: '/scenario/[id]', params: { id: scenario.id } })}
              style={({ pressed }) => [styles.scenarioCard, pressed && styles.pressed]}>
              <View style={[styles.accent, { backgroundColor: accent }]} />
              <View style={styles.scenarioTop}>
                <CircleIcon name={index % 2 === 0 ? 'flash' : 'shield-half'} color={accent} size={48} />
                <View style={styles.flex}>
                  <View style={styles.badges}>
                    <Pill label={scenario.difficulty} tone={tones[scenario.difficulty]} />
                    <Pill label={`${scenario.estimatedMinutes} min`} tone="neutral" icon="time" />
                    {score !== undefined ? <Pill label={`Best ${score}%`} tone="mint" icon="trophy" /> : null}
                  </View>
                  <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                  <Text style={styles.scenarioSubtitle}>{scenario.subtitle}</Text>
                </View>
              </View>
              <Text style={Type.bodyMuted}>{scenario.summary}</Text>
              <View style={styles.objectiveRow}>
                <Ionicons name="locate" size={15} color={AppColors.textDim} />
                <Text style={styles.objective} numberOfLines={1}>{scenario.objectives[0]}</Text>
                <Ionicons name="arrow-forward" size={18} color={AppColors.mint} />
              </View>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Practice another way" />
      <View style={styles.practiceGrid}>
        <PracticeMode icon="chatbubbles" title="Mock interview" detail="Explain decisions out loud" color={AppColors.purple} onPress={() => router.push({ pathname: '/tutor', params: { mode: 'assessor', prompt: 'Run a mock interview for my target cybersecurity role.' } })} />
        <PracticeMode icon="school" title="Teach-back" detail="Prove you understand it" color={AppColors.cyan} onPress={() => router.push({ pathname: '/tutor', params: { mode: 'coach', prompt: 'Give me a concept to teach back, then assess my explanation.' } })} />
      </View>

      <Card style={styles.safety}>
        <Ionicons name="shield-checkmark" size={24} color={AppColors.mint} />
        <View style={styles.flex}>
          <Text style={styles.safetyTitle}>Authorized and fictional</Text>
          <Text style={Type.caption}>All systems, people, logs, and domains are synthetic. Unsafe actions fail the mission.</Text>
        </View>
      </Card>
    </AppScreen>
  );
}

function PracticeMode({ icon, title, detail, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; color: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.modeCard, pressed && styles.pressed]}>
      <CircleIcon name={icon} color={color} />
      <Text style={styles.modeTitle}>{title}</Text>
      <Text style={Type.caption}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl, backgroundColor: '#0D2928' },
  heroIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: AppColors.mint, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: AppColors.text, fontSize: 19, fontWeight: '900', marginBottom: 5 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  list: { gap: Spacing.md },
  scenarioCard: { overflow: 'hidden', backgroundColor: AppColors.inkElevated, borderRadius: Radius.lg, borderWidth: 1, borderColor: AppColors.border, padding: Spacing.lg, gap: Spacing.md },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  scenarioTop: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 9 },
  scenarioTitle: { color: AppColors.text, fontSize: 18, fontWeight: '900', marginBottom: 4 },
  scenarioSubtitle: { color: AppColors.textMuted, fontSize: 12, lineHeight: 17 },
  objectiveRow: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: AppColors.panel, borderRadius: Radius.md, padding: Spacing.md },
  objective: { color: AppColors.textMuted, fontSize: 11, flex: 1 },
  practiceGrid: { flexDirection: 'row', gap: Spacing.md },
  modeCard: { flex: 1, minHeight: 150, backgroundColor: AppColors.inkElevated, borderWidth: 1, borderColor: AppColors.border, borderRadius: Radius.lg, padding: Spacing.lg, gap: 8 },
  modeTitle: { color: AppColors.text, fontSize: 15, fontWeight: '900', marginTop: 4 },
  safety: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  safetyTitle: { color: AppColors.text, fontSize: 13, fontWeight: '800', marginBottom: 3 },
  pressed: { opacity: 0.72 },
});
