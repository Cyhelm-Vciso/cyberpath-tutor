import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen, Card, CircleIcon, IconButton, Pill, PrimaryButton, ProgressBar, SectionHeader, Type } from '@/components/cyber/ui';
import { AppColors, Radius, Spacing } from '@/constants/theme';
import { roles } from '@/data/curriculum';
import { scenarios } from '@/data/scenarios';
import { DecisionQuality } from '@/domain/types';
import { useApp } from '@/state/app-context';

const qualityScore: Record<DecisionQuality, number> = { strong: 100, partial: 58, unsafe: 0 };

export default function ScenarioScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recordScenario } = useApp();
  const scenario = scenarios.find((item) => item.id === id);
  const [started, setStarted] = useState(false);
  const [decisionIndex, setDecisionIndex] = useState(0);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const visibleEvidence = useMemo(() => {
    if (!scenario) return [];
    const referenced = new Set(scenario.decisionPoints.slice(0, decisionIndex + 1).flatMap((decision) => decision.evidenceIds));
    return scenario.evidence.filter((evidence) => evidence.initiallyVisible || referenced.has(evidence.id));
  }, [scenario, decisionIndex]);

  if (!scenario) {
    return <AppScreen><IconButton icon="arrow-back" label="Go back" onPress={() => router.back()} /><Card><Text style={Type.heading}>Scenario not found</Text></Card></AppScreen>;
  }

  const activeScenario = scenario;
  const decision = activeScenario.decisionPoints[decisionIndex] ?? activeScenario.decisionPoints[0];
  const selectedOptionId = choices[decision.id];
  const selectedOption = decision.options.find((option) => option.id === selectedOptionId);
  const role = roles.find((item) => item.id === scenario.primaryRoleId);

  function choose(optionId: string) {
    if (selectedOptionId) return;
    setChoices((current) => ({ ...current, [decision.id]: optionId }));
    const quality = decision.options.find((option) => option.id === optionId)?.quality;
    const feedback = quality === 'strong' ? Haptics.NotificationFeedbackType.Success : quality === 'unsafe' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Warning;
    Haptics.notificationAsync(feedback).catch(() => undefined);
  }

  function advance() {
    if (!selectedOption) return;
    if (decisionIndex < activeScenario.decisionPoints.length - 1) {
      setDecisionIndex((current) => current + 1);
      return;
    }
    const score = Math.round(
      activeScenario.decisionPoints.reduce((sum, scoredDecision) => {
        const option = scoredDecision.options.find((item) => item.id === choices[scoredDecision.id]);
        return sum + (option ? qualityScore[option.quality] : 0);
      }, 0) / activeScenario.decisionPoints.length,
    );
    setFinalScore(score);
    setCompleted(true);
    recordScenario(activeScenario.id, score);
  }

  if (!started) {
    return (
      <AppScreen>
        <View style={styles.header}>
          <IconButton icon="close" label="Close scenario" onPress={() => router.back()} />
          <Pill label="Simulation briefing" tone="amber" icon="radio" />
          <Pill label={`${scenario.estimatedMinutes} min`} tone="neutral" icon="time" />
        </View>
        <View style={styles.briefHero}>
          <View style={styles.pulseOuter}><View style={styles.pulseInner}><Ionicons name="flash" size={34} color={AppColors.ink} /></View></View>
          <Pill label={scenario.difficulty} tone={scenario.difficulty === 'advanced' ? 'purple' : scenario.difficulty === 'intermediate' ? 'amber' : 'mint'} />
          <Text style={styles.title}>{scenario.title}</Text>
          <Text style={styles.subtitle}>{scenario.subtitle}</Text>
        </View>
        <Card style={styles.roleCard}>
          <CircleIcon name="person" color={AppColors.cyan} size={50} />
          <View style={styles.flex}>
            <Text style={styles.smallLabel}>YOU ARE THE</Text>
            <Text style={styles.roleTitle}>{role?.title ?? 'Security practitioner'}</Text>
            <Text style={Type.caption}>{scenario.setting}</Text>
          </View>
        </Card>
        <Card>
          <Text style={styles.cardLabel}>Mission brief</Text>
          <Text style={styles.briefText}>{scenario.learnerBrief}</Text>
        </Card>
        <SectionHeader title="Your objectives" />
        <Card>
          {scenario.objectives.map((objective, index) => (
            <View key={objective} style={styles.objectiveRow}>
              <View style={styles.objectiveNumber}><Text style={styles.objectiveNumberText}>{index + 1}</Text></View>
              <Text style={styles.objectiveText}>{objective}</Text>
            </View>
          ))}
        </Card>
        <Card style={styles.safetyCard}>
          <Ionicons name="shield-checkmark" size={23} color={AppColors.mint} />
          <Text style={styles.safetyText}>{scenario.safetyNote}</Text>
        </Card>
        <PrimaryButton label="Enter the simulation" icon="radio" onPress={() => setStarted(true)} />
      </AppScreen>
    );
  }

  if (completed) {
    const performance = finalScore >= 80 ? 'Job-ready judgment' : finalScore >= 55 ? 'Developing judgment' : 'Critical coaching needed';
    return (
      <AppScreen>
        <View style={styles.header}>
          <IconButton icon="close" label="Close debrief" onPress={() => router.back()} />
          <Pill label="Mission debrief" tone="mint" icon="checkmark-done" />
        </View>
        <View style={styles.scoreHero}>
          <View style={[styles.scoreRing, { borderColor: finalScore >= 80 ? AppColors.mint : finalScore >= 55 ? AppColors.amber : AppColors.red }]}>
            <Text style={styles.scoreValue}>{finalScore}</Text>
            <Text style={styles.scoreLabel}>SCORE</Text>
          </View>
          <Text style={styles.title}>{performance}</Text>
          <Text style={styles.subtitle}>Your score reflects evidence use, decision quality, execution, communication, and documentation.</Text>
        </View>
        <SectionHeader title="Ideal response path" />
        <Card>
          {scenario.idealResponseSteps.map((step, index) => (
            <View key={step} style={styles.idealRow}>
              <View style={styles.objectiveNumber}><Text style={styles.objectiveNumberText}>{index + 1}</Text></View>
              <Text style={styles.objectiveText}>{step}</Text>
            </View>
          ))}
        </Card>
        <SectionHeader title="Competency rubric" />
        <Card>
          {scenario.scoreDimensions.map((dimension, index) => (
            <View key={dimension.competencyId} style={styles.rubricRow}>
              <View style={styles.flex}>
                <Text style={styles.rubricTitle}>{dimension.label}</Text>
                <Text style={Type.caption}>{dimension.description}</Text>
              </View>
              <Pill label={finalScore >= 80 || index === 0 ? 'Demonstrated' : 'Practice'} tone={finalScore >= 80 || index === 0 ? 'mint' : 'amber'} />
            </View>
          ))}
        </Card>
        <PrimaryButton
          label="Debrief with AI tutor"
          icon="chatbubbles"
          onPress={() => router.push({ pathname: '/tutor', params: { mode: 'coach', scenarioId: scenario.id, prompt: `Debrief my ${scenario.title} simulation. I scored ${finalScore}. Ask me to reflect, then coach my reasoning.` } })}
        />
        <PrimaryButton
          label="Replay mission"
          icon="refresh"
          secondary
          onPress={() => { setChoices({}); setDecisionIndex(0); setCompleted(false); setFinalScore(0); }}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <IconButton icon="close" label="Exit simulation" onPress={() => router.back()} />
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle} numberOfLines={1}>{scenario.title}</Text>
          <Text style={styles.headerMeta}>Phase {decisionIndex + 1} of {scenario.decisionPoints.length} · {decision.phase}</Text>
        </View>
        <IconButton
          icon="chatbubble-ellipses"
          label="Open role-play tutor"
          onPress={() => router.push({ pathname: '/tutor', params: { mode: 'roleplay', scenarioId: scenario.id } })}
        />
      </View>
      <ProgressBar value={((decisionIndex + 1) / scenario.decisionPoints.length) * 100} color={AppColors.amber} />

      <View style={styles.phaseHero}>
        <Pill label={decision.phase} tone="amber" icon="radio" />
        <Text style={styles.phaseTitle}>{decision.title}</Text>
        <Text style={styles.phaseContext}>{decision.context}</Text>
      </View>

      <SectionHeader title="Evidence in view" action={`${visibleEvidence.length} artifacts`} />
      <View style={styles.evidenceList}>
        {visibleEvidence.map((evidence) => (
          <Card key={evidence.id} style={styles.evidenceCard}>
            <View style={styles.evidenceHeading}>
              <CircleIcon name={evidence.kind === 'log' || evidence.kind === 'alert' ? 'terminal' : 'document-text'} color={AppColors.cyan} />
              <View style={styles.flex}>
                <Text style={styles.evidenceTitle}>{evidence.title}</Text>
                <Text style={styles.evidenceKind}>{evidence.kind.replace('-', ' ')}</Text>
              </View>
            </View>
            <Text style={styles.evidenceContent}>{evidence.content}</Text>
          </Card>
        ))}
      </View>

      <Card style={styles.decisionCard}>
        <Text style={styles.cardLabel}>Decision required</Text>
        <Text style={styles.question}>{decision.prompt}</Text>
      </Card>

      <View style={styles.options}>
        {decision.options.map((option, index) => {
          const selected = selectedOptionId === option.id;
          const locked = !!selectedOptionId && !selected;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected, disabled: !!selectedOptionId }}
              disabled={!!selectedOptionId}
              onPress={() => choose(option.id)}
              style={({ pressed }) => [styles.option, selected && styles.optionSelected, locked && styles.optionLocked, pressed && styles.pressed]}>
              <View style={[styles.optionLetter, selected && styles.optionLetterSelected]}><Text style={[styles.optionLetterText, selected && styles.optionLetterTextSelected]}>{String.fromCharCode(65 + index)}</Text></View>
              <Text style={styles.optionText}>{option.label}</Text>
              {selected ? <Ionicons name={option.quality === 'strong' ? 'checkmark-circle' : option.quality === 'unsafe' ? 'close-circle' : 'alert-circle'} size={23} color={option.quality === 'strong' ? AppColors.mint : option.quality === 'unsafe' ? AppColors.red : AppColors.amber} /> : null}
            </Pressable>
          );
        })}
      </View>

      {selectedOption ? (
        <Card style={[styles.feedback, selectedOption.quality === 'strong' ? styles.feedbackStrong : selectedOption.quality === 'unsafe' ? styles.feedbackUnsafe : styles.feedbackPartial]}>
          <View style={styles.feedbackHeading}>
            <Ionicons name="sparkles" size={20} color={selectedOption.quality === 'strong' ? AppColors.mint : selectedOption.quality === 'unsafe' ? AppColors.red : AppColors.amber} />
            <Text style={styles.feedbackTitle}>{selectedOption.quality === 'strong' ? 'Sound judgment' : selectedOption.quality === 'unsafe' ? 'Unsafe decision' : 'Partially effective'}</Text>
          </View>
          <Text style={Type.bodyMuted}>{selectedOption.coachFeedback}</Text>
          {selectedOption.consequences.map((consequence) => <View key={consequence} style={styles.consequence}><View style={styles.consequenceDot} /><Text style={styles.consequenceText}>{consequence}</Text></View>)}
        </Card>
      ) : null}

      <PrimaryButton label={decisionIndex === scenario.decisionPoints.length - 1 ? 'Finish and score' : 'Continue to next phase'} disabled={!selectedOption} onPress={advance} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  headerCopy: { flex: 1 },
  headerTitle: { color: AppColors.text, fontSize: 14, fontWeight: '800' },
  headerMeta: { color: AppColors.textDim, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 3 },
  briefHero: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  pulseOuter: { width: 98, height: 98, borderRadius: 49, backgroundColor: '#493B20', borderColor: '#715C31', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pulseInner: { width: 70, height: 70, borderRadius: 35, backgroundColor: AppColors.amber, alignItems: 'center', justifyContent: 'center' },
  title: { color: AppColors.text, fontSize: 31, lineHeight: 37, fontWeight: '900', letterSpacing: -0.9, textAlign: 'center' },
  subtitle: { color: AppColors.textMuted, fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 620 },
  roleCard: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  smallLabel: { color: AppColors.textDim, fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  roleTitle: { color: AppColors.text, fontSize: 17, fontWeight: '900', marginVertical: 3 },
  cardLabel: { color: AppColors.amber, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  briefText: { color: AppColors.text, fontSize: 15, lineHeight: 23 },
  objectiveRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: 5 },
  objectiveNumber: { width: 28, height: 28, borderRadius: 10, backgroundColor: AppColors.mintDark, alignItems: 'center', justifyContent: 'center' },
  objectiveNumberText: { color: AppColors.mint, fontSize: 10, fontWeight: '900' },
  objectiveText: { color: AppColors.textMuted, fontSize: 13, lineHeight: 20, flex: 1 },
  safetyCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: '#0D2928' },
  safetyText: { color: AppColors.textMuted, fontSize: 12, lineHeight: 18, flex: 1 },
  phaseHero: { gap: Spacing.md, paddingVertical: Spacing.lg },
  phaseTitle: { color: AppColors.text, fontSize: 27, lineHeight: 32, fontWeight: '900', letterSpacing: -0.7 },
  phaseContext: { color: AppColors.textMuted, fontSize: 14, lineHeight: 22 },
  evidenceList: { gap: Spacing.sm },
  evidenceCard: { backgroundColor: '#091B21', gap: Spacing.md },
  evidenceHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  evidenceTitle: { color: AppColors.text, fontSize: 14, fontWeight: '900' },
  evidenceKind: { color: AppColors.cyan, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 },
  evidenceContent: { color: AppColors.textMuted, fontSize: 12, lineHeight: 19, fontFamily: 'monospace' },
  decisionCard: { backgroundColor: '#2D281B', borderColor: '#5C4A2B' },
  question: { color: AppColors.text, fontSize: 19, lineHeight: 26, fontWeight: '800' },
  options: { gap: Spacing.sm },
  option: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: AppColors.border, borderRadius: Radius.lg, backgroundColor: AppColors.inkElevated, padding: Spacing.lg },
  optionSelected: { borderColor: AppColors.mint, backgroundColor: '#0D2928' },
  optionLocked: { opacity: 0.42 },
  optionLetter: { width: 36, height: 36, borderRadius: 12, backgroundColor: AppColors.panel, alignItems: 'center', justifyContent: 'center' },
  optionLetterSelected: { backgroundColor: AppColors.mint },
  optionLetterText: { color: AppColors.textMuted, fontWeight: '900' },
  optionLetterTextSelected: { color: AppColors.ink },
  optionText: { color: AppColors.text, fontSize: 13, lineHeight: 19, flex: 1 },
  feedback: { gap: Spacing.md },
  feedbackStrong: { borderColor: AppColors.mint, backgroundColor: '#0D2928' },
  feedbackPartial: { borderColor: AppColors.amber, backgroundColor: '#2D281B' },
  feedbackUnsafe: { borderColor: AppColors.red, backgroundColor: '#321F20' },
  feedbackHeading: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  feedbackTitle: { color: AppColors.text, fontSize: 15, fontWeight: '900' },
  consequence: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  consequenceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: AppColors.textDim, marginTop: 6 },
  consequenceText: { color: AppColors.textMuted, fontSize: 12, lineHeight: 18, flex: 1 },
  scoreHero: { alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.xl },
  scoreRing: { width: 124, height: 124, borderRadius: 62, borderWidth: 10, backgroundColor: AppColors.panel, alignItems: 'center', justifyContent: 'center' },
  scoreValue: { color: AppColors.text, fontSize: 38, fontWeight: '900', letterSpacing: -1.3 },
  scoreLabel: { color: AppColors.textDim, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  idealRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: 6 },
  rubricRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 7 },
  rubricTitle: { color: AppColors.text, fontSize: 14, fontWeight: '800', marginBottom: 3 },
  pressed: { opacity: 0.72 },
});
