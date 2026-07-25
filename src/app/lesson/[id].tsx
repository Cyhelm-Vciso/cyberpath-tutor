import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen, Card, CircleIcon, IconButton, Pill, PrimaryButton, ProgressBar, Type } from '@/components/cyber/ui';
import { AppColors, Radius, Spacing } from '@/constants/theme';
import { starterModules } from '@/data/curriculum';
import { useApp } from '@/state/app-context';

const stages = [
  { label: 'Brief', icon: 'flag' as const },
  { label: 'Learn', icon: 'school' as const },
  { label: 'Check', icon: 'help-circle' as const },
  { label: 'Apply', icon: 'construct' as const },
  { label: 'Debrief', icon: 'checkmark-done' as const },
];

export default function LessonScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { progress, completeLesson } = useApp();
  const match = starterModules
    .flatMap((module) => module.lessons.map((lesson) => ({ lesson, module })))
    .find((item) => item.lesson.id === id);
  const [stage, setStage] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);

  if (!match) {
    return (
      <AppScreen><IconButton icon="arrow-back" label="Go back" onPress={() => router.back()} /><Card><Text style={Type.heading}>Lesson not found</Text></Card></AppScreen>
    );
  }

  const { lesson, module } = match;
  const alreadyComplete = progress.completedLessonIds.includes(lesson.id);
  const answerOptions = [
    { text: 'Act quickly before gathering evidence or understanding the goal.', correct: false },
    { text: lesson.completionEvidence, correct: true },
    { text: 'Memorize the terminology but avoid applying it to a workplace decision.', correct: false },
  ];

  function advance() {
    Haptics.selectionAsync().catch(() => undefined);
    if (stage < stages.length - 1) setStage((current) => current + 1);
  }

  function finish() {
    completeLesson(lesson.id, lesson.estimatedMinutes);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    router.back();
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <IconButton icon="close" label="Close lesson" onPress={() => router.back()} />
        <View style={styles.headerCopy}>
          <Text style={styles.headerLabel}>{module.title}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{lesson.title}</Text>
        </View>
        <Pill label={`${lesson.estimatedMinutes} min`} tone="neutral" icon="time" />
      </View>

      <View style={styles.stageRow}>
        {stages.map((item, index) => (
          <View key={item.label} style={styles.stageItem}>
            <View style={[styles.stageDot, index <= stage && styles.stageDotActive]}>
              <Ionicons name={item.icon} size={14} color={index <= stage ? AppColors.ink : AppColors.textDim} />
            </View>
            <Text style={[styles.stageLabel, index === stage && styles.stageLabelActive]}>{item.label}</Text>
          </View>
        ))}
      </View>
      <ProgressBar value={((stage + 1) / stages.length) * 100} />

      {stage === 0 ? (
        <>
          <View style={styles.heroIcon}><CircleIcon name="flag" size={70} color={AppColors.mint} /></View>
          <View style={styles.centerCopy}>
            <Pill label={lesson.format.replace('-', ' ')} tone="blue" />
            <Text style={styles.title}>{lesson.title}</Text>
            <Text style={styles.lead}>{lesson.summary}</Text>
          </View>
          <Card>
            <Text style={styles.cardLabel}>By the end, you can</Text>
            {lesson.objectives.map((objective) => <Bullet key={objective} text={objective} />)}
          </Card>
        </>
      ) : null}

      {stage === 1 ? (
        <>
          <View style={styles.sectionIntro}>
            <Pill label="Workplace lens" tone="mint" icon="briefcase" />
            <Text style={styles.title}>Build the mental model.</Text>
            <Text style={styles.lead}>{lesson.summary}</Text>
          </View>
          {lesson.objectives.map((objective, index) => (
            <Card key={objective}>
              <View style={styles.learningHeading}>
                <View style={styles.number}><Text style={styles.numberText}>{String(index + 1).padStart(2, '0')}</Text></View>
                <Text style={styles.learningTitle}>{objective}</Text>
              </View>
              <Text style={Type.bodyMuted}>
                In practice, this means separating facts from assumptions, connecting the action to business impact, and documenting enough evidence for the next person to continue the work.
              </Text>
            </Card>
          ))}
          <Card style={styles.callout}>
            <Ionicons name="bulb" size={22} color={AppColors.amber} />
            <Text style={styles.calloutText}>Strong practitioners can explain not only what to do, but why, when to escalate, and how to verify the outcome.</Text>
          </Card>
        </>
      ) : null}

      {stage === 2 ? (
        <>
          <View style={styles.sectionIntro}>
            <Pill label="Decision check" tone="amber" icon="help-circle" />
            <Text style={styles.title}>Which approach best proves the skill?</Text>
            <Text style={styles.lead}>Choose the strongest workplace response.</Text>
          </View>
          <View style={styles.answers}>
            {answerOptions.map((option, index) => {
              const selected = answer === index;
              return (
                <Pressable
                  key={option.text}
                  accessibilityRole="button"
                  accessibilityLabel={option.text}
                  accessibilityState={{ selected }}
                  onPress={() => setAnswer(index)}
                  style={({ pressed }) => [styles.answer, selected && styles.answerSelected, pressed && styles.pressed]}>
                  <View style={[styles.answerLetter, selected && styles.answerLetterSelected]}><Text style={[styles.answerLetterText, selected && styles.answerLetterTextSelected]}>{String.fromCharCode(65 + index)}</Text></View>
                  <Text style={styles.answerText}>{option.text}</Text>
                  {selected ? <Ionicons name={option.correct ? 'checkmark-circle' : 'alert-circle'} size={22} color={option.correct ? AppColors.mint : AppColors.amber} /> : null}
                </Pressable>
              );
            })}
          </View>
          {answer !== null ? (
            <Card style={answerOptions[answer].correct ? styles.correct : styles.coach}>
              <Text style={styles.feedbackTitle}>{answerOptions[answer].correct ? 'Strong choice' : 'Coach note'}</Text>
              <Text style={Type.bodyMuted}>{answerOptions[answer].correct ? 'This creates observable evidence and connects knowledge to safe execution.' : 'Speed or memorization alone is not competence. Look for the option that creates verifiable workplace evidence.'}</Text>
            </Card>
          ) : null}
        </>
      ) : null}

      {stage === 3 ? (
        <>
          <View style={styles.sectionIntro}>
            <Pill label="Apply it" tone="purple" icon="construct" />
            <Text style={styles.title}>Turn knowledge into an artifact.</Text>
            <Text style={styles.lead}>{lesson.activity}</Text>
          </View>
          <Card>
            <Text style={styles.cardLabel}>Your work product</Text>
            <Text style={styles.artifact}>{lesson.completionEvidence}</Text>
            <View style={styles.artifactSteps}>
              <Bullet text="State the objective and what is known." />
              <Bullet text="Show your reasoning, decision, and tradeoffs." />
              <Bullet text="Define how the outcome will be verified and handed off." />
            </View>
          </Card>
          <Card style={styles.callout}>
            <Ionicons name="shield-checkmark" size={22} color={AppColors.mint} />
            <Text style={styles.calloutText}>Use fictional examples only. Never include real credentials, private logs, or sensitive employer information.</Text>
          </Card>
        </>
      ) : null}

      {stage === 4 ? (
        <>
          <View style={styles.completeMark}><Ionicons name="checkmark-done" size={42} color={AppColors.ink} /></View>
          <View style={styles.centerCopy}>
            <Pill label={alreadyComplete ? 'Refreshed' : 'Evidence earned'} tone="mint" icon="ribbon" />
            <Text style={styles.title}>Close the loop.</Text>
            <Text style={styles.lead}>You can now explain the concept, recognize the judgment call, and produce evidence of the skill.</Text>
          </View>
          <Card>
            <Text style={styles.cardLabel}>Evidence recorded</Text>
            <Text style={styles.artifact}>{lesson.completionEvidence}</Text>
            <View style={styles.rewardRow}>
              <Pill label="+80 XP" tone="mint" icon="sparkles" />
              <Pill label={`${lesson.estimatedMinutes} min practiced`} tone="blue" icon="time" />
            </View>
          </Card>
        </>
      ) : null}

      <View style={styles.footer}>
        {stage > 0 ? <PrimaryButton label="Back" icon="arrow-back" secondary onPress={() => setStage((current) => current - 1)} style={styles.backButton} /> : null}
        <PrimaryButton
          label={stage === stages.length - 1 ? (alreadyComplete ? 'Return to path' : 'Complete lesson') : 'Continue'}
          icon={stage === stages.length - 1 ? 'checkmark' : 'arrow-forward'}
          disabled={stage === 2 && answer === null}
          onPress={stage === stages.length - 1 ? finish : advance}
          style={styles.flex}
        />
      </View>
    </AppScreen>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerCopy: { flex: 1 },
  headerLabel: { color: AppColors.mint, fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  headerTitle: { color: AppColors.text, fontSize: 14, fontWeight: '800', marginTop: 3 },
  stageRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stageItem: { alignItems: 'center', gap: 5, flex: 1 },
  stageDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: AppColors.panel, borderWidth: 1, borderColor: AppColors.border, alignItems: 'center', justifyContent: 'center' },
  stageDotActive: { backgroundColor: AppColors.mint, borderColor: AppColors.mint },
  stageLabel: { color: AppColors.textDim, fontSize: 9, fontWeight: '700' },
  stageLabelActive: { color: AppColors.mint },
  heroIcon: { alignItems: 'center', paddingTop: Spacing.xl },
  centerCopy: { alignItems: 'center', gap: Spacing.md },
  sectionIntro: { gap: Spacing.md, paddingTop: Spacing.lg },
  title: { color: AppColors.text, fontSize: 29, lineHeight: 35, fontWeight: '900', letterSpacing: -0.8, textAlign: 'center' },
  lead: { color: AppColors.textMuted, fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 620 },
  cardLabel: { color: AppColors.mint, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: 5 },
  bulletDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: AppColors.mint, marginTop: 7 },
  bulletText: { color: AppColors.textMuted, fontSize: 14, lineHeight: 21, flex: 1 },
  learningHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  number: { width: 34, height: 34, borderRadius: 11, backgroundColor: AppColors.mintDark, alignItems: 'center', justifyContent: 'center' },
  numberText: { color: AppColors.mint, fontSize: 10, fontWeight: '900' },
  learningTitle: { color: AppColors.text, fontSize: 15, lineHeight: 21, fontWeight: '800', flex: 1 },
  callout: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: '#2D281B' },
  calloutText: { color: AppColors.textMuted, fontSize: 13, lineHeight: 20, flex: 1 },
  answers: { gap: Spacing.sm },
  answer: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: AppColors.border, borderRadius: Radius.lg, backgroundColor: AppColors.inkElevated, padding: Spacing.lg },
  answerSelected: { borderColor: AppColors.mint, backgroundColor: '#0D2928' },
  answerLetter: { width: 34, height: 34, borderRadius: 12, backgroundColor: AppColors.panel, alignItems: 'center', justifyContent: 'center' },
  answerLetterSelected: { backgroundColor: AppColors.mint },
  answerLetterText: { color: AppColors.textMuted, fontWeight: '900' },
  answerLetterTextSelected: { color: AppColors.ink },
  answerText: { color: AppColors.text, fontSize: 13, lineHeight: 19, flex: 1 },
  correct: { borderColor: AppColors.mint, backgroundColor: '#0D2928' },
  coach: { borderColor: AppColors.amber, backgroundColor: '#2D281B' },
  feedbackTitle: { color: AppColors.text, fontSize: 14, fontWeight: '900' },
  artifact: { color: AppColors.text, fontSize: 18, lineHeight: 25, fontWeight: '800' },
  artifactSteps: { marginTop: Spacing.sm },
  completeMark: { width: 82, height: 82, borderRadius: 41, backgroundColor: AppColors.mint, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: Spacing.xl },
  rewardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  footer: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  backButton: { width: 108 },
  pressed: { opacity: 0.72 },
});
