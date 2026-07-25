import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppScreen, Card, Chip, CircleIcon, Pill, ProgressBar, SectionHeader, TopBar, Type } from '@/components/cyber/ui';
import { AppColors, Radius, Spacing } from '@/constants/theme';
import { careerFamilyIcons } from '@/constants/career-icons';
import { careerFamilies, roles, starterModules } from '@/data/curriculum';
import { CareerFamilyId } from '@/domain/types';
import { useApp } from '@/state/app-context';

export default function PathScreen() {
  const router = useRouter();
  const { profile, progress } = useApp();
  const primary = roles.find((role) => role.id === profile.primaryRoleId) ?? roles[0];
  const [familyId, setFamilyId] = useState<CareerFamilyId>(primary.familyId);
  const selectedFamily = careerFamilies.find((family) => family.id === familyId) ?? careerFamilies[0];
  const familyRoles = useMemo(() => roles.filter((role) => role.familyId === selectedFamily.id), [selectedFamily.id]);
  const allLessonCount = starterModules.reduce((total, module) => total + module.lessons.length, 0);

  return (
    <AppScreen>
      <TopBar eyebrow="Adaptive career map" title="Your path" right={<Pill label="Editable" tone="blue" icon="options" />} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.familyChips}>
        {careerFamilies.map((family) => (
          <Chip key={family.id} label={family.shortTitle} selected={family.id === selectedFamily.id} onPress={() => setFamilyId(family.id)} />
        ))}
      </ScrollView>

      <Card style={[styles.familyHero, { borderColor: selectedFamily.accentColor }]}>
        <CircleIcon name={careerFamilyIcons[selectedFamily.id]} color={selectedFamily.accentColor} size={58} />
        <View style={styles.flex}>
          <Text style={styles.familyTitle}>{selectedFamily.title}</Text>
          <Text style={Type.bodyMuted}>{selectedFamily.description}</Text>
          <Text style={styles.outcome}>{selectedFamily.outcome}</Text>
        </View>
      </Card>

      <SectionHeader title="Role ladder" action={`${familyRoles.length} roles`} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleRail}>
        {familyRoles.map((role, index) => {
          const selected = role.id === profile.primaryRoleId;
          return (
            <Pressable
              key={role.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${role.title} role brief`}
              onPress={() => router.push({ pathname: '/role/[id]', params: { id: role.id } })}
              style={({ pressed }) => [styles.roleCard, selected && styles.roleCardSelected, pressed && styles.pressed]}>
              <View style={styles.roleIndex}><Text style={styles.roleIndexText}>{String(index + 1).padStart(2, '0')}</Text></View>
              {selected ? <Pill label="Your target" tone="mint" /> : <Pill label={role.level.replace('-', ' ')} tone="neutral" />}
              <Text style={styles.roleTitle}>{role.title}</Text>
              <Text style={styles.roleSummary} numberOfLines={3}>{role.summary}</Text>
              <View style={styles.roleFooter}>
                <Text style={styles.openLabel}>Role brief</Text>
                <Ionicons name="arrow-forward" size={16} color={AppColors.mint} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionHeader title="End-to-end curriculum" action={`${progress.completedLessonIds.length}/${allLessonCount} lessons`} />
      <Card style={styles.roadmap}>
        {starterModules.map((module, index) => {
          const completed = module.lessons.filter((lesson) => progress.completedLessonIds.includes(lesson.id)).length;
          const nextLesson = module.lessons.find((lesson) => !progress.completedLessonIds.includes(lesson.id)) ?? module.lessons[0];
          const locked = index > 0 && !starterModules[index - 1].lessons.some((lesson) => progress.completedLessonIds.includes(lesson.id));
          return (
            <Pressable
              key={module.id}
              accessibilityRole="button"
              accessibilityLabel={`${locked ? 'Locked: ' : 'Open module: '}${module.title}`}
              accessibilityState={{ disabled: locked }}
              disabled={locked}
              onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: nextLesson.id } })}
              style={({ pressed }) => [styles.moduleRow, index < starterModules.length - 1 && styles.moduleBorder, locked && styles.locked, pressed && styles.pressed]}>
              <View style={styles.moduleRail}>
                <View style={[styles.moduleDot, completed > 0 && styles.moduleDotActive]}>
                  {completed === module.lessons.length ? <Ionicons name="checkmark" size={18} color={AppColors.ink} /> : <Text style={styles.moduleNumber}>{module.sequence}</Text>}
                </View>
                {index < starterModules.length - 1 ? <View style={[styles.moduleLine, completed > 0 && styles.moduleLineActive]} /> : null}
              </View>
              <View style={styles.moduleCopy}>
                <View style={styles.moduleTitleRow}>
                  <View style={styles.flex}>
                    <Text style={styles.moduleTitle}>{module.title}</Text>
                    <Text style={styles.moduleMeta}>{module.estimatedMinutes} min · {module.lessons.length} lessons</Text>
                  </View>
                  {locked ? <Ionicons name="lock-closed" size={17} color={AppColors.textDim} /> : <Ionicons name="chevron-forward" size={19} color={AppColors.textDim} />}
                </View>
                <Text style={Type.bodyMuted}>{module.summary}</Text>
                <ProgressBar value={(completed / module.lessons.length) * 100} color={index === 3 ? AppColors.amber : AppColors.mint} />
              </View>
            </Pressable>
          );
        })}
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  familyChips: { gap: Spacing.sm, paddingRight: Spacing.lg },
  familyHero: { flexDirection: 'row', gap: Spacing.lg, padding: Spacing.xl, borderWidth: 1 },
  familyTitle: { color: AppColors.text, fontSize: 22, lineHeight: 27, fontWeight: '900', marginBottom: 7 },
  outcome: { color: AppColors.mint, fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 8 },
  roleRail: { gap: Spacing.md, paddingRight: Spacing.lg },
  roleCard: { width: 230, minHeight: 218, borderRadius: Radius.lg, borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.inkElevated, padding: Spacing.lg, gap: Spacing.sm },
  roleCardSelected: { borderColor: AppColors.mint, backgroundColor: '#0D2B2B' },
  roleIndex: { position: 'absolute', top: 14, right: 14 },
  roleIndexText: { color: AppColors.textDim, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  roleTitle: { color: AppColors.text, fontSize: 17, lineHeight: 22, fontWeight: '900', marginTop: 4 },
  roleSummary: { color: AppColors.textMuted, fontSize: 12, lineHeight: 18, flex: 1 },
  roleFooter: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  openLabel: { color: AppColors.mint, fontSize: 12, fontWeight: '800' },
  roadmap: { padding: 0, overflow: 'hidden', gap: 0 },
  moduleRow: { flexDirection: 'row', minHeight: 154, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  moduleBorder: { borderBottomWidth: 1, borderBottomColor: AppColors.border },
  moduleRail: { width: 44, alignItems: 'center' },
  moduleDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: AppColors.panelSoft, borderWidth: 1, borderColor: AppColors.border, alignItems: 'center', justifyContent: 'center' },
  moduleDotActive: { backgroundColor: AppColors.mint, borderColor: AppColors.mint },
  moduleNumber: { color: AppColors.textMuted, fontSize: 12, fontWeight: '900' },
  moduleLine: { width: 2, flex: 1, backgroundColor: AppColors.border, marginTop: 5 },
  moduleLineActive: { backgroundColor: AppColors.mintDark },
  moduleCopy: { flex: 1, gap: 8, paddingLeft: Spacing.md, paddingBottom: Spacing.lg },
  moduleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  moduleTitle: { color: AppColors.text, fontSize: 16, fontWeight: '900', marginBottom: 3 },
  moduleMeta: { color: AppColors.textDim, fontSize: 10, fontWeight: '700' },
  locked: { opacity: 0.48 },
  pressed: { opacity: 0.72 },
});
