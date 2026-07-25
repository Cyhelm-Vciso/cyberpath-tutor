import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppScreen,
  BrandMark,
  Card,
  CircleIcon,
  GradientCard,
  IconButton,
  Metric,
  Pill,
  PrimaryButton,
  ProgressBar,
  SectionHeader,
  Type,
} from '@/components/cyber/ui';
import { AppColors, Radius, Spacing } from '@/constants/theme';
import { careerFamilies, roles, starterModules } from '@/data/curriculum';
import { scenarios } from '@/data/scenarios';
import { useApp } from '@/state/app-context';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, progress } = useApp();
  const role = roles.find((item) => item.id === profile.primaryRoleId) ?? roles[0];
  const family = careerFamilies.find((item) => item.id === role?.familyId);
  const allLessons = starterModules.flatMap((module) => module.lessons.map((lesson) => ({ ...lesson, module })));
  const nextLesson = allLessons.find((lesson) => !progress.completedLessonIds.includes(lesson.id)) ?? allLessons[0];
  const scenario = scenarios.find((item) => item.familyIds.includes(role.familyId)) ?? scenarios[0];
  const readiness = Math.min(94, 14 + progress.completedLessonIds.length * 5 + Object.keys(progress.scenarioAttempts).length * 9);

  return (
    <AppScreen>
      <View style={styles.header}>
        <BrandMark />
        <View style={styles.headerActions}>
          <Pill label={`${progress.streakDays} day rhythm`} tone="amber" icon="flame" />
          <IconButton icon="notifications-outline" label="Notifications" />
        </View>
      </View>

      <View style={styles.greeting}>
        <Text style={styles.eyebrow}>MISSION CONTROL</Text>
        <Text style={styles.title}>Ready for your next move{profile.name ? `, ${profile.name}` : ''}?</Text>
        <Text style={Type.bodyMuted}>You’re building toward {role.title}. One focused action at a time.</Text>
      </View>

      <GradientCard>
        <View style={styles.heroTop}>
          <View style={styles.flex}>
            <Pill label="Continue learning" tone="mint" icon="play" />
            <Text style={styles.heroTitle}>{nextLesson.title}</Text>
            <Text style={styles.heroBody}>{nextLesson.summary}</Text>
          </View>
          <View style={styles.timeBadge}>
            <Text style={styles.timeValue}>{nextLesson.estimatedMinutes}</Text>
            <Text style={styles.timeLabel}>MIN</Text>
          </View>
        </View>
        <View style={styles.heroProgress}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>{nextLesson.module.title}</Text>
            <Text style={styles.progressLabel}>{progress.completedLessonIds.length} complete</Text>
          </View>
          <ProgressBar value={(progress.completedLessonIds.length / Math.max(1, allLessons.length)) * 100} />
        </View>
        <PrimaryButton
          label="Continue mission"
          icon="arrow-forward"
          onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: nextLesson.id } })}
        />
      </GradientCard>

      <View style={styles.metrics}>
        <Metric value={`${readiness}%`} label="Readiness" accent={AppColors.mint} />
        <Metric value={`${progress.xp}`} label="XP earned" accent={AppColors.cyan} />
        <Metric value={`${progress.minutesLearned}m`} label="Practice" accent={AppColors.purple} />
      </View>

      <SectionHeader title="Today’s mission" action="All practice" onAction={() => router.push('/(tabs)/practice')} />
      <Card
        onPress={() => router.push({ pathname: '/scenario/[id]', params: { id: scenario.id } })}
        accessibilityLabel={`Start ${scenario.title}`}>
        <View style={styles.scenarioRow}>
          <CircleIcon name="flash" color={AppColors.amber} size={50} />
          <View style={styles.flex}>
            <View style={styles.inlinePills}>
              <Pill label={scenario.difficulty} tone="amber" />
              <Pill label={`${scenario.estimatedMinutes} min`} tone="neutral" icon="time" />
            </View>
            <Text style={styles.cardTitle}>{scenario.title}</Text>
            <Text style={Type.bodyMuted}>{scenario.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={AppColors.textDim} />
        </View>
      </Card>

      <SectionHeader title="Ask your tutor" />
      <Card style={styles.tutorCard}>
        <View style={styles.tutorHeading}>
          <View style={styles.tutorAvatar}><Ionicons name="sparkles" size={24} color={AppColors.ink} /></View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>Tutor is ready</Text>
            <Text style={Type.caption}>Teacher · Coach · Role-player · Assessor</Text>
          </View>
          <View style={styles.onlineDot} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Ask your tutor" onPress={() => router.push('/tutor')} style={({ pressed }) => [styles.askBox, pressed && styles.pressed]}>
          <Text style={styles.askPlaceholder}>Ask anything about {role.title}…</Text>
          <View style={styles.sendButton}><Ionicons name="arrow-up" size={17} color={AppColors.ink} /></View>
        </Pressable>
        <View style={styles.suggestions}>
          {['Explain my next step', 'Quiz me', 'Show a workplace example'].map((label) => (
            <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push({ pathname: '/tutor', params: { prompt: label } })} style={styles.suggestion}>
              <Text style={styles.suggestionText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <SectionHeader title="Your destination" action="View path" onAction={() => router.push('/(tabs)/path')} />
      <Card onPress={() => router.push({ pathname: '/role/[id]', params: { id: role.id } })}>
        <View style={styles.destination}>
          <CircleIcon name="flag" color={family?.accentColor ?? AppColors.mint} size={50} />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{role.title}</Text>
            <Text style={Type.bodyMuted}>{role.mission}</Text>
          </View>
          <Pill label={role.level.replace('-', ' ')} tone="purple" />
        </View>
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  greeting: { gap: 6, paddingVertical: Spacing.sm },
  eyebrow: { color: AppColors.mint, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: AppColors.text, fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.9 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
  heroTitle: { color: AppColors.text, fontSize: 24, lineHeight: 30, fontWeight: '900', letterSpacing: -0.6, marginTop: 12 },
  heroBody: { color: AppColors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 6 },
  timeBadge: { width: 58, height: 58, borderRadius: 20, backgroundColor: AppColors.mintDark, borderColor: AppColors.borderBright, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timeValue: { color: AppColors.mint, fontSize: 19, fontWeight: '900' },
  timeLabel: { color: AppColors.textDim, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  heroProgress: { gap: 8 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { color: AppColors.textMuted, fontSize: 11, fontWeight: '700' },
  metrics: { flexDirection: 'row', backgroundColor: AppColors.inkElevated, borderRadius: Radius.lg, borderWidth: 1, borderColor: AppColors.border, padding: Spacing.lg, gap: Spacing.sm },
  scenarioRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  inlinePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  cardTitle: { color: AppColors.text, fontSize: 16, fontWeight: '900', marginBottom: 4 },
  tutorCard: { gap: Spacing.lg },
  tutorHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  tutorAvatar: { width: 46, height: 46, borderRadius: 16, backgroundColor: AppColors.mint, alignItems: 'center', justifyContent: 'center' },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: AppColors.mint, shadowColor: AppColors.mint, shadowOpacity: 0.8, shadowRadius: 8 },
  askBox: { minHeight: 54, borderWidth: 1, borderColor: AppColors.borderBright, borderRadius: Radius.md, backgroundColor: AppColors.panel, flexDirection: 'row', alignItems: 'center', paddingLeft: Spacing.lg, paddingRight: 7 },
  askPlaceholder: { color: AppColors.textMuted, fontSize: 14, flex: 1 },
  sendButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: AppColors.mint, alignItems: 'center', justifyContent: 'center' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  suggestion: { backgroundColor: AppColors.panelSoft, paddingHorizontal: 11, paddingVertical: 8, borderRadius: Radius.pill },
  suggestionText: { color: AppColors.textMuted, fontSize: 11, fontWeight: '700' },
  destination: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  pressed: { opacity: 0.75 },
});
