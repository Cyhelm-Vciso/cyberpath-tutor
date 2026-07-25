import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen, Card, CircleIcon, IconButton, Pill, PrimaryButton, SectionHeader, Type } from '@/components/cyber/ui';
import { AppColors, Spacing } from '@/constants/theme';
import { careerFamilyIcons } from '@/constants/career-icons';
import { careerFamilies, coreCompetencies, roles } from '@/data/curriculum';

export default function RoleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const role = roles.find((item) => item.id === id);

  if (!role) {
    return (
      <AppScreen>
        <View style={styles.header}><IconButton icon="arrow-back" label="Go back" onPress={() => router.back()} /></View>
        <Card><Text style={Type.heading}>Role not found</Text><Text style={Type.bodyMuted}>This role may have moved in the career map.</Text></Card>
      </AppScreen>
    );
  }

  const family = careerFamilies.find((item) => item.id === role.familyId);
  const recommendedCompetencies = new Set<string>(role.recommendedCompetencyIds);
  const competencies = coreCompetencies.filter((item) => recommendedCompetencies.has(item.id));
  const getRoleTitle = (roleId: string) => roles.find((item) => item.id === roleId)?.title ?? roleId;

  return (
    <AppScreen>
      <View style={styles.header}>
        <IconButton icon="arrow-back" label="Go back" onPress={() => router.back()} />
        <Pill label={role.level.replace('-', ' ')} tone="purple" icon="ribbon" />
      </View>

      <View style={styles.hero}>
        <CircleIcon name={family ? careerFamilyIcons[family.id] : 'shield'} color={family?.accentColor ?? AppColors.mint} size={68} />
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>{family?.title ?? 'Cybersecurity career'}</Text>
          <Text style={styles.title}>{role.title}</Text>
          <Text style={styles.summary}>{role.summary}</Text>
        </View>
      </View>

      <Card style={styles.missionCard}>
        <Ionicons name="locate" size={23} color={AppColors.mint} />
        <View style={styles.flex}>
          <Text style={styles.smallLabel}>THE MISSION</Text>
          <Text style={styles.mission}>{role.mission}</Text>
        </View>
      </Card>

      <PrimaryButton
        label="Ask tutor about this role"
        icon="chatbubble-ellipses"
        onPress={() => router.push({ pathname: '/tutor', params: { mode: 'teacher', roleId: role.id, prompt: `Explain the ${role.title} career end to end, including a typical day, skills, progression, and how to prepare.` } })}
      />

      <SectionHeader title="What you do end to end" />
      <Card>
        {role.typicalResponsibilities.map((responsibility, index) => (
          <InfoRow key={responsibility} index={index + 1} text={responsibility} />
        ))}
      </Card>

      <SectionHeader title="What good looks like" />
      <Card>
        {role.successSignals.map((signal) => (
          <View key={signal} style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={19} color={AppColors.mint} />
            <Text style={styles.rowText}>{signal}</Text>
          </View>
        ))}
      </Card>

      <SectionHeader title="Core skills" action={`${competencies.length} competencies`} />
      <View style={styles.competencies}>
        {competencies.map((competency, index) => (
          <Card key={competency.id} style={styles.competencyCard}>
            <CircleIcon name={index % 2 === 0 ? 'sparkles' : 'layers'} color={index % 2 === 0 ? AppColors.cyan : AppColors.purple} />
            <Text style={styles.competencyTitle}>{competency.title}</Text>
            <Text style={Type.caption}>{competency.description}</Text>
          </Card>
        ))}
      </View>

      <SectionHeader title="Prerequisites" />
      <Card>
        {role.prerequisites.map((prerequisite, index) => (
          <View key={`${prerequisite.kind}-${index}`} style={styles.prerequisite}>
            <Pill label={prerequisite.required ? 'Core' : 'Helpful'} tone={prerequisite.required ? 'amber' : 'neutral'} />
            <Text style={styles.rowText}>{prerequisite.description}</Text>
          </View>
        ))}
      </Card>

      <SectionHeader title="Where this role can lead" />
      <Card>
        <ProgressionGroup title="Common prior roles" values={role.progression.commonPriorRoleIds.map(getRoleTitle)} />
        <ProgressionGroup title="Next roles" values={role.progression.nextRoleIds.map(getRoleTitle)} />
        <ProgressionGroup title="Lateral moves" values={role.progression.lateralRoleIds.map(getRoleTitle)} />
      </Card>
    </AppScreen>
  );
}

function InfoRow({ index, text }: { index: number; text: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.number}><Text style={styles.numberText}>{String(index).padStart(2, '0')}</Text></View>
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

function ProgressionGroup({ title, values }: { title: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <View style={styles.progressionGroup}>
      <Text style={styles.smallLabel}>{title}</Text>
      <View style={styles.tags}>{values.map((value) => <Pill key={value} label={value} tone="blue" />)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 54 },
  hero: { alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.lg },
  heroCopy: { alignItems: 'center', gap: 8 },
  eyebrow: { color: AppColors.mint, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.3, textAlign: 'center' },
  title: { color: AppColors.text, fontSize: 34, lineHeight: 39, fontWeight: '900', letterSpacing: -1.1, textAlign: 'center' },
  summary: { color: AppColors.textMuted, fontSize: 15, lineHeight: 23, maxWidth: 620, textAlign: 'center' },
  missionCard: { flexDirection: 'row', gap: Spacing.md, backgroundColor: '#0D2928' },
  smallLabel: { color: AppColors.textDim, fontSize: 9, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 5 },
  mission: { color: AppColors.text, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: 5 },
  number: { width: 34, height: 34, borderRadius: 12, backgroundColor: AppColors.panel, alignItems: 'center', justifyContent: 'center' },
  numberText: { color: AppColors.mint, fontSize: 10, fontWeight: '900' },
  rowText: { color: AppColors.textMuted, fontSize: 13, lineHeight: 20, flex: 1 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingVertical: 4 },
  competencies: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  competencyCard: { minWidth: 220, flexBasis: '46%', flexGrow: 1 },
  competencyTitle: { color: AppColors.text, fontSize: 15, fontWeight: '900' },
  prerequisite: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: 6 },
  progressionGroup: { gap: 6, paddingVertical: 5 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
