import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

export function AppScreen({
  children,
  scroll = true,
  contentContainerStyle,
  refreshControl,
}: PropsWithChildren<{
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: ScrollViewProps['refreshControl'];
}>) {
  const body = (
    <View style={[styles.screenBody, contentContainerStyle]}>
      {children}
    </View>
  );
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}>
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.brandRow}>
      <LinearGradient colors={[AppColors.mint, AppColors.cyan]} style={styles.brandIcon}>
        <Ionicons name="shield-checkmark" size={compact ? 18 : 22} color={AppColors.ink} />
      </LinearGradient>
      {!compact && (
        <Text style={styles.brandText}>
          CYBER<Text style={styles.brandAccent}>PATH</Text>
        </Text>
      )}
    </View>
  );
}

export function TopBar({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.pageTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}>) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function GradientCard({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <LinearGradient
      colors={['#143A38', '#0D2A31', '#0B2027']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientCard, style]}>
      {children}
    </LinearGradient>
  );
}

export function Pill({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: 'neutral' | 'mint' | 'amber' | 'purple' | 'blue';
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const tones = {
    neutral: { bg: AppColors.panelSoft, fg: AppColors.textMuted },
    mint: { bg: AppColors.mintDark, fg: AppColors.mint },
    amber: { bg: '#44351F', fg: AppColors.amber },
    purple: { bg: '#342A4B', fg: AppColors.purple },
    blue: { bg: '#243550', fg: AppColors.cyan },
  };
  const colors = tones[tone];
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      {icon ? <Ionicons name={icon} size={13} color={colors.fg} /> : null}
      <Text style={[styles.pillText, { color: colors.fg }]}>{label}</Text>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}>
      {icon ? <Ionicons name={icon} size={16} color={selected ? AppColors.ink : AppColors.textMuted} /> : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon = 'arrow-forward',
  disabled,
  loading,
  secondary,
  style,
}: {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={secondary ? AppColors.mint : AppColors.ink} />
      ) : (
        <>
          <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
          <Ionicons name={icon} size={18} color={secondary ? AppColors.mint : AppColors.ink} />
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={AppColors.text} />
    </Pressable>
  );
}

export function ProgressBar({ value, color = AppColors.mint }: { value: number; color?: string }) {
  const bounded = Math.max(0, Math.min(100, value));
  return (
    <View
      style={styles.progressTrack}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(bounded) }}>
      <View style={[styles.progressFill, { width: `${bounded}%`, backgroundColor: color }]} />
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} hitSlop={8} style={styles.sectionActionButton}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Metric({ value, label, accent = AppColors.text }: { value: string; label: string; accent?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function CircleIcon({
  name,
  color = AppColors.mint,
  size = 42,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color?: string;
  size?: number;
}) {
  return (
    <View style={[styles.circleIcon, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name={name} size={Math.round(size * 0.47)} color={color} />
    </View>
  );
}

export const Type = {
  eyebrow: { color: AppColors.mint, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' } as TextStyle,
  title: { color: AppColors.text, fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.7, fontFamily: Fonts?.rounded } as TextStyle,
  heading: { color: AppColors.text, fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.3 } as TextStyle,
  body: { color: AppColors.text, fontSize: 15, lineHeight: 22 } as TextStyle,
  bodyMuted: { color: AppColors.textMuted, fontSize: 14, lineHeight: 21 } as TextStyle,
  caption: { color: AppColors.textDim, fontSize: 12, lineHeight: 17 } as TextStyle,
  mono: { color: AppColors.cyan, fontSize: 12, fontFamily: Fonts?.mono, letterSpacing: 0.2 } as TextStyle,
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.ink },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  screenBody: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 118,
    gap: Spacing.lg,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandText: { color: AppColors.text, fontFamily: Fonts?.rounded, fontWeight: '900', letterSpacing: 1.1, fontSize: 17 },
  brandAccent: { color: AppColors.mint },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 64 },
  topBarCopy: { flex: 1, gap: 3 },
  eyebrow: { color: AppColors.mint, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  pageTitle: { color: AppColors.text, fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.7, fontFamily: Fonts?.rounded },
  heading: { color: AppColors.text, fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.3 },
  body: { color: AppColors.text, fontSize: 15, lineHeight: 22 },
  bodyMuted: { color: AppColors.textMuted, fontSize: 14, lineHeight: 21 },
  caption: { color: AppColors.textDim, fontSize: 12, lineHeight: 17 },
  mono: { color: AppColors.cyan, fontSize: 12, fontFamily: Fonts?.mono, letterSpacing: 0.2 },
  card: {
    backgroundColor: AppColors.inkElevated,
    borderColor: AppColors.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  gradientCard: { borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.lg, borderWidth: 1, borderColor: AppColors.borderBright },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] },
  pill: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.pill, flexDirection: 'row', gap: 5, alignItems: 'center' },
  pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.25 },
  chip: { minHeight: 44, borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.inkElevated, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  chipSelected: { backgroundColor: AppColors.mint, borderColor: AppColors.mint },
  chipText: { color: AppColors.textMuted, fontSize: 13, fontWeight: '700' },
  chipTextSelected: { color: AppColors.ink },
  button: { minHeight: 52, borderRadius: Radius.md, backgroundColor: AppColors.mint, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  buttonSecondary: { backgroundColor: AppColors.mintDark, borderColor: AppColors.borderBright, borderWidth: 1 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: AppColors.ink, fontWeight: '900', fontSize: 15 },
  buttonTextSecondary: { color: AppColors.mint },
  iconButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: AppColors.panel, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: AppColors.border },
  progressTrack: { height: 7, backgroundColor: AppColors.panelSoft, borderRadius: Radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radius.pill },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 30 },
  sectionTitle: { color: AppColors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.25 },
  sectionActionButton: { minHeight: 44, justifyContent: 'center' },
  sectionAction: { color: AppColors.mint, fontSize: 13, fontWeight: '800' },
  metric: { flex: 1, gap: 4 },
  metricValue: { fontSize: 24, lineHeight: 28, fontWeight: '900', letterSpacing: -0.5 },
  metricLabel: { color: AppColors.textDim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
  circleIcon: { backgroundColor: AppColors.panelSoft, alignItems: 'center', justifyContent: 'center' },
});
