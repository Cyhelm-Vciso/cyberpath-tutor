import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import {
  AppScreen,
  Card,
  CircleIcon,
  Metric,
  Pill,
  ProgressBar,
  SectionHeader,
  TopBar,
  Type,
} from '@/components/cyber/ui';
import { AppColors, Radius, Spacing } from '@/constants/theme';
import { useApp } from '@/state/app-context';

const skillBase = [
  { label: 'Technology foundations', base: 24, color: AppColors.cyan },
  { label: 'Threats & detection', base: 18, color: AppColors.mint },
  { label: 'Incident judgment', base: 12, color: AppColors.amber },
  { label: 'Communication', base: 20, color: AppColors.purple },
  { label: 'Governance & ethics', base: 22, color: AppColors.blue },
];

export default function ProgressScreen() {
  const { progress } = useApp();
  const scenarioCount = Object.keys(progress.scenarioAttempts).length;
  const evidenceCount = progress.completedLessonIds.length + scenarioCount;
  const readiness = Math.min(94, 14 + progress.completedLessonIds.length * 5 + scenarioCount * 9);
  const confidence = evidenceCount > 7 ? 'High' : evidenceCount > 2 ? 'Medium' : 'Building';

  return (
    <AppScreen>
      <TopBar eyebrow="Evidence, not guesswork" title="Your progress" right={<Pill label={`${progress.xp} XP`} tone="mint" icon="sparkles" />} />

      <Card style={styles.readinessCard}>
        <View style={styles.readinessTop}>
          <View style={styles.readinessDial}>
            <View style={styles.readinessInner}>
              <Text style={styles.readinessValue}>{readiness}%</Text>
              <Text style={styles.readinessLabel}>READY</Text>
            </View>
          </View>
          <View style={styles.flex}>
            <Pill label={`${confidence} confidence`} tone="blue" icon="pulse" />
            <Text style={styles.readinessTitle}>Role readiness</Text>
            <Text style={Type.bodyMuted}>
              Based on {evidenceCount} piece{evidenceCount === 1 ? '' : 's'} of learning evidence across lessons and simulations.
            </Text>
          </View>
        </View>
        <ProgressBar value={readiness} />
        <Text style={Type.caption}>Readiness grows when you demonstrate a skill independently and across varied scenarios.</Text>
      </Card>

      <View style={styles.metrics}>
        <Metric value={`${progress.completedLessonIds.length}`} label="Lessons" accent={AppColors.cyan} />
        <Metric value={`${scenarioCount}`} label="Scenarios" accent={AppColors.amber} />
        <Metric value={`${progress.minutesLearned}m`} label="Practice" accent={AppColors.purple} />
        <Metric value={`${progress.streakDays}d`} label="Rhythm" accent={AppColors.mint} />
      </View>

      <SectionHeader title="Competency signal" action="How it works" />
      <Card>
        {skillBase.map((skill, index) => {
          const value = Math.min(100, skill.base + progress.completedLessonIds.length * 4 + scenarioCount * (index === 2 ? 8 : 4));
          return (
            <View key={skill.label} style={styles.skillRow}>
              <View style={styles.skillLabels}>
                <Text style={styles.skillName}>{skill.label}</Text>
                <Text style={styles.skillValue}>{value}%</Text>
              </View>
              <ProgressBar value={value} color={skill.color} />
              <Text style={Type.caption}>{value < 35 ? 'Introduced' : value < 60 ? 'Practiced with guidance' : value < 82 ? 'Demonstrated independently' : 'Demonstrated across scenarios'}</Text>
            </View>
          );
        })}
      </Card>

      <SectionHeader title="Evidence ledger" />
      <Card>
        {evidenceCount === 0 ? (
          <View style={styles.empty}>
            <CircleIcon name="finger-print" color={AppColors.cyan} size={52} />
            <View style={styles.flex}>
              <Text style={styles.evidenceTitle}>Your first proof starts today</Text>
              <Text style={Type.bodyMuted}>Complete a lesson check or a scenario decision to add assessed evidence.</Text>
            </View>
          </View>
        ) : (
          <>
            <EvidenceRow icon="checkmark-circle" title={`${progress.completedLessonIds.length} lesson checks`} detail="Knowledge and workplace context" color={AppColors.mint} />
            <EvidenceRow icon="flash" title={`${scenarioCount} simulation${scenarioCount === 1 ? '' : 's'}`} detail="Judgment, evidence use and communication" color={AppColors.amber} />
            <EvidenceRow icon="time" title="Refresh cadence active" detail="Older evidence will be recommended for practice" color={AppColors.cyan} last />
          </>
        )}
      </Card>
    </AppScreen>
  );
}

function EvidenceRow({ icon, title, detail, color, last }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; color: string; last?: boolean }) {
  return (
    <View style={[styles.evidenceRow, !last && styles.evidenceBorder]}>
      <Ionicons name={icon} size={22} color={color} />
      <View style={styles.flex}>
        <Text style={styles.evidenceTitle}>{title}</Text>
        <Text style={Type.caption}>{detail}</Text>
      </View>
      <Pill label="Verified" tone="mint" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  readinessCard: { padding: Spacing.xl },
  readinessTop: { flexDirection: 'row', gap: Spacing.lg, alignItems: 'center' },
  readinessDial: { width: 106, height: 106, borderRadius: 53, borderWidth: 9, borderColor: AppColors.mint, borderRightColor: AppColors.border, alignItems: 'center', justifyContent: 'center' },
  readinessInner: { width: 76, height: 76, borderRadius: 38, backgroundColor: AppColors.panel, alignItems: 'center', justifyContent: 'center' },
  readinessValue: { color: AppColors.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.8 },
  readinessLabel: { color: AppColors.textDim, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  readinessTitle: { color: AppColors.text, fontSize: 21, fontWeight: '900', marginTop: 10, marginBottom: 4 },
  metrics: { flexDirection: 'row', backgroundColor: AppColors.inkElevated, borderRadius: Radius.lg, borderWidth: 1, borderColor: AppColors.border, padding: Spacing.lg, gap: Spacing.sm },
  skillRow: { gap: 7, paddingVertical: 4 },
  skillLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  skillName: { color: AppColors.text, fontSize: 14, fontWeight: '700' },
  skillValue: { color: AppColors.textMuted, fontSize: 12, fontWeight: '800' },
  empty: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.md },
  evidenceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  evidenceBorder: { borderBottomWidth: 1, borderBottomColor: AppColors.border },
  evidenceTitle: { color: AppColors.text, fontSize: 14, fontWeight: '800', marginBottom: 3 },
});

