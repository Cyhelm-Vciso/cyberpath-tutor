import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppScreen,
  BrandMark,
  Card,
  Chip,
  CircleIcon,
  GradientCard,
  Pill,
  PrimaryButton,
  ProgressBar,
  Type,
} from '@/components/cyber/ui';
import { AppColors, Radius, Spacing } from '@/constants/theme';
import { ExperienceLevel, LearningGoal, useApp } from '@/state/app-context';

const targetOptions = [
  { id: 'soc-analyst', title: 'Security Operations', detail: 'SOC analyst · Threat hunter · SOC manager', icon: 'pulse' as const, color: AppColors.mint },
  { id: 'incident-responder', title: 'Incident Response', detail: 'Responder · Forensics · Incident commander', icon: 'flame' as const, color: AppColors.amber },
  { id: 'cybersecurity-engineer', title: 'Engineering & Architecture', detail: 'Security engineer · Principal architect', icon: 'construct' as const, color: AppColors.cyan },
  { id: 'junior-penetration-tester', title: 'Offensive Security', detail: 'Penetration tester · Vulnerability analyst', icon: 'bug' as const, color: AppColors.red },
  { id: 'grc-analyst', title: 'Risk, Audit & Privacy', detail: 'GRC · Auditor · Risk · Privacy · Consultant', icon: 'document-lock' as const, color: AppColors.purple },
  { id: 'ciso', title: 'Leadership & CISO', detail: 'Security manager · CISO · Executive advisor', icon: 'people' as const, color: AppColors.blue },
];

const experienceOptions: { id: ExperienceLevel; label: string }[] = [
  { id: 'explorer', label: 'New to cyber' },
  { id: 'it-professional', label: 'IT professional' },
  { id: 'security-practitioner', label: 'Security practitioner' },
  { id: 'leader', label: 'Manager / leader' },
];

const goalOptions: { id: LearningGoal; label: string }[] = [
  { id: 'explore', label: 'Explore careers' },
  { id: 'first-role', label: 'Land my first role' },
  { id: 'specialize', label: 'Change specialism' },
  { id: 'promotion', label: 'Prepare for promotion' },
  { id: 'interview', label: 'Ace interviews' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { finishOnboarding } = useApp();
  const [step, setStep] = useState(0);
  const [targetIds, setTargetIds] = useState<string[]>(['soc-analyst']);
  const [experience, setExperience] = useState<ExperienceLevel>('explorer');
  const [goal, setGoal] = useState<LearningGoal>('first-role');
  const [weeklyHours, setWeeklyHours] = useState(5);

  const planWeeks = useMemo(() => Math.max(8, Math.round(60 / weeklyHours)), [weeklyHours]);

  function next() {
    Haptics.selectionAsync().catch(() => undefined);
    setStep((current) => Math.min(3, current + 1));
  }

  function toggleTarget(id: string) {
    setTargetIds((current) => {
      if (current.includes(id)) return current.length === 1 ? current : current.filter((item) => item !== id);
      return [...current, id].slice(-3);
    });
  }

  function launchPlan() {
    finishOnboarding({
      targetRoleIds: targetIds,
      primaryRoleId: targetIds[0],
      experience,
      goal,
      weeklyHours,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    router.replace('/(tabs)');
  }

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <BrandMark />
        <Pill label={step === 0 ? 'Career cockpit' : `${step} of 3`} tone="mint" />
      </View>
      {step > 0 ? <ProgressBar value={(step / 3) * 100} /> : null}

      {step === 0 ? (
        <>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>YOUR CYBER CAREER, SIMULATED</Text>
            <Text style={styles.heroTitle}>Learn the job by doing the job.</Text>
            <Text style={styles.heroBody}>
              A virtual tutor that explains the whole picture, gives you realistic work, plays every stakeholder, and shows exactly how to improve.
            </Text>
          </View>
          <GradientCard>
            <View style={styles.missionTop}>
              <CircleIcon name="shield-checkmark" size={50} />
              <View style={styles.flex}>
                <Pill label="Live simulation" tone="mint" icon="radio" />
                <Text style={styles.missionTitle}>Ransomware command room</Text>
              </View>
            </View>
            <View style={styles.signalRow}>
              <Signal icon="school" text="Tutor explains" />
              <Signal icon="chatbubbles" text="Stakeholders react" />
              <Signal icon="analytics" text="Evidence scores" />
            </View>
          </GradientCard>
          <View style={styles.featureGrid}>
            <MiniFeature icon="map" title="Role roadmaps" body="Junior to CISO" />
            <MiniFeature icon="flash" title="Role-play" body="Safe, realistic cases" />
            <MiniFeature icon="stats-chart" title="Skill evidence" body="Readiness you can trust" />
          </View>
          <PrimaryButton label="Build my career path" onPress={next} />
          <Text style={styles.footnote}>No hiring guarantees. Your plan stays editable.</Text>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <View style={styles.stepCopy}>
            <Text style={Type.eyebrow}>Choose up to three</Text>
            <Text style={Type.title}>Where do you want to operate?</Text>
            <Text style={Type.bodyMuted}>Start broad. Your tutor will reveal stepping-stone and adjacent roles.</Text>
          </View>
          <View style={styles.optionList}>
            {targetOptions.map((option) => {
              const selected = targetIds.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityLabel={option.title}
                  accessibilityState={{ selected }}
                  onPress={() => toggleTarget(option.id)}
                  style={({ pressed }) => [styles.roleOption, selected && styles.roleOptionSelected, pressed && styles.pressed]}>
                  <CircleIcon name={option.icon} color={option.color} />
                  <View style={styles.flex}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDetail}>{option.detail}</Text>
                  </View>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={selected ? AppColors.mint : AppColors.textDim}
                  />
                </Pressable>
              );
            })}
          </View>
          <PrimaryButton label="Continue" onPress={next} />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <View style={styles.stepCopy}>
            <Text style={Type.eyebrow}>Calibrate your plan</Text>
            <Text style={Type.title}>Meet you where you are.</Text>
            <Text style={Type.bodyMuted}>You can change these settings at any time.</Text>
          </View>
          <Card>
            <Text style={styles.question}>What best describes you?</Text>
            <View style={styles.chips}>
              {experienceOptions.map((option) => (
                <Chip key={option.id} label={option.label} selected={experience === option.id} onPress={() => setExperience(option.id)} />
              ))}
            </View>
          </Card>
          <Card>
            <Text style={styles.question}>What is your immediate goal?</Text>
            <View style={styles.chips}>
              {goalOptions.map((option) => (
                <Chip key={option.id} label={option.label} selected={goal === option.id} onPress={() => setGoal(option.id)} />
              ))}
            </View>
          </Card>
          <Card>
            <View style={styles.hoursHeader}>
              <View>
                <Text style={styles.question}>Time per week</Text>
                <Text style={Type.bodyMuted}>Consistency beats intensity.</Text>
              </View>
              <Text style={styles.hoursValue}>{weeklyHours}h</Text>
            </View>
            <View style={styles.hoursRow}>
              {[2, 5, 8, 12].map((hours) => (
                <Chip key={hours} label={`${hours} hours`} selected={weeklyHours === hours} onPress={() => setWeeklyHours(hours)} />
              ))}
            </View>
          </Card>
          <PrimaryButton label="Create my plan" onPress={next} />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <View style={styles.completeIcon}>
            <LinearCheck />
          </View>
          <View style={[styles.stepCopy, styles.center]}>
            <Text style={Type.eyebrow}>Your path is ready</Text>
            <Text style={[Type.title, styles.centerText]}>From foundations to job-ready judgment.</Text>
            <Text style={[Type.bodyMuted, styles.centerText]}>
              Your first plan spans about {planWeeks} focused weeks and adapts as you demonstrate skills.
            </Text>
          </View>
          <GradientCard>
            <PlanRow number="01" title="Foundation sprint" detail="Networks, identity, systems, cloud and core security" />
            <PlanRow number="02" title="Role rotations" detail="See how operations, engineering, risk and leadership connect" />
            <PlanRow number="03" title="Primary pathway" detail="Guided practice, independent decisions and role-play" />
            <PlanRow number="04" title="Capstone" detail="Handle one incident from signal to board briefing" last />
          </GradientCard>
          <PrimaryButton label="Enter my cockpit" icon="rocket" onPress={launchPlan} />
          <PrimaryButton label="Back and adjust" icon="arrow-back" secondary onPress={() => setStep(2)} />
        </>
      ) : null}
    </AppScreen>
  );
}

function Signal({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.signal}>
      <Ionicons name={icon} size={15} color={AppColors.mint} />
      <Text style={styles.signalText}>{text}</Text>
    </View>
  );
}

function MiniFeature({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return (
    <View style={styles.miniFeature}>
      <Ionicons name={icon} size={21} color={AppColors.mint} />
      <Text style={styles.miniTitle}>{title}</Text>
      <Text style={styles.miniBody}>{body}</Text>
    </View>
  );
}

function LinearCheck() {
  return (
    <View style={styles.checkOuter}>
      <View style={styles.checkInner}>
        <Ionicons name="checkmark" size={38} color={AppColors.ink} />
      </View>
    </View>
  );
}

function PlanRow({ number, title, detail, last }: { number: string; title: string; detail: string; last?: boolean }) {
  return (
    <View style={styles.planRow}>
      <View style={styles.planRail}>
        <View style={styles.planDot}><Text style={styles.planNumber}>{number}</Text></View>
        {!last ? <View style={styles.planLine} /> : null}
      </View>
      <View style={styles.planCopy}>
        <Text style={styles.planTitle}>{title}</Text>
        <Text style={styles.planDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: Spacing.lg, gap: Spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroCopy: { gap: Spacing.md, paddingTop: Spacing.xl },
  kicker: { color: AppColors.mint, fontSize: 12, fontWeight: '900', letterSpacing: 1.6 },
  heroTitle: { color: AppColors.text, fontSize: 42, lineHeight: 46, letterSpacing: -1.6, fontWeight: '900', maxWidth: 560 },
  heroBody: { color: AppColors.textMuted, fontSize: 17, lineHeight: 26, maxWidth: 620 },
  missionTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  missionTitle: { color: AppColors.text, fontSize: 19, fontWeight: '800', marginTop: 7 },
  flex: { flex: 1 },
  signalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  signal: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#0A1F24AA', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 7 },
  signalText: { color: AppColors.textMuted, fontSize: 11, fontWeight: '700' },
  featureGrid: { flexDirection: 'row', gap: Spacing.sm },
  miniFeature: { flex: 1, minHeight: 112, backgroundColor: AppColors.inkElevated, borderColor: AppColors.border, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: 6 },
  miniTitle: { color: AppColors.text, fontWeight: '800', fontSize: 13 },
  miniBody: { color: AppColors.textDim, fontSize: 11, lineHeight: 15 },
  footnote: { color: AppColors.textDim, textAlign: 'center', fontSize: 11 },
  stepCopy: { gap: Spacing.sm, paddingTop: Spacing.md },
  optionList: { gap: Spacing.sm },
  roleOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.inkElevated, borderRadius: Radius.lg, padding: Spacing.lg },
  roleOptionSelected: { borderColor: AppColors.mint, backgroundColor: '#0D2C2B' },
  optionTitle: { color: AppColors.text, fontWeight: '800', fontSize: 15, marginBottom: 4 },
  optionDetail: { color: AppColors.textMuted, fontSize: 12, lineHeight: 17 },
  pressed: { opacity: 0.75 },
  question: { color: AppColors.text, fontWeight: '800', fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  hoursHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hoursValue: { color: AppColors.mint, fontSize: 27, fontWeight: '900' },
  hoursRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  completeIcon: { alignItems: 'center', paddingTop: Spacing.md },
  checkOuter: { width: 94, height: 94, borderRadius: 47, borderWidth: 1, borderColor: AppColors.borderBright, backgroundColor: AppColors.mintDark, alignItems: 'center', justifyContent: 'center' },
  checkInner: { width: 68, height: 68, borderRadius: 34, backgroundColor: AppColors.mint, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center' },
  centerText: { textAlign: 'center', maxWidth: 560 },
  planRow: { flexDirection: 'row', minHeight: 76 },
  planRail: { width: 42, alignItems: 'center' },
  planDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: AppColors.mintDark, borderColor: AppColors.borderBright, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  planNumber: { color: AppColors.mint, fontSize: 10, fontWeight: '900' },
  planLine: { width: 1, flex: 1, backgroundColor: AppColors.borderBright },
  planCopy: { flex: 1, paddingLeft: Spacing.md, paddingBottom: Spacing.lg },
  planTitle: { color: AppColors.text, fontSize: 15, fontWeight: '800', marginBottom: 5 },
  planDetail: { color: AppColors.textMuted, fontSize: 12, lineHeight: 18 },
});
